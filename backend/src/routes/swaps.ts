import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getChain } from "../chain/index.js";
import { nowSeconds } from "../clock.js";
import { prisma } from "../db/client.js";
import { audit } from "../db/audit.js";
import { evaluateSwap, minimumOut } from "../policy/engine.js";
import { requireGrantOwner, requireWallet } from "../auth.js";
import { json } from "./json.js";
import { PositiveU64StringSchema, SolanaAddressSchema } from "../validation.js";

// Trading inside a policy.
//
// A swap is the same shape as a transfer — the agent proposes, the gates
// decide, the chain is the authority — with two differences that matter.
//
// It needs its own permission. Signing a transfer policy is not agreeing to
// let an agent trade, so trading is off until the owner turns it on for that
// specific grant, naming the venues it may route through.
//
// And it cannot be judged in advance. A transfer's outcome is knowable before
// it runs; a swap's is not, so the binding check happens after the route has
// executed, against the balances the vault actually came back with.

const SwapPolicyBody = z.object({
  allowedPrograms: z.array(SolanaAddressSchema).min(1).max(4),
  maxSlippageBps: z.number().int().min(0).max(9_999),
});

const SwapIntentBody = z.object({
  grantId: z.string().min(1),
  inputMint: SolanaAddressSchema,
  outputMint: SolanaAddressSchema,
  amountInUnits: PositiveU64StringSchema,
  quotedOutUnits: PositiveU64StringSchema,
  program: SolanaAddressSchema,
  reason: z.string().max(200).optional(),
  nonce: z.number().int().min(0).optional(),
});

/** Resolve the grant, its on-chain state and its trading policy in one step. */
type Loaded =
  | { ok: false; status: number; error: string }
  | { ok: true; grant: NonNullable<Awaited<ReturnType<typeof prisma.agentGrant.findUnique>>> & { owner: { wallet: string } }; state: NonNullable<Awaited<ReturnType<ReturnType<typeof getChain>["readGrant"]>>>; policy: Awaited<ReturnType<NonNullable<ReturnType<typeof getChain>["readSwapPolicy"]>>>; chain: ReturnType<typeof getChain> };

async function loadGrant(grantId: string): Promise<Loaded> {
  const grant = await prisma.agentGrant.findUnique({ where: { id: grantId }, include: { owner: true } });
  if (!grant) return { ok: false, status: 404, error: "grant not found" };
  const chain = getChain();
  const state = await chain.readGrant(grant.grantPda);
  if (!state) return { ok: false, status: 404, error: "grant not on chain" };
  const policy = chain.readSwapPolicy ? await chain.readSwapPolicy(grant.grantPda) : null;
  return { ok: true, grant, state, policy, chain };
}

export async function swapRoutes(app: FastifyInstance) {
  // What this grant may trade, if anything. Null policy is the honest answer
  // for every grant signed before trading existed.
  app.get("/grants/:id/swap-policy", async (req, reply) => {
    const { id } = req.params as { id: string };
    const loaded = await loadGrant(id);
    if (!loaded.ok) return reply.code(loaded.status).send({ error: loaded.error });
    return json({
      enabled: Boolean(loaded.policy?.allowedPrograms.length),
      policy: loaded.policy,
      // Named so a UI can say "this deployment cannot trade yet" rather than
      // showing an empty allowlist as though the owner had chosen it.
      supported: Boolean(loaded.chain.executeSwap),
    });
  });

  // Turning trading on is an owner decision, and a separate one from the
  // grant. It is deliberately not part of grant creation: an owner should have
  // to say "and it may trade" out loud.
  app.post("/grants/:id/swap-policy", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = SwapPolicyBody.parse(req.body);
    const loaded = await loadGrant(id);
    if (!loaded.ok) return reply.code(loaded.status).send({ error: loaded.error });
    requireWallet(req, loaded.grant.owner.wallet);
    if (!loaded.chain.createSwapPolicy) {
      return reply.code(400).send({ error: "this deployment's chain adapter cannot enable trading" });
    }
    const { signature } = await loaded.chain.createSwapPolicy(loaded.grant.grantPda, body);
    await audit({
      actorType: "owner", actorId: loaded.grant.owner.wallet, eventType: "swap_policy.created",
      subjectType: "grant", subjectId: id, chainSignature: signature,
      payload: { grantId: id, allowedPrograms: body.allowedPrograms, maxSlippageBps: body.maxSlippageBps },
    });
    return reply.code(201).send(json({ ok: true, signature, policy: body }));
  });

  // Dry run. Same gates, no write, no fee — and it reports the floor the
  // policy implies for this quote, which is the number the owner actually
  // cares about and the one the program will enforce.
  app.post("/swaps/preview", async (req, reply) => {
    const body = SwapIntentBody.parse(req.body);
    const loaded = await loadGrant(body.grantId);
    if (!loaded.ok) return reply.code(loaded.status).send({ error: loaded.error });
    const intent = {
      grantPda: loaded.grant.grantPda, inputMint: body.inputMint, outputMint: body.outputMint,
      amountInUnits: BigInt(body.amountInUnits), quotedOutUnits: BigInt(body.quotedOutUnits),
      program: body.program, nonce: body.nonce ?? loaded.state.nextNonce,
    };
    const verdict = evaluateSwap(loaded.state, loaded.policy, intent, nowSeconds());
    return json({
      verdict,
      nonce: intent.nonce,
      minimumOutUnits: loaded.policy ? minimumOut(intent.quotedOutUnits, loaded.policy.maxSlippageBps).toString() : null,
      policy: loaded.policy,
    });
  });

  // Execute. The gates run again on the server's own view, and then the chain
  // runs them once more and is the one that counts.
  app.post("/swaps", async (req, reply) => {
    const body = SwapIntentBody.parse(req.body);
    await requireGrantOwner(req, body.grantId);
    const loaded = await loadGrant(body.grantId);
    if (!loaded.ok) return reply.code(loaded.status).send({ error: loaded.error });
    if (!loaded.chain.executeSwap) {
      return reply.code(400).send({ error: "this deployment's chain adapter cannot trade" });
    }
    const intent = {
      grantPda: loaded.grant.grantPda, inputMint: body.inputMint, outputMint: body.outputMint,
      amountInUnits: BigInt(body.amountInUnits), quotedOutUnits: BigInt(body.quotedOutUnits),
      program: body.program, nonce: body.nonce ?? loaded.state.nextNonce, reason: body.reason,
    };

    // Refuse locally before paying a fee, and record the refusal — a blocked
    // trade is evidence the policy worked, not an error to swallow.
    const precheck = evaluateSwap(loaded.state, loaded.policy, intent, nowSeconds());
    if (!precheck.allow) {
      await audit({
        actorType: "system", actorId: "policy-engine", eventType: "swap.refused",
        subjectType: "grant", subjectId: body.grantId,
        payload: { grantId: body.grantId, reasonCode: precheck.reasonCode, gate: precheck.gate, message: precheck.message, inputMint: body.inputMint, outputMint: body.outputMint, program: body.program },
      });
      return reply.code(200).send(json({ submitted: false, precheck }));
    }

    const result = await loaded.chain.executeSwap(intent);
    await audit({
      actorType: "chain", actorId: loaded.chain.programId,
      eventType: result.success ? "swap.settled" : "swap.reverted",
      subjectType: "grant", subjectId: body.grantId, chainSignature: result.signature,
      payload: {
        grantId: body.grantId, reasonCode: result.reasonCode,
        inputMint: body.inputMint, outputMint: body.outputMint, program: body.program,
        amountInUnits: result.amountInUnits.toString(), quotedOutUnits: body.quotedOutUnits,
        amountOutUnits: result.amountOutUnits.toString(),
        minimumOutUnits: loaded.policy ? minimumOut(intent.quotedOutUnits, loaded.policy.maxSlippageBps).toString() : null,
      },
    });
    return reply.code(201).send(json({ submitted: true, precheck, result }));
  });
}
