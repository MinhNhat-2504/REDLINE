import { askForJson, isConfigured } from "../llm-client.js";
import { prisma } from "../db/client.js";
import type { GrantState } from "../policy/types.js";
import type { PlannedIntent } from "./scripted.js";

// LLM planner. The model proposes; it is never trusted. Whatever it returns is
// clamped to the allowlists and then judged by the program like any intent.
// Falls back to null (ends the run) when no key is configured.

const planSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["transfer", "hold"] },
    amountUsdc: { type: "number", minimum: 0 },
    destinationIndex: { type: "integer", minimum: 0, maximum: 3 },
    reason: { type: "string" },
  },
  required: ["action", "amountUsdc", "destinationIndex", "reason"],
} as const;

export async function llmPlan(grant: GrantState, grantId: string): Promise<PlannedIntent | null> {
  if (!isConfigured()) return null;
  const dbGrant = await prisma.agentGrant.findUniqueOrThrow({ where: { id: grantId }, include: { agentVersion: true, policyVersion: true } });
  const remaining = Number(grant.spendCapUnits - grant.spentUnits) / 1e6;

  const plan = await askForJson<{ action: string; amountUsdc: number; destinationIndex: number; reason: string }>({
    system: [
      "You are an autonomous treasury operations agent on Solana Devnet.",
      "You may only propose SPL transfers to the listed destinations. You cannot see prices; do not invent market data.",
      "Propose at most one action per call. Prefer small, staged amounts. Choose 'hold' when nothing is needed.",
    ].join(" "),
    input: {
      strategy: dbGrant.agentVersion.strategy,
      remainingBudgetUsdc: remaining,
      transactionsLeft: grant.maxTransactions - grant.transactionCount,
      destinations: grant.allowedDestinations,
    },
    schemaName: "redline_agent_plan",
    schema: planSchema as unknown as Record<string, unknown>,
    maxTokens: 300,
  });
  if (!plan || plan.action !== "transfer" || plan.amountUsdc <= 0) return null;
  const dest = grant.allowedDestinations[Math.min(plan.destinationIndex, grant.allowedDestinations.length - 1)];
  return {
    mint: grant.allowedMints[0],
    amountUnits: BigInt(Math.round(plan.amountUsdc * 1e6)),
    destination: dest,
    reason: plan.reason.slice(0, 200),
  };
}
