import { describe, expect, it } from "vitest";
import { activitySummary, agentTaskSummary } from "./task-summary";
import { isQuickDemoResult } from "./quick-demo";
import type { Grant, SimulationResult } from "./api";
import type { ActivityItem } from "./activity";
const now = Date.parse("2026-10-27T00:00:00Z");
const grant = { id: "g1", owner: { wallet: "alice" }, createdAt: new Date(now - 3600000).toISOString(), agentVersion: { name: "Agent" }, revoked: false, spentUnits: "20000000", transactionCount: 1,
  policyVersion: { spendCapUnits: "100000000", maxTransactions: 5, expiresAt: new Date(now + 3600000).toISOString(), allowedMints: '["mint"]' }, runs: [] } as unknown as Grant;
describe("current agent tasks", () => {
  it("isolates ownership and uses remaining authority rather than spent volume", () => {
    expect(agentTaskSummary([grant], "alice", now, "mint")).toMatchObject({ remainingUnits: "80000000", state: "ready", grantId: "g1" });
    expect(agentTaskSummary([grant], "bob", now, "mint")).toMatchObject({ remainingUnits: "0", state: "needs-policy", grantId: null });
  });
  it("omits expired/revoked/rented-out authority and never sums mixed assets", () => {
    expect(agentTaskSummary([{ ...grant, revoked: true }, { ...grant, hire: { id: "h", endsAt: new Date(now - 1).toISOString(), status: "active" } }], "alice", now, "mint").remainingUnits).toBe("0");
    expect(agentTaskSummary([grant], "alice", now, "other").remainingUnits).toBeNull();
  });
  it("prioritizes the running policy and finds the earliest current expiry", () => {
    const running = { ...grant, id: "running", expiresAt: new Date(now + 7200000).toISOString(), runs: [{ id: "r", mode: "scripted", status: "running", startedAt: new Date(now).toISOString() }] };
    expect(agentTaskSummary([grant, running], "alice", now, "mint")).toMatchObject({ state: "running", grantId: "running", nextExpiry: now + 3600000 });
  });
});
const item = (outcome: ActivityItem["outcome"], id: string, signature: string | null, amount = "9007199254740993000", mint = "mint"): ActivityItem => ({
  row: { id, createdAt: "", actorType: "chain", eventType: "tx", subjectType: "intent", subjectId: id, chainSignature: signature, payload: {} }, outcome, grantId: "g", runId: "r", amountUnits: amount, mint, destination: "d", reason: null,
});
describe("readable result totals", () => {
  it("deduplicates signatures and counts only confirmed amounts with exact integers", () => {
    const result = activitySummary([item("confirmed", "i1", "sig"), item("confirmed", "indexer", "sig"), item("blocked", "i2", null), item("pending", "i3", null), item("rejected", "i4", "failed"), item("rejected", "indexed-fail", "failed")]);
    expect(result).toEqual({ confirmed: 1, blocked: 1, rejected: 1, pending: 1, amountsIncomplete: 0, amounts: [{ mint: "mint", units: "9007199254740993000" }] });
  });
  it("keeps contradictory evidence unconfirmed and never combines different assets", () => {
    expect(activitySummary([item("confirmed", "i", "s"), item("rejected", "i", "s")])).toMatchObject({ confirmed: 0, pending: 1, amounts: [] });
    expect(activitySummary([item("confirmed", "i", "s"), item("confirmed", "j", "t", "1", "other")]).amounts).toHaveLength(2);
    expect(activitySummary([item("confirmed", "i", "s"), item("confirmed", "j", "s", "1")]).amounts).toEqual([]);
    expect(activitySummary([item("confirmed", "i", "s"), item("confirmed", "j", "s", "1")]).amountsIncomplete).toBe(1);
  });
});
describe("wallet-free demonstration evidence", () => {
  const result = (allow: boolean) => ({ mode: "simulation", input: { policy: { spendCapUnits: "100000000" }, proposal: { amountUnits: allow ? "20000000" : "120000000" } }, steps: [{ verdict: { allow, reasonCode: allow ? "OK" : "SPEND_CAP_EXCEEDED" } }], summary: { spentUnits: allow ? "20000000" : "0", remainingUnits: allow ? "80000000" : "100000000" } } as SimulationResult);
  it("accepts only the actual selected scenario and a consistent hypothetical balance", () => {
    expect(isQuickDemoResult(result(true), "allowed")).toBe(true); expect(isQuickDemoResult(result(false), "blocked")).toBe(true);
    expect(isQuickDemoResult(result(false), "allowed")).toBe(false);
    expect(isQuickDemoResult({ ...result(true), mode: "live" } as unknown as SimulationResult, "allowed")).toBe(false);
    expect(isQuickDemoResult({ ...result(true), summary: { ...result(true).summary, remainingUnits: "100000000" } }, "allowed")).toBe(false);
  });
});
