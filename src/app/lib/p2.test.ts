import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Grant, AgentRun } from "./api";
import { copyPolicy } from "./policy-copy";
import { activityItems } from "./activity";
import { activityReport, csvCell, reportCsv, type ReportMetadata } from "./activity-report";
import { appNotifications, readNotifications, saveReadNotifications } from "./notifications";
import { grantScope } from "./pending-grant";
import type { PendingGrant } from "./grant-operation";
import { explanationKind } from "./error-explanation";
import { friendlyError } from "./friendly-error";
const owner = "11111111111111111111111111111111";
const now = Date.parse("2026-10-25T00:00:00Z");
const grant: Grant = {
  id: "g1", grantPda: owner, agentId: "agent-instance", executorPubkey: owner, createSignature: "old-signature",
  owner: { wallet: owner }, agentVersion: { id: "a1", name: "=IMPORTXML(1)", version: "1", agentHash: "hash", strategy: "Payments" },
  createdAt: "2026-10-24T02:00:01Z", expiresAt: "2026-10-25T02:00:00Z", lastExecutionAt: null, revoked: false,
  spentUnits: "400000000", transactionCount: 4, nextNonce: 4,
  policyVersion: { policyHash: "old-hash", spendCapUnits: "500000000", maxTransactions: 50, cooldownSeconds: 360, expiresAt: "2026-10-25T02:00:00Z", allowedMints: JSON.stringify([owner]), allowedDests: JSON.stringify([owner]) },
};
const store = new Map<string, string>();
beforeEach(() => { store.clear(); vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) }); });
afterEach(() => vi.unstubAllGlobals());
describe("copying existing policy configuration", () => {
  it("copies only representable configuration, not identity, signatures, counters or hire", () => {
    const original = JSON.stringify(grant);
    const result = copyPolicy({ ...grant, revoked: true, hire: { id: "old-hire", endsAt: "2026-10-24T00:00:00Z", status: "expired" } }, owner, [{ address: owner, name: "Ops" }], owner);
    expect(result).toEqual({ draft: { agentId: "a1", cap: 500, txn: 50, dur: 24, cool: 6, dests: [owner], names: ["Ops"] } });
    expect(JSON.stringify(grant)).toBe(original); expect(JSON.stringify(result)).not.toContain("old-signature"); expect(JSON.stringify(result)).not.toContain("old-hire");
  });
  it("rejects foreign ownership, redacted scope and unsupported assets", () => {
    expect(copyPolicy(grant, "bob", [], owner)).toEqual({ problem: "owner" });
    expect(copyPolicy({ ...grant, policyVersion: { ...grant.policyVersion, allowedDests: "4" } }, owner, [], owner)).toEqual({ problem: "scope" });
    expect(copyPolicy(grant, owner, [], "different-mint")).toEqual({ problem: "asset" });
    expect(copyPolicy({ ...grant, policyVersion: { ...grant.policyVersion, allowedDests: JSON.stringify([owner, owner]) } }, owner, [], owner)).toEqual({ problem: "scope" });
  });
  it("never rounds budgets, expands out-of-range limits or copies invalid dates", () => {
    for (const policy of [{ spendCapUnits: "500000001" }, { spendCapUnits: "10001000000" }, { cooldownSeconds: 61 }, { maxTransactions: 501 }]) expect(copyPolicy({ ...grant, policyVersion: { ...grant.policyVersion, ...policy } }, owner, [], owner)).toEqual({ problem: "limits" });
    expect(copyPolicy({ ...grant, createdAt: "invalid" }, owner, [], owner)).toEqual({ problem: "limits" });
  });
});
const metadata: ReportMetadata = { owner, generatedAt: new Date(now).toISOString(), verifiedAt: new Date(now).toISOString(), timezone: "Asia/Ho_Chi_Minh", network: "devnet", api: "local", program: "program", mint: owner, filters: { grant: "g1", run: "", agent: "", outcome: "confirmed", from: "", to: "", search: "" }, sourceEventCount: 2, sourceEventLimit: 1000 };
const items = activityItems([{ id: "e1", createdAt: new Date(now).toISOString(), actorType: "chain", eventType: "tx.confirmed", subjectType: "intent", subjectId: "i1", chainSignature: "sig-exact", payload: { grantId: "g1", runId: "r1", amountUnits: "9007199254740993123", mint: owner, destination: owner, secret: "do-not-export", token: "private" } }]);
describe("activity reports", () => {
  it("preserves exact units and signature, adds scope/filters and excludes payload secrets", () => {
    const report = activityReport(items, [grant], metadata);
    expect(report.rows[0]).toMatchObject({ amountUnits: "9007199254740993123", signature: "sig-exact", runId: "r1" });
    expect(report).toMatchObject({ scope: "filtered_recent_window", filters: metadata.filters, rowCount: 1 });
    expect(JSON.stringify(report)).not.toContain("do-not-export"); expect(JSON.stringify(report)).not.toContain("private");
    const csv = reportCsv(report); expect(csv).toContain("9007199254740993123"); expect(csv).toContain("sig-exact");
    expect(csv).toContain("'=IMPORTXML(1)");
  });
  it("refuses anonymous, redacted, foreign and unlinked private exports", () => {
    expect(() => activityReport(items, [grant], { ...metadata, owner: "" })).toThrow();
    expect(() => activityReport(items, [grant], { ...metadata, owner: "bob" })).toThrow();
    expect(() => activityReport([{ ...items[0], row: { ...items[0].row, redacted: true } }], [grant], metadata)).toThrow();
    expect(() => activityReport([{ ...items[0], grantId: null }], [grant], metadata)).toThrow();
    expect(activityReport([{ ...items[0], grantId: null, row: { ...items[0].row, actorId: owner } }], [], metadata).rowCount).toBe(1);
  });
  it("escapes CSV quotes, commas, newlines and spreadsheet formula prefixes", () => {
    expect(csvCell('A,"B"')).toBe('"A,""B"""');
    for (const value of ["=1+1", " +cmd", "-5+2", "@SUM(A1)", "\t=1", "\n@A1", "\uFEFF=1"]) expect(csvCell(value).startsWith('"\'')).toBe(true);
    expect(csvCell("12345678901234567890")).toBe('"12345678901234567890"');
  });
});
describe("in-app notifications", () => {
  const run: AgentRun = { id: "r1", grantId: "g1", status: "failed", mode: "scripted", startedAt: new Date(now).toISOString() };
  it("derives current owner alerts with exact target links; resolved conditions disappear", () => {
    const alerts = appNotifications(owner, [grant], [run], null, now);
    expect(alerts.map(i => i.kind)).toEqual(["expiry", "budget", "failed"]); expect(alerts[2].href).toBe("#/audit?grant=g1&run=r1");
    expect(appNotifications("bob", [grant], [run], null, now)).toEqual([]);
    expect(appNotifications(owner, [{ ...grant, revoked: true }], [], null, now)).toEqual([]);
    expect(appNotifications(owner, [{ ...grant, transactionCount: 50 }], [], null, now).map(i => i.kind)).toEqual(["expiry", "exhausted"]);
    expect(appNotifications(owner, [grant], [], null, now + 3 * 3600_000).map(i => i.kind)).toEqual(["expired"]);
  });
  it("never describes an unverified saved transaction as already confirmed", () => {
    const pending = { scope: grantScope(owner), registration: { ownerWallet: owner, grantPda: "pda", policy: { agentName: "Agent" } }, grantReceipt: { signature: "unknown-signature" } } as PendingGrant;
    expect(appNotifications(owner, [], [], pending, now)[0]).toMatchObject({ kind: "pending", href: "#/guardrails" }); expect(appNotifications("bob", [], [], pending, now)).toEqual([]);
  });
  it("stores read state only for this wallet/network, bounds history, rejects broken storage", () => {
    saveReadNotifications(owner, ["n1", "n1"]); expect(readNotifications(owner)).toEqual(["n1"]); expect(readNotifications("bob")).toEqual([]);
    saveReadNotifications(owner, Array.from({ length: 250 }, (_, i) => `n${i}`)); expect(readNotifications(owner)).toHaveLength(200);
    const key = [...store.keys()][0]; store.set(key, JSON.stringify({ scope: "other-network", read: ["n1"] })); expect(readNotifications(owner)).toEqual([]); store.set(key, "{"); expect(readNotifications(owner)).toEqual([]);
  });
});
describe("contextual issue explanations", () => {
  it("prioritizes unknown signed operations over generic advice to retry", () => {
    expect(explanationKind({ area: "vault", signature: "s", transactionState: "unknown", message: "503 session error" })).toBe("unknown-transaction");
    expect(explanationKind({ area: "policy", transactionState: "confirmed", message: "503" })).toBe("confirmed-sync");
    expect(explanationKind({ area: "activity", outcome: "pending", signature: "s" })).toBe("unknown-transaction");
  });
  it("separates policy expiry, transaction expiry, wallet cancellation and chain failure", () => {
    expect(explanationKind({ area: "activity", code: "EXPIRED" })).toBe("expired"); expect(explanationKind({ area: "vault", message: "The transaction window expired" })).toBe("transaction-expired");
    expect(explanationKind({ area: "activity", outcome: "rejected", code: "CHAIN_ERROR" })).toBe("transaction-failed");
    expect(explanationKind({ area: "policy", message: "User rejected request (4001)" })).toBe("cancelled");
    expect(friendlyError(new Error("Transaction rejected by the chain"))).not.toContain("wallet request was cancelled");
  });
  it("uses recorded reason codes, and admits unknown causes", () => {
    expect(explanationKind({ area: "activity", code: "SPEND_CAP_EXCEEDED", outcome: "blocked" })).toBe("budget"); expect(explanationKind({ area: "activity", code: "TX_CAP_EXCEEDED" })).toBe("count"); expect(explanationKind({ area: "activity", code: "NONCE_REPLAY" })).toBe("replay"); expect(explanationKind({ area: "run", message: "mystery" })).toBe("unknown");
  });
});
