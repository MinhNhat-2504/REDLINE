import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getChain } from "../chain/index.js";
import { prisma } from "../db/client.js";
import { json } from "./json.js";
import { nowSeconds } from "../clock.js";

// Presentation-neutral metadata for the policy pipeline. The frontend turns
// this into a spatial "transaction spine", while other clients can render the
// same ordered gates as a table or an audit checklist.
/**
 * Gates run in two phases.
 *
 * `pre-execution` gates are decided before anything moves; a failure there
 * costs a transaction fee and nothing else. `post-settlement` exists because a
 * trade cannot be judged in advance — the only honest measure of a swap is the
 * balance the vault came back with, so that check runs after the DEX has and
 * reverts the whole transaction when it fails.
 */
export const POLICY_GATES = [
  { id: 1, key: "active", phase: "pre-execution", label: "Active grant", detail: "Owner has not revoked access", reasonCodes: ["REVOKED"] },
  { id: 2, key: "expiry", phase: "pre-execution", label: "Time window", detail: "Grant has not expired", reasonCodes: ["EXPIRED"] },
  { id: 3, key: "nonce", phase: "pre-execution", label: "Fresh intent", detail: "Nonce cannot be replayed", reasonCodes: ["NONCE_REPLAY"] },
  { id: 4, key: "mint", phase: "pre-execution", label: "Allowed asset", detail: "Mint is inside the signed scope", reasonCodes: ["MINT_NOT_ALLOWED"] },
  // Gate 5 asks the same question of both kinds of intent: may the value go
  // where this instruction sends it? For a transfer that is a recipient
  // wallet; for a swap there is no recipient — the output returns to the
  // vault — so it becomes the route and the token being bought.
  { id: 5, key: "destination", phase: "pre-execution", label: "Allowed counterparty", detail: "Recipient, DEX route and purchased asset are allowlisted", reasonCodes: ["DESTINATION_NOT_ALLOWED", "SWAPS_NOT_ENABLED", "PROGRAM_NOT_ALLOWED", "OUTPUT_MINT_NOT_ALLOWED"] },
  { id: 6, key: "budget", phase: "pre-execution", label: "Budget envelope", detail: "Spend and transaction caps hold", reasonCodes: ["TX_CAP_EXCEEDED", "SPEND_CAP_EXCEEDED"] },
  { id: 7, key: "cooldown", phase: "pre-execution", label: "Execution pace", detail: "Cooldown has elapsed", reasonCodes: ["COOLDOWN_ACTIVE"] },
  // Swaps only. A transfer moves a known amount to a known account and has
  // nothing to settle; a trade is only judged once the tokens have moved,
  // which is why this gate exists after execution rather than before it.
  { id: 8, key: "settlement", phase: "post-settlement", label: "Execution quality", detail: "The swap returned at least the floor the owner accepted", reasonCodes: ["SLIPPAGE_EXCEEDED"] },
] as const;

const gateForReason: ReadonlyMap<string, number> = new Map(
  POLICY_GATES.flatMap(gate => gate.reasonCodes.map(reason => [reason, gate.id] as const)),
);

export async function protocolRoutes(app: FastifyInstance) {
  app.get("/protocol/overview", async (req) => {
    const { owner } = z.object({ owner: z.string().min(32).max(44).optional() }).parse(req.query);
    const grants = await prisma.agentGrant.findMany({
      where: owner ? { owner: { wallet: owner } } : undefined,
      select: { id: true, revoked: true, spentUnits: true, transactionCount: true, expiresAt: true, policyVersion: { select: { expiresAt: true } } },
    });
    const grantIds = grants.map(grant => grant.id);
    const decisions = grantIds.length
      ? await prisma.policyDecision.findMany({
          where: { intent: { grantId: { in: grantIds } } },
          select: { allow: true, reasonCode: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1000,
        })
      : [];

    const rejectionCount = new Map<number, number>();
    for (const decision of decisions) {
      if (decision.allow) continue;
      const gate = gateForReason.get(decision.reasonCode);
      if (gate) rejectionCount.set(gate, (rejectionCount.get(gate) ?? 0) + 1);
    }

    const chain = getChain();
    return json({
      network: {
        chain: chain.kind,
        cluster: chain.kind === "solana" ? "devnet" : "local simulation",
        programId: chain.programId,
        executor: chain.executorPubkey,
        observedAt: new Date().toISOString(),
      },
      scope: owner ? "wallet" : "protocol",
      gates: POLICY_GATES.map(gate => ({
        ...gate,
        rejected: rejectionCount.get(gate.id) ?? 0,
      })),
      activity: {
        // The grant's own expiry; the policy's is a fallback for rows written
        // before grants carried one (it is shared across same-policy grants).
        activeGrants: grants.filter(grant => !grant.revoked && (grant.expiresAt ?? grant.policyVersion.expiresAt).getTime() > nowSeconds() * 1000).length,
        totalGrants: grants.length,
        transactions: grants.reduce((sum, grant) => sum + grant.transactionCount, 0),
        spentUnits: grants.reduce((sum, grant) => sum + grant.spentUnits, 0n),
        allowed: decisions.filter(decision => decision.allow).length,
        rejected: decisions.filter(decision => !decision.allow).length,
        lastDecisionAt: decisions[0]?.createdAt.toISOString() ?? null,
      },
    });
  });
}
