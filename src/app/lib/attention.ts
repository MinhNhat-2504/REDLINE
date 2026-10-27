import { grantExpiresAt, type AgentRun, type Grant } from "./api";
export type AttentionItem = { id: string; grantId: string; agent: string; kind: "expiry" | "budget" | "failed"; runId?: string };
export function attentionItems(owner: string, grants: Grant[], runs: AgentRun[], now = Date.now()): AttentionItem[] {
  const own = grants.filter(g => g.owner.wallet === owner);
  const items: AttentionItem[] = [];
  for (const grant of own) {
    const base = { grantId: grant.id, agent: grant.agentVersion.name };
    const expiry = Math.min(grantExpiresAt(grant), grant.hire ? Date.parse(grant.hire.endsAt) : Infinity);
    if (!grant.revoked && grant.onchain?.active !== false && expiry > now) {
      if (expiry > now && expiry - now <= 6 * 3600_000) items.push({ ...base, id: `expiry:${grant.id}`, kind: "expiry" });
      const cap = BigInt(grant.onchain?.spendCapUnits ?? grant.policyVersion.spendCapUnits);
      const spent = BigInt(grant.onchain?.spentUnits ?? grant.spentUnits);
      if (cap > 0n && spent * 100n >= cap * 80n) items.push({ ...base, id: `budget:${grant.id}`, kind: "budget" });
    }
    const latest = runs.filter(r => r.grantId === grant.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    if (latest?.status === "failed") items.push({ ...base, id: `failed:${latest.id}`, kind: "failed", runId: latest.id });
  }
  return items;
}
