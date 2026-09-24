import { describe, expect, it } from "vitest";
import { scriptedPlan } from "../src/runtime/scripted.js";
import type { GrantState } from "../src/policy/types.js";

const grant: GrantState = {
  grantPda: "grant", executor: "executor", active: true,
  spendCapUnits: 500_000_000n, spentUnits: 0n,
  maxTransactions: 5, transactionCount: 0, nextNonce: 0,
  cooldownSeconds: 60, expiresAt: 2_000_000_000, lastExecutionAt: 0,
  allowedMints: ["Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4"],
  allowedDestinations: ["7XB2hFTccpjS6sgZZjr8wWnCuk6jYuXk6aYkXRHPu62q"],
};

describe("safe scripted run", () => {
  it("produces three in-budget transfers and then stops", () => {
    const plans = [0, 1, 2].map(step => scriptedPlan(grant, step));
    expect(plans.every(plan => plan?.amountUnits === 100_000_000n)).toBe(true);
    expect(plans.reduce((sum, plan) => sum + (plan?.amountUnits ?? 0n), 0n)).toBeLessThanOrEqual(grant.spendCapUnits);
    expect(scriptedPlan(grant, 3)).toBeNull();
  });
});
