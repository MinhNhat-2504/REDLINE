import { z } from "zod";
import { applyExecution, evaluateIntent } from "./engine.js";
import type { GrantState } from "./types.js";

const units = z.string().max(20).regex(/^[1-9]\d*$/).pipe(
  z.string().refine(value => BigInt(value) <= 18_446_744_073_709_551_615n, "Must fit an unsigned 64-bit amount"),
);
export const SimulationInput = z.object({
  policy: z.object({
    spendCapUnits: units,
    maxTransactions: z.number().int().min(1).max(1000),
    cooldownSeconds: z.number().int().min(0).max(604800),
    durationSeconds: z.number().int().min(1).max(31_536_000),
  }).strict(),
  proposal: z.object({
    amountUnits: units,
    attempts: z.number().int().min(1).max(50),
    intervalSeconds: z.number().int().min(0).max(604800),
    destinationAllowed: z.boolean().default(true),
    mintAllowed: z.boolean().default(true),
    active: z.boolean().default(true),
    replayNonce: z.boolean().default(false),
  }).strict(),
}).strict();

export const POLICY_PRESETS = [
  { id: "payroll", name: "Contributor payroll", description: "Space out recurring payments within a shared budget.", policy: { spendCapUnits: "1000000000", maxTransactions: 10, cooldownSeconds: 60, durationSeconds: 86400 }, proposal: { amountUnits: "250000000", attempts: 5, intervalSeconds: 60 } },
  { id: "treasury", name: "Treasury operations", description: "A smaller transaction allowance with a longer cooldown.", policy: { spendCapUnits: "5000000000", maxTransactions: 3, cooldownSeconds: 3600, durationSeconds: 604800 }, proposal: { amountUnits: "1000000000", attempts: 4, intervalSeconds: 3600 } },
  { id: "sandbox", name: "Agent sandbox", description: "Small budgets for exploring rapid agent proposals.", policy: { spendCapUnits: "100000000", maxTransactions: 5, cooldownSeconds: 30, durationSeconds: 3600 }, proposal: { amountUnits: "20000000", attempts: 5, intervalSeconds: 10 } },
] as const;

/** Pure hypothetical run. No adapter, clock, database or wallet is accessed. */
export function simulatePolicy(input: z.infer<typeof SimulationInput>) {
  // Start above zero because zero is the engine's "never executed" sentinel.
  const start = 1_000_000;
  let state: GrantState = {
    ...input.policy, spendCapUnits: BigInt(input.policy.spendCapUnits),
    grantPda: "simulation", executor: "simulation", active: input.proposal.active,
    allowedMints: ["simulation-mint"], allowedDestinations: ["simulation-recipient"],
    expiresAt: start + input.policy.durationSeconds,
    spentUnits: 0n, transactionCount: 0, nextNonce: 0, lastExecutionAt: 0,
  };
  const steps = Array.from({ length: input.proposal.attempts }, (_, index) => {
    const elapsedSeconds = index * input.proposal.intervalSeconds;
    const intent = {
      grantPda: state.grantPda,
      mint: input.proposal.mintAllowed ? "simulation-mint" : "foreign-mint",
      destination: input.proposal.destinationAllowed ? "simulation-recipient" : "foreign-recipient",
      amountUnits: BigInt(input.proposal.amountUnits),
      nonce: input.proposal.replayNonce ? 0 : state.nextNonce,
    };
    const verdict = evaluateIntent(state, intent, start + elapsedSeconds);
    if (verdict.allow) state = applyExecution(state, intent, start + elapsedSeconds);
    return {
      attempt: index + 1, elapsedSeconds, nonce: intent.nonce, verdict,
      gates: Array.from({ length: 7 }, (_, gate) => ({
        id: gate + 1,
        status: verdict.allow || gate + 1 < verdict.gate ? "passed" : gate + 1 === verdict.gate ? "blocked" : "skipped",
      })),
      spentUnits: state.spentUnits.toString(),
      remainingUnits: (state.spendCapUnits - state.spentUnits).toString(),
    };
  });
  return {
    mode: "simulation" as const,
    notice: "Hypothetical policy checks only. No funds move; balances, fees and account constraints are not checked.",
    input, steps,
    summary: { allowed: state.transactionCount, blocked: steps.length - state.transactionCount, spentUnits: state.spentUnits.toString(), remainingUnits: (state.spendCapUnits - state.spentUnits).toString(), nextNonce: state.nextNonce },
  };
}
