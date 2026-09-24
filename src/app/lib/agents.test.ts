import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { summarizeAgents } from "./agents";
import type { AgentVersion, Grant } from "./api";

const agent = (id: string, name: string): AgentVersion => ({ id, name, version: "v1.0.0", strategy: "s", agentHash: `hash-${id}` });

const grant = (over: Partial<Grant> & { agentVersionId: string }): Grant => ({
  id: `grant-${over.agentVersionId}-${over.spentUnits ?? 0}`,
  grantPda: "pda", agentId: "a", executorPubkey: "e", createSignature: null,
  spentUnits: "0", transactionCount: 0, nextNonce: 0, revoked: false,
  createdAt: "2026-08-01T00:00:00.000Z", lastExecutionAt: null,
  agentVersion: agent(over.agentVersionId, "n"),
  policyVersion: { policyHash: "p", spendCapUnits: "1000000000", maxTransactions: 10, cooldownSeconds: 60, expiresAt: "2026-09-01T00:00:00.000Z", allowedMints: "[]", allowedDests: "[]" },
  owner: { wallet: "w" },
  ...over,
});

describe("summarizeAgents", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-08-15T00:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it("marks an expired unrevoked grant idle while retaining its history", () => {
    vi.setSystemTime(new Date("2026-09-01T00:00:00Z"));
    const [result] = summarizeAgents([agent("v1", "A")], [grant({agentVersionId:"v1",spentUnits:"250000000"})]);
    expect(result).toMatchObject({status:"IDLE",activeGrants:0,totalGrants:1,totalSpentUsdc:250});
  });
  it("rolls spend and transfers up per agent version", () => {
    const [a] = summarizeAgents([agent("v1", "TreasuryOps")], [
      grant({ agentVersionId: "v1", spentUnits: "100000000", transactionCount: 2 }),
      grant({ agentVersionId: "v1", spentUnits: "50000000", transactionCount: 1 }),
    ]);

    expect(a.totalSpentUsdc).toBe(150);
    expect(a.totalTx).toBe(3);
    expect(a.totalGrants).toBe(2);
  });

  it("is ACTIVE while any grant survives, REVOKED once none do, IDLE with no grants", () => {
    const [mixed] = summarizeAgents([agent("v1", "A")], [
      grant({ agentVersionId: "v1", revoked: true }),
      grant({ agentVersionId: "v1", spentUnits: "1", revoked: false }),
    ]);
    expect(mixed.status).toBe("ACTIVE");
    expect(mixed.activeGrants).toBe(1);

    const [allRevoked] = summarizeAgents([agent("v1", "A")], [grant({ agentVersionId: "v1", revoked: true })]);
    expect(allRevoked.status).toBe("REVOKED");

    const [never] = summarizeAgents([agent("v1", "A")], []);
    expect(never.status).toBe("IDLE");
  });

  it("reports the most recent execution across the agent's grants", () => {
    const [a] = summarizeAgents([agent("v1", "A")], [
      grant({ agentVersionId: "v1", lastExecutionAt: "2026-08-02T00:00:00.000Z" }),
      grant({ agentVersionId: "v1", spentUnits: "1", lastExecutionAt: "2026-08-05T00:00:00.000Z" }),
      grant({ agentVersionId: "v1", spentUnits: "2", lastExecutionAt: null }),
    ]);

    expect(a.lastActiveAt).toBe("2026-08-05T00:00:00.000Z");
  });

  it("does not attribute another agent's grants", () => {
    const [first, second] = summarizeAgents([agent("v1", "A"), agent("v2", "B")], [
      grant({ agentVersionId: "v1", spentUnits: "10000000", transactionCount: 1 }),
    ]);

    expect(first.totalTx).toBe(1);
    expect(second.totalGrants).toBe(0);
    expect(second.totalSpentUsdc).toBe(0);
  });
});
