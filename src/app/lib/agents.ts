import { useCallback, useEffect, useState } from "react";
import { api, grantExpiresAt, type AgentRating, type AgentVersion, type Grant } from "./api";

// Real per-agent rollups computed from /agents + /grants. No win rate, APY or
// uptime here — the platform never tracked those, so there is nothing honest
// to show. What is real: how many grants an agent has, how much moved, how
// many transfers, and when it last executed.
export interface AgentSummary {
  id: string;
  name: string;
  version: string;
  strategy: string;
  agentHash: string;
  status: "ACTIVE" | "IDLE" | "REVOKED";
  activeGrants: number;
  totalGrants: number;
  totalSpentUsdc: number;
  totalTx: number;
  lastActiveAt: string | null;
  latestExpiresAt: string | null;
  grants: Grant[];
  // Ownership, so the page can answer "which of these is mine?" instead of
  // rendering every published build as if it belonged to whoever is looking.
  publisherWallet: string | null;
  isMine: boolean;
  unclaimed: boolean;
  rating: AgentRating | null;
}

export function summarizeAgents(agents: AgentVersion[], grants: Grant[]): AgentSummary[] {
  return agents.map(a => {
    const own = grants.filter(g => g.agentVersion.id === a.id);
    const active = own.filter(g => !g.revoked && grantExpiresAt(g) > Date.now());
    const totalSpentUsdc = own.reduce((s, g) => s + Number(g.spentUnits) / 1_000_000, 0);
    const totalTx = own.reduce((s, g) => s + g.transactionCount, 0);
    const lastActiveAt = own.reduce<string | null>((latest, g) => {
      if (!g.lastExecutionAt) return latest;
      return !latest || g.lastExecutionAt > latest ? g.lastExecutionAt : latest;
    }, null);
    const latestGrant = [...own].sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
    return {
      id: a.id, name: a.name, version: a.version, strategy: a.strategy, agentHash: a.agentHash,
      publisherWallet: a.publisherWallet ?? null,
      isMine: a.isMine ?? false,
      unclaimed: a.unclaimed ?? a.publisherWallet == null,
      rating: a.rating ?? null,
      // An agent whose grants have all lapsed (expired, not revoked) is idle,
      // not revoked — the two words mean different things to the owner.
      status: own.length === 0 ? "IDLE" : active.length > 0 ? "ACTIVE" : own.every(g => g.revoked) ? "REVOKED" : "IDLE",
      activeGrants: active.length, totalGrants: own.length, totalSpentUsdc, totalTx,
      lastActiveAt, latestExpiresAt: latestGrant ? new Date(grantExpiresAt(latestGrant)).toISOString() : null,
      grants: own,
    };
  });
}

export function useRealAgents() {
  const [agents, setAgents] = useState<AgentVersion[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [a, g] = await Promise.all([api.agents(), api.grants()]);
      setAgents(a); setGrants(g); setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); const t = setInterval(() => void load(), 15_000); return () => clearInterval(t); }, [load]);

  return { agents: summarizeAgents(agents, grants), grants, loading, error, reload: load };
}
