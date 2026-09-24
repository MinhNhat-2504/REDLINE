import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getChain } from "../chain/index.js";
import { nowSeconds } from "../clock.js";
import { prisma } from "../db/client.js";
import { evaluateIntent, intentHash, ruleSnapshotHash } from "../policy/engine.js";
import { processIntent } from "../runtime/executor.js";
import { callerWallet, identityEnforced, requireGrantOwner } from "../auth.js";
import { redactPayload } from "../redact.js";
import { json } from "./json.js";
import { PositiveU64StringSchema, SolanaAddressSchema } from "../validation.js";

export const IntentBody = z.object({
  grantId: z.string().min(1),
  mint: SolanaAddressSchema,
  amountUnits: PositiveU64StringSchema,
  destination: SolanaAddressSchema,
  reason: z.string().max(200).optional(),
  nonce: z.number().int().min(0).optional(),
  // Send a denied proposal to Solana anyway, so the program is the one that
  // refuses it. See ProcessOptions.proveOnChain.
  proveOnChain: z.boolean().optional(),
});

// Each proof is a real transaction the executor pays for. One per grant every
// few seconds is plenty to watch the chain say no, and not enough to drain fees.
const PROOF_GAP_MS = 8_000;
const lastProofAt = new Map<string, number>();

export async function intentRoutes(app: FastifyInstance) {
  // Dry run: same gates, no DB write, no fee. For the UI's "what would happen".
  app.post("/intents/preview", async (req, reply) => {
    const body = IntentBody.parse(req.body);
    const grant = await prisma.agentGrant.findUnique({ where: { id: body.grantId } });
    if (!grant) return reply.code(404).send({ error: "grant not found" });
    const state = await getChain().readGrant(grant.grantPda);
    if (!state) return reply.code(404).send({ error: "grant not on chain" });
    const intent = { grantPda: grant.grantPda, mint: body.mint, amountUnits: BigInt(body.amountUnits), destination: body.destination, nonce: body.nonce ?? state.nextNonce };
    const verdict = evaluateIntent(state, intent, nowSeconds());
    return json({ verdict, intentHash: intentHash(intent), ruleSnapshotHash: ruleSnapshotHash(state), nonce: intent.nonce });
  });

  // Manual submission is safe by construction: the executor records every
  // proposal, but sends it to Solana only when the current policy allows it —
  // unless the owner sets `proveOnChain`, which sends a denied proposal so the
  // program is the one that refuses it. Nothing moves either way.
  app.post("/intents", async (req, reply) => {
    const body = IntentBody.parse(req.body);
    // Submitting an intent is what actually moves funds, within the policy.
    await requireGrantOwner(req, body.grantId);
    const prove = body.proveOnChain === true && process.env.ONCHAIN_PROOF !== "off";
    if (prove) {
      const last = lastProofAt.get(body.grantId) ?? 0;
      if (Date.now() - last < PROOF_GAP_MS) {
        return reply.code(429).send({ error: "one on-chain proof per grant every few seconds — each is a real transaction the executor pays for" });
      }
      lastProofAt.set(body.grantId, Date.now());
    }
    const result = await processIntent(body.grantId, { mint: body.mint, amountUnits: BigInt(body.amountUnits), destination: body.destination, reason: body.reason, nonce: body.nonce }, { proveOnChain: prove });
    return reply.code(201).send(json(result));
  });

  // The same rule as GET /grants/:id and /audit: a stranger sees the
  // evidence (amounts, nonces, verdicts, signatures) but not the linkage
  // (where the money went). This route returned every destination in full to
  // anyone holding a grant id.
  app.get("/grants/:id/intents", async (req, reply) => {
    const { id } = req.params as { id: string };
    const grant = await prisma.agentGrant.findUnique({ where: { id }, include: { owner: true } });
    if (!grant) return reply.code(404).send({ error: "grant not found" });
    const caller = callerWallet(req);
    const mine = !identityEnforced() || (caller !== null && grant.owner.wallet === caller);
    const intents = await prisma.transactionIntent.findMany({ where: { grantId: id }, include: { decision: { include: { chainTx: true } } }, orderBy: { createdAt: "desc" } });
    if (mine) return json(intents);
    return json(intents.map(row => {
      const masked = redactPayload({ ...row }) as unknown as typeof row;
      // The on-chain signature is the evidence a stranger is meant to follow
      // to Explorer; the generic scan would mask it as address-shaped.
      if (masked.decision?.chainTx && row.decision?.chainTx) masked.decision.chainTx.signature = row.decision.chainTx.signature;
      return { ...masked, redacted: true };
    }));
  });
}
