import type { GrantState } from "../policy/types.js";

// Deterministic safe-run agent. It executes three compliant transfers and
// stops with budget still available. Rejection scenarios belong in Policy Lab,
// where they can be inspected without fees or failed on-chain transactions.
// Amounts scale from the grant so the same script works for any cap.

export interface PlannedIntent {
  mint: string;
  amountUnits: bigint;
  destination: string;
  reason: string;
}

export function scriptedPlan(grant: GrantState, step: number): PlannedIntent | null {
  const mint = grant.allowedMints[0];
  const dest = grant.allowedDestinations[0];
  const slice = grant.spendCapUnits / 5n; // 20% of cap each
  if (step < 3) {
    return { mint, amountUnits: slice, destination: dest, reason: `Validated rebalance tranche ${step + 1}/3 to treasury ops wallet` };
  }
  return null;
}
