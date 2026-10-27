import { grantExpiresAt, type Grant, type VaultView } from "./api";

export type PolicyState = "revoked" | "expired" | "running" | "exhausted" | "attention" | "ready";
export function policyState(grant: Grant, now = Date.now()): PolicyState {
  if (grant.revoked || grant.onchain?.active === false) return "revoked";
  if (grantExpiresAt(grant) <= now || grant.hire && new Date(grant.hire.endsAt).getTime() <= now) return "expired";
  if (grant.runs?.some(run => run.status === "running")) return "running";
  if (BigInt(grant.onchain?.spentUnits ?? grant.spentUnits) >= BigInt(grant.policyVersion.spendCapUnits) ||
      (grant.onchain?.transactionCount ?? grant.transactionCount) >= grant.policyVersion.maxTransactions) return "exhausted";
  if (grant.runs?.[0]?.status === "failed") return "attention";
  return "ready";
}

/** Historical milestones are separate from current readiness, scoped to the verified owner. */
export function setupProgress(wallet: string, signedIn: boolean, grants: Grant[], vault: VaultView | null, now = Date.now()) {
  const verified = Boolean(wallet) && signedIn;
  const own = verified ? grants.filter(g => g.owner.wallet === wallet) : [];
  const active = own.filter(g => !["revoked", "expired", "exhausted"].includes(policyState(g, now)));
  // Counters mirror confirmed transfers. A stopped/completed run or a click alone is not proof.
  const firstPayment = own.some(g => (g.onchain?.transactionCount ?? g.transactionCount) > 0 && BigInt(g.onchain?.spentUnits ?? g.spentUnits) > 0n);
  const funded = verified && vault?.owner === wallet && vault.exists && vault.balanceUnits !== null && BigInt(vault.balanceUnits) > 0n;
  const readiness = !verified ? "connect" : active.length === 0 ? "policy" : active.some(g => policyState(g, now) === "running") ? "running"
    : !vault || vault.owner !== wallet || vault.balanceUnits === null ? "unknown" : !funded ? "funds" : "ready";
  return { active, firstPayment, readiness, done: [verified, firstPayment || active.length > 0, firstPayment || Boolean(funded), firstPayment] };
}
