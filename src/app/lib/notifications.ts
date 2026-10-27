import { grantExpiresAt, type AgentRun, type Grant } from "./api";
import { attentionItems } from "./attention";
import { grantScope } from "./pending-grant";
import type { PendingGrant } from "./grant-operation";
export interface AppNotification { id: string; kind: "expiry" | "budget" | "failed" | "expired" | "exhausted" | "pending"; agent: string; href: string }
export function appNotifications(owner: string, grants: Grant[], runs: AgentRun[], pending: PendingGrant | null, now = Date.now()): AppNotification[] {
  if (!owner) return [];
  const own = grants.filter(g => g.owner.wallet === owner);
  const items: AppNotification[] = attentionItems(owner, own, runs, now).map(item => ({
    id: item.id + (item.kind === "expiry" ? `:${grantExpiresAt(own.find(g => g.id === item.grantId)!)}` : ""),
    kind: item.kind, agent: item.agent,
    href: item.kind === "failed" ? `#/audit?grant=${encodeURIComponent(item.grantId)}&run=${encodeURIComponent(item.runId!)}` : `#/guardrails?grant=${encodeURIComponent(item.grantId)}`,
  }));
  for (const g of own) {
    if (g.revoked || g.onchain?.active === false) continue;
    const expired = Math.min(grantExpiresAt(g), g.hire ? Date.parse(g.hire.endsAt) : Infinity) <= now;
    const exhausted = BigInt(g.onchain?.spentUnits ?? g.spentUnits) >= BigInt(g.onchain?.spendCapUnits ?? g.policyVersion.spendCapUnits) || (g.onchain?.transactionCount ?? g.transactionCount) >= g.policyVersion.maxTransactions;
    if (expired || exhausted) {
      const budget = items.findIndex(i => i.id === `budget:${g.id}`); if (budget >= 0) items.splice(budget, 1);
      items.push({ id: `${expired ? "expired" : "exhausted"}:${g.id}`, kind: expired ? "expired" : "exhausted", agent: g.agentVersion.name, href: `#/guardrails?grant=${encodeURIComponent(g.id)}` });
    }
  }
  if (pending?.scope === grantScope(owner) && pending.registration.ownerWallet === owner) items.unshift({ id: `pending:${pending.registration.grantPda}:${pending.grantReceipt?.signature ?? "unsigned"}`, kind: "pending", agent: pending.registration.policy.agentName, href: "#/guardrails" });
  return items;
}
const key = (owner: string) => `redline:notifications:v1:${grantScope(owner)}`;
export function readNotifications(owner: string): string[] {
  if (!owner) return [];
  try { const data = JSON.parse(localStorage.getItem(key(owner)) ?? "null"); return data?.scope === grantScope(owner) && Array.isArray(data.read) ? data.read.filter((id: unknown) => typeof id === "string").slice(-200) : []; }
  catch { return []; }
}
export function saveReadNotifications(owner: string, ids: string[]) {
  if (!owner) return;
  localStorage.setItem(key(owner), JSON.stringify({ scope: grantScope(owner), read: [...new Set(ids)].slice(-200) }));
}
