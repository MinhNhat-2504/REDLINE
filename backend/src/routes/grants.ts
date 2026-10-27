import type { FastifyInstance } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getChain } from "../chain/index.js";
import { nowSeconds } from "../clock.js";
import { prisma } from "../db/client.js";
import { audit, recordAudit, publishAudit, type AuditInput } from "../db/audit.js";
import { PolicySchema, canonicalPolicy, policyHash, toGrantLimits } from "../policy/canonical.js";
import { deterministic } from "./risk.js";
import { callerWallet, identityEnforced, requireWallet } from "../auth.js";
import { redactAuditRow, redactPayload } from "../redact.js";
import { json } from "./json.js";
import type { GrantState } from "../policy/types.js";

const fail = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });

// Solana's `readGrant` returns the decoded account, which carries the owner,
// executor and policy hash the program stored. The adapter interface only
// promises GrantState; this is the shape the checks below need.
type OnchainGrant = GrantState & { owner?: string; vault?: string; policyHash?: Uint8Array };

/**
 * Read a grant the browser says it just created, tolerating RPC lag.
 *
 * The wallet's send resolves at `confirmed`, but a read against a different
 * RPC node (or a throttled public one) can trail by a slot or two. A handful
 * of short retries turns "not found yet" into a clean answer instead of a
 * 400 the owner has to work around by clicking again.
 */
async function readFreshGrant(
  grantPda: string,
  attempts = 8,
  delayMs = 1_250,
  settled: (state: OnchainGrant) => boolean = () => true,
): Promise<OnchainGrant | null> {
  let last: OnchainGrant | null = null;
  for (let i = 0; i < attempts; i += 1) {
    let state: OnchainGrant | null = null;
    try {
      state = (await getChain().readGrant(grantPda)) as OnchainGrant | null;
    } catch (err) {
      // An account that is not a Grant (wrong PDA, or a mock-era row on a
      // Solana deploy) decodes as an error, not as null. That is the
      // caller's input being wrong, not a server fault.
      throw fail(400, `could not read ${grantPda} as a grant account: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (state) {
      last = state;
      if (settled(state)) return state;
    }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return last;
}

const hex = (bytes: Uint8Array | undefined) => (bytes ? Buffer.from(bytes).toString("hex") : "");

/**
 * The public view of a grant's on-chain state.
 *
 * Counters and limits are the evidence — they are what a stranger checks the
 * audit trail against. The owner, vault, executor and allowlists are the
 * linkage the rest of the redacted response just masked, so handing them back
 * whole through this field undid the masking.
 */
function publicOnchain(state: OnchainGrant | null) {
  if (!state) return null;
  return {
    active: state.active,
    spentUnits: state.spentUnits,
    transactionCount: state.transactionCount,
    nextNonce: state.nextNonce,
    spendCapUnits: state.spendCapUnits,
    maxTransactions: state.maxTransactions,
    cooldownSeconds: state.cooldownSeconds,
    expiresAt: state.expiresAt,
    lastExecutionAt: state.lastExecutionAt,
    allowedMints: state.allowedMints.length,
    allowedDestinations: state.allowedDestinations.length,
  };
}

const CreateGrant = z.object({
  ownerWallet: z.string().min(32).max(44),
  vaultPda: z.string().min(1).max(64).optional(),
  agentVersionId: z.string().min(1),
  policy: PolicySchema,
  // On Solana the browser signs create_grant and sends us the signature +
  // PDA; on mock the adapter creates it for us.
  grantPda: z.string().optional(),
  createSignature: z.string().optional(),
  agentId: z.string().regex(/^[0-9a-f]{32}$/).optional(),
  // Set when the owner was shown a REVIEW verdict and accepted it anyway. The
  // browser reports this; the server recomputes the deterministic floor below
  // rather than taking the claim at face value.
  riskAcknowledged: z.boolean().optional(),
  // The rental this grant runs under, when the agent belongs to someone else.
  hireId: z.string().min(1).optional(),
});

async function registeredGrant(body: z.infer<typeof CreateGrant>, hash: string) {
  if (!body.grantPda) return null;
  const found = await prisma.agentGrant.findUnique({ where: { grantPda: body.grantPda }, include: { owner: true, policyVersion: true, vault: true } });
  if (!found) return null;
  if (found.owner.wallet !== body.ownerWallet) throw fail(403, "that grant is owned by a different wallet");
  if (found.policyVersion.policyHash !== hash || found.agentVersionId !== body.agentVersionId ||
      body.agentId && found.agentId !== body.agentId || body.vaultPda && body.vaultPda !== found.vault.vaultPda) {
    throw fail(409, "the saved registration differs from this request; inspect the existing policy");
  }
  return found;
}

/**
 * Decide which hire, if any, authorises this grant.
 *
 * A listing that has been claimed and priced is on offer: its publisher rents
 * it out, and someone else running it is expected to have paid. Recording
 * which rental covers a grant is what makes the term mean something — without
 * it a hire is a receipt for nothing, and "rents it for a fixed term" is a
 * sentence in the README that no row backs up.
 *
 * The publisher running their own agent needs no rental, which is also the
 * path every self-published demo takes.
 */
export async function resolveHire(agentVersionId: string, ownerWallet: string, hireId?: string, recordSignedHistory = false): Promise<{ id: string; endsAt: Date } | null> {
  const listing = await prisma.agentListing.findFirst({ where: { agentVersionId } });
  const forRent = Boolean(listing?.developerWallet) && (listing?.priceLamports ?? 0n) > 0n;
  if (!forRent || listing?.developerWallet === ownerWallet) return null;

  if (!hireId) {
    throw fail(402, "This agent is offered for rent — rent it from the Marketplace before granting it authority");
  }
  const hire = await prisma.hireAgreement.findUnique({ where: { id: hireId } });
  if (!hire || hire.listingId !== listing!.id) {
    throw fail(400, "That rental is not for this agent");
  }
  if (hire.ownerWallet !== ownerWallet) {
    throw fail(403, "That rental belongs to another wallet");
  }
  if (hire.endsAt <= new Date() && !recordSignedHistory) {
    throw fail(402, "That rental has ended — renew it before granting authority");
  }
  return { id: hire.id, endsAt: hire.endsAt };
}

export async function grantRoutes(app: FastifyInstance) {
  // Everything POST /grants would refuse, checked *before* the wallet signs.
  //
  // On Solana the owner signs create_grant first and registers it second, so
  // a refusal at registration (no rental, wrong wallet, unknown agent) used to
  // arrive after the account — and the fee — had already landed on-chain. The
  // browser calls this with the same inputs, and only opens the wallet once
  // the answer is yes. It also tells the browser how long the grant may live
  // under the rental, so the on-chain window is never longer than the term.
  app.post("/grants/preflight", async (req, reply) => {
    const body = CreateGrant.pick({ ownerWallet: true, agentVersionId: true, hireId: true, policy: true }).parse(req.body);
    requireWallet(req, body.ownerWallet);
    const agentVersion = await prisma.agentVersion.findUnique({ where: { id: body.agentVersionId } });
    if (!agentVersion) return reply.code(404).send({ error: "agent version not found" });
    const hire = await resolveHire(agentVersion.id, body.ownerWallet, body.hireId);
    const requested = body.policy.durationHours;
    const hoursLeft = hire ? Math.floor((hire.endsAt.getTime() - Date.now()) / 3_600_000) : null;
    if (hoursLeft !== null && hoursLeft < 1) return reply.code(402).send({ error: "Less than one hour remains on this rental. Renew it before creating a policy." });
    const floor = deterministic(body.policy);
    return json({
      ok: true,
      hireId: hire?.id ?? null,
      hireEndsAt: hire?.endsAt ?? null,
      // What the browser should sign: the requested lifetime, clamped to the
      // rental. Null means no rental applies and the request stands.
      maxDurationHours: hoursLeft,
      durationHours: hoursLeft === null ? requested : Math.min(requested, hoursLeft),
      expiresAt: Math.floor(Date.now() / 1000) + (hoursLeft === null ? requested : Math.min(requested, hoursLeft)) * 3600,
      risk: { decision: floor.decision, score: floor.score, acknowledgementRequired: floor.decision !== "ALLOW" },
      executor: getChain().executorPubkey,
    });
  });

  app.post("/grants", async (req, reply) => {
    const body = CreateGrant.parse(req.body);
    // A grant hands an executor authority over this wallet's vault. Recording
    // one for a wallet the caller has not proved control of would let a
    // stranger attach agents to someone else's treasury page.
    requireWallet(req, body.ownerWallet);
    const chain = getChain();
    const now = nowSeconds();
    const hash = policyHash(body.policy);
    const limits = toGrantLimits(body.policy, now);
    const existing = await registeredGrant(body, hash);
    if (existing) return reply.code(200).send(json({ grant: existing, policyHash: hash, chain: chain.kind }));

    // Validate everything that can be validated before any row is written, so
    // a bad request leaves nothing behind. An unknown agent version is the
    // caller's mistake (404), not a database fault (500).
    const agentVersion = await prisma.agentVersion.findUnique({ where: { id: body.agentVersionId } });
    if (!agentVersion) return reply.code(404).send({ error: "agent version not found" });

    // If this agent is someone else's and offered for rent, a live rental has
    // to cover it. Checked before the on-chain read so the error the owner
    // sees names the actual problem.
    // On Solana the browser signed create_grant itself and only tells us the
    // PDA. That claim is verified against the account the program stored:
    // without this, any signed-in wallet could register someone else's grant
    // under its own name and then drive the executor against that vault —
    // ownership in the DB is what every later route checks.
    let onchainAtCreate: OnchainGrant | null = null;
    if (chain.kind === "solana" && body.grantPda) {
      onchainAtCreate = await readFreshGrant(body.grantPda);
      if (!onchainAtCreate) return reply.code(400).send({ error: "grant account not found on-chain yet — wait for create_grant to confirm, then retry" });
      if (onchainAtCreate.owner && onchainAtCreate.owner !== body.ownerWallet) return reply.code(403).send({ error: "that grant is owned by a different wallet" });
      if (onchainAtCreate.executor !== chain.executorPubkey) return reply.code(400).send({ error: "that grant names a different executor than this API" });
      if (onchainAtCreate.policyHash && hex(onchainAtCreate.policyHash) !== hash) return reply.code(400).send({ error: "the policy you posted does not match the policy hash the grant was created with" });
      if (body.vaultPda && onchainAtCreate.vault && onchainAtCreate.vault !== body.vaultPda) return reply.code(400).send({ error: "vaultPda does not match the grant's vault" });
      const same = (left: string[], right: string[]) => [...left].sort().join("|") === [...right].sort().join("|");
      if (onchainAtCreate.spendCapUnits !== limits.spendCapUnits || onchainAtCreate.maxTransactions !== limits.maxTransactions ||
          onchainAtCreate.cooldownSeconds !== limits.cooldownSeconds || !same(onchainAtCreate.allowedMints, limits.allowedMints) ||
          !same(onchainAtCreate.allowedDestinations, limits.allowedDestinations)) return reply.code(400).send({ error: "the signed limits differ from the policy being registered" });
    }
    // A delayed sync records authority that already exists, even after its
    // rental expires. It must still belong to this wallet and end within that rental.
    const hire = await resolveHire(agentVersion.id, body.ownerWallet, body.hireId, Boolean(onchainAtCreate));
    if (hire && onchainAtCreate && onchainAtCreate.expiresAt > Math.floor(hire.endsAt.getTime() / 1000)) {
      return reply.code(400).send({ error: "the signed policy extends beyond its rental" });
    }

    const owner = await prisma.owner.upsert({ where: { wallet: body.ownerWallet }, update: {}, create: { wallet: body.ownerWallet } });
    const vaultPda = body.vaultPda ?? onchainAtCreate?.vault ?? `mockvault${createHash("sha256").update(body.ownerWallet).digest("base64url").slice(0, 32)}`;
    const vault = await prisma.vault.upsert({ where: { vaultPda }, update: {}, create: { ownerId: owner.id, vaultPda } });

    const policy = await prisma.policyVersion.upsert({
      where: { policyHash: hash },
      update: {},
      create: {
        policyHash: hash,
        canonicalJson: canonicalPolicy(body.policy),
        spendCapUnits: limits.spendCapUnits,
        maxTransactions: limits.maxTransactions,
        cooldownSeconds: limits.cooldownSeconds,
        expiresAt: new Date(limits.expiresAt * 1000),
        allowedMints: JSON.stringify(limits.allowedMints),
        allowedDests: JSON.stringify(limits.allowedDestinations),
      },
    });

    const agentId = body.agentId ?? randomBytes(16).toString("hex");
    let grantPda = body.grantPda;
    let createSignature = body.createSignature;
    if (chain.kind === "mock" || !grantPda) {
      // A rented agent's authority ends with the rental. When this server
      // creates the grant itself, the on-chain window is clamped to the term;
      // for browser-signed grants the runtime enforces the same boundary
      // (see runner.ts), since the account is already written by then.
      if (hire) limits.expiresAt = Math.min(limits.expiresAt, Math.floor(hire.endsAt.getTime() / 1000));
      const created = await chain.createGrant(body.ownerWallet, vaultPda, agentId, limits, hash);
      grantPda = created.grantPda;
      createSignature = created.signature;
    }

    // Each grant carries its own expiry. `PolicyVersion` is keyed by the hash
    // of the policy *shape* (a duration, not a date), so two grants signed a
    // day apart with the same policy share that row — and the second grant
    // used to inherit the first one's expiry through it. The program's own
    // value wins when we have it.
    const expiresAt = new Date((onchainAtCreate?.expiresAt ?? limits.expiresAt) * 1000);

    const floor = deterministic(body.policy);
    const risk = {
      deterministicDecision: floor.decision, deterministicScore: floor.score,
      findings: floor.findings, acknowledged: body.riskAcknowledged === true,
      acknowledgementRequired: floor.decision !== "ALLOW",
    };
    // Grant + evidence commit together. Replaying a confirmed browser operation
    // returns the same row; a racing registration rolls back at the unique PDA.
    try {
      const result = await prisma.$transaction(async tx => {
        const grant = await tx.agentGrant.create({ data: {
          ownerId: owner.id, vaultId: vault.id, agentVersionId: agentVersion.id, policyVersionId: policy.id,
          grantPda: grantPda!, agentId, executorPubkey: chain.executorPubkey, createSignature,
          hireId: hire?.id ?? null, expiresAt,
        } });
        const input: AuditInput = {
          actorType: "owner", actorId: body.ownerWallet, eventType: "grant.created",
          subjectType: "grant", subjectId: grant.id, chainSignature: createSignature,
          payload: { grantId: grant.id, grantPda, agentId, policyHash: hash, agentHash: agentVersion.agentHash, limits, risk },
        };
        const events = [{ row: await recordAudit(input, tx), input }];
        if (risk.acknowledgementRequired && !risk.acknowledged) {
          const warning: AuditInput = { actorType: "system", actorId: "risk-engine", eventType: "grant.risk_unacknowledged",
            subjectType: "grant", subjectId: grant.id, chainSignature: createSignature,
            payload: { grantId: grant.id, decision: floor.decision, score: floor.score, findings: floor.findings } };
          events.push({ row: await recordAudit(warning, tx), input: warning });
        }
        return { grant, events };
      });
      for (const event of result.events) publishAudit(event.row, event.input);
      return reply.code(201).send(json({ grant: result.grant, policyHash: hash, chain: chain.kind }));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        const concurrent = await registeredGrant(body, hash);
        if (concurrent) return reply.code(200).send(json({ grant: concurrent, policyHash: hash, chain: chain.kind }));
      }
      throw error;
    }
  });

  // Your grants, not everyone's. The unscoped version was how the dashboard
  // ended up showing one wallet's agents to another wallet — the "which agent
  // belongs to which account" problem in its most visible form.
  app.get("/grants", async (req) => {
    const caller = callerWallet(req);
    if (identityEnforced() && !caller) return json([]);
    const grants = await prisma.agentGrant.findMany({
      where: caller ? { owner: { wallet: caller } } : undefined,
      include: { agentVersion: true, policyVersion: true, owner: true, hire: true, runs: { orderBy: { startedAt: "desc" }, take: 50 } },
      orderBy: { createdAt: "desc" },
    });
    return json(grants);
  });

  app.get("/grants/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const grant = await prisma.agentGrant.findUnique({ where: { id }, include: { agentVersion: true, policyVersion: true, owner: true, vault: true, hire: true, runs: { orderBy: { startedAt: "desc" } } } });
    if (!grant) return reply.code(404).send({ error: "grant not found" });
    // Someone else's grant stays readable but redacted: the on-chain facts
    // remain (that is the transparency claim) while the wallet, vault and
    // destination linkage does not.
    const caller = callerWallet(req);
    const mine = !identityEnforced() || (caller !== null && grant.owner.wallet === caller);
    // The mirrored row is still worth returning when the chain read fails —
    // an RPC hiccup, or a grantPda written by a different CHAIN adapter, must
    // not take the whole page down. `onchain: null` is the honest answer.
    let onchain = null;
    try {
      onchain = await getChain().readGrant(grant.grantPda);
    } catch (err) {
      app.log.warn({ grantId: id, grantPda: grant.grantPda, err: String(err) }, "on-chain grant read failed");
    }
    if (!mine) {
      const redacted = redactAuditRow({
        id: grant.id, createdAt: grant.createdAt, actorType: "owner", actorId: grant.owner.wallet,
        eventType: "grant", subjectType: "grant", subjectId: grant.id, chainSignature: grant.createSignature,
        payload: { grantPda: grant.grantPda, executorPubkey: grant.executorPubkey },
      });
      return json({
        id: grant.id, createdAt: grant.createdAt, revoked: grant.revoked, expiresAt: grant.expiresAt ?? grant.policyVersion.expiresAt,
        agentVersion: { id: grant.agentVersion.id, name: grant.agentVersion.name, version: grant.agentVersion.version, agentHash: grant.agentVersion.agentHash },
        policyVersion: redactPayload({ ...grant.policyVersion }),
        spentUnits: grant.spentUnits, transactionCount: grant.transactionCount, nextNonce: grant.nextNonce,
        owner: { wallet: redacted.actorId },
        grantPda: redacted.payload.grantPda, executorPubkey: redacted.payload.executorPubkey,
        // Counters only: the full account names the owner, vault, executor and
        // every allowlisted destination, which is exactly what was masked above.
        onchain: publicOnchain(onchain as OnchainGrant | null), redacted: true, isMine: false,
      });
    }
    return json({ ...grant, expiresAt: grant.expiresAt ?? grant.policyVersion.expiresAt, onchain, isMine: true });
  });

  app.post("/grants/:id/revoke", async (req, reply) => {
    const { id } = req.params as { id: string };
    const grant = await prisma.agentGrant.findUnique({ where: { id }, include: { owner: true } });
    if (!grant) return reply.code(404).send({ error: "grant not found" });
    // Only the owner revokes. On Solana the program refuses a foreign
    // signature anyway, but on mock the adapter signs for whoever asks.
    requireWallet(req, grant.owner.wallet);
    // Browser flow posts the signature of a revoke_grant it already sent;
    // mock / headless demo lets the adapter sign.
    const body = (req.body ?? {}) as { signature?: string };
    const chain = getChain();
    // On Solana the owner must have signed revoke_grant in their wallet; the
    // server never signs on an owner's behalf outside the mock adapter.
    if (chain.kind === "solana" && !body.signature) {
      return reply.code(400).send({ error: "signature required: sign revoke_grant in the owner wallet, then post its signature" });
    }
    if (chain.kind === "solana") {
      // The posted string is a claim, not proof. The chain is the truth: if
      // the account still says active, nothing was revoked, and flipping the
      // row here would show REVOKED on a grant the executor can still run.
      // Poll while the account still reads active: the wallet's RPC confirmed
      // the revoke a moment ago and ours may trail it by a slot.
      const state = await readFreshGrant(grant.grantPda, 6, 1_000, s => !s.active);
      if (state && state.active) {
        return reply.code(409).send({ error: "the grant is still active on-chain — the revoke_grant transaction has not confirmed (or was rejected)" });
      }
    }
    const signature = body.signature ?? (await chain.revokeGrant(grant.grantPda)).signature;
    await prisma.agentGrant.update({ where: { id }, data: { revoked: true } });
    // actorId names the wallet, as grant.created does — not the internal owner
    // id, which no reader can match against anything.
    await audit({ actorType: "owner", actorId: grant.owner.wallet, eventType: "grant.revoked", subjectType: "grant", subjectId: id, chainSignature: signature, payload: { grantId: id, grantPda: grant.grantPda } });
    return json({ ok: true, signature });
  });
}
