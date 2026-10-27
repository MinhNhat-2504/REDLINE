import { grantExpiresAt, type Grant } from "./api";
import { policyState } from "./onboarding";
import type { ActivityItem } from "./activity";
import { paymentAsset } from "./capabilities";

export function agentTaskSummary(grants: Grant[], owner: string, now = Date.now(), mint = paymentAsset.mint) {
  const own = grants.filter(g => g.owner.wallet === owner);
  const active = own.filter(g => !["revoked", "expired", "exhausted"].includes(policyState(g, now)));
  const supported = active.every(g => { try { const mints = JSON.parse(g.policyVersion.allowedMints); return mint && Array.isArray(mints) && mints.length === 1 && mints[0] === mint; } catch { return false; } });
  const remainingUnits = supported ? active.reduce((total, g) => {
    const left = BigInt(g.onchain?.spendCapUnits ?? g.policyVersion.spendCapUnits) - BigInt(g.onchain?.spentUnits ?? g.spentUnits);
    return total + (left > 0n ? left : 0n);
  }, 0n).toString() : null;
  const nextExpiry = active.length ? Math.min(...active.map(g => Math.min(grantExpiresAt(g), g.hire ? Date.parse(g.hire.endsAt) : Infinity))) : null;
  const state = active.some(g => policyState(g, now) === "running") ? "running" : active.some(g => policyState(g, now) === "attention") ? "attention" : active.length ? "ready" : "needs-policy";
  const focus = active.find(g => policyState(g, now) === "running") ?? active.find(g => policyState(g, now) === "attention") ?? active[0] ?? [...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return { state, remainingUnits, nextExpiry, grantId: focus?.id ?? null, policyCount: active.length };
}

/** One signature is one outcome; contradictory evidence remains unconfirmed. */
export function activitySummary(items: ActivityItem[]) {
  const buckets = new Map<string, ActivityItem[]>();
  for (const item of items) {
    if (item.outcome === "info") continue;
    const key = item.row.chainSignature ? `sig:${item.row.chainSignature}` : `${item.grantId}:${item.row.subjectType}:${item.row.subjectId}`;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  let confirmed = 0, blocked = 0, rejected = 0, pending = 0, amountsIncomplete = 0;
  const amounts = new Map<string, bigint>();
  for (const entries of buckets.values()) {
    const success = entries.find(i => i.outcome === "confirmed" && i.row.chainSignature);
    const failure = entries.some(i => i.outcome === "rejected");
    if (success && failure) { pending++; continue; }
    if (success) {
      confirmed++;
      const amountRecords = entries.filter(i => i.outcome === "confirmed" && i.mint && i.amountUnits && /^\d+$/.test(i.amountUnits));
      const values = new Set(amountRecords.map(i => `${i.mint}:${i.amountUnits}`));
      if (values.size === 1) { const record = amountRecords[0]; amounts.set(record.mint!, (amounts.get(record.mint!) ?? 0n) + BigInt(record.amountUnits!)); }
      else amountsIncomplete++;
    } else if (failure) rejected++;
    else if (entries.some(i => i.outcome === "blocked")) blocked++;
    else pending++;
  }
  return { confirmed, blocked, rejected, pending, amountsIncomplete, amounts: [...amounts].map(([mint, units]) => ({ mint, units: units.toString() })) };
}
