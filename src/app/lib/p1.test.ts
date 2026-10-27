import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDraft, readDraft, readRecipients, recipientError, validDraft, writeDraft, writeRecipients, type PolicyDraft } from "./policy-draft";
import { activityItems } from "./activity";
import { attentionItems } from "./attention";
import { agentAccess, relatedAgent } from "./agent-access";
import type { AuditRow, Grant, Hire, Listing } from "./api";
const address = "11111111111111111111111111111111";
const draft: PolicyDraft = { agentId: "agent", cap: 50, txn: 5, dur: 24, cool: 10, dests: [address], names: ["Operations"] };
const store = new Map<string, string>();
beforeEach(() => { store.clear(); vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) }); });
afterEach(() => vi.unstubAllGlobals());
describe("wallet-local draft and recipient data", () => {
  it("isolates owners, validates schema and network scope, and deletes independently", () => {
    writeDraft("alice", draft); expect(readDraft("alice")).toEqual(draft); expect(readDraft("bob")).toBeNull();
    const [key, json] = [...store][0]; const saved = JSON.parse(json);
    store.set(key, JSON.stringify({ ...saved, scope: "another-network" })); expect(readDraft("alice")).toBeNull();
    store.set(key, JSON.stringify({ ...saved, version: 2 })); expect(readDraft("alice")).toBeNull();
    writeDraft("alice", draft); writeDraft("bob", draft); deleteDraft("alice"); expect(readDraft("alice")).toBeNull(); expect(readDraft("bob")).toEqual(draft);
  });
  it("rejects malformed, out-of-range and future-schema drafts", () => {
    for (const d of [{ ...draft, cap: Infinity }, { ...draft, txn: 0 }, { ...draft, dur: 169 }, { ...draft, cool: 1.5 }, { ...draft, names: [] }, { ...draft, dests: Array(5).fill(address) }]) expect(validDraft(d)).toBe(false);
    expect(() => writeDraft("", draft)).toThrow();
    store.set("garbage", "{"); expect(readDraft("alice")).toBeNull();
  });
  it("blocks duplicate and invalid recipients without substituting names for addresses", () => {
    expect(recipientError([address, ` ${address} `])).toBe("duplicate"); expect(recipientError(["Operations"])).toBe("invalid"); expect(recipientError([address, ""])).toBe("invalid"); expect(recipientError([address])).toBeNull();
    writeRecipients("alice", [{ address, name: "Treasury" }]); expect(readRecipients("alice")[0].address).toBe(address); expect(readRecipients("bob")).toEqual([]);
  });
});
const row = (eventType: string, payload: Record<string, unknown>, overrides: Partial<AuditRow> = {}): AuditRow => ({ id: eventType, eventType, payload, createdAt: "2026-10-25T00:00:00Z", actorType: "system", subjectType: "intent", subjectId: "i1", chainSignature: null, ...overrides });
describe("activity evidence", () => {
  const created = row("intent.created", { grantId: "g1", runId: "r1", amountUnits: "1", mint: address, destination: address });
  it("joins by exact intent id and collapses stages without counting a precheck as payment", () => {
    const pending = activityItems([created, row("decision.precheck", { allow: true })]); expect(pending).toHaveLength(1); expect(pending[0].outcome).toBe("pending");
    const blocked = activityItems([created, row("decision.precheck", { allow: false, reasonCode: "SPEND_CAP_EXCEEDED" })]); expect(blocked).toHaveLength(1); expect(blocked[0]).toMatchObject({ outcome: "blocked", runId: "r1", amountUnits: "1" });
    const settled = activityItems([created, row("tx.confirmed", { grantId: "g1" }, { chainSignature: "sig" }), row("chain.policy_decision", {}, { chainSignature: "sig", subjectType: "grant" })]);
    expect(settled).toHaveLength(1); expect(settled[0]).toMatchObject({ outcome: "confirmed", amountUnits: "1", runId: "r1" }); expect(settled[0].row.chainSignature).toBe("sig");
  });
  it("never borrows another intent's amount/run or claims confirmation without a signature", () => {
    const entries = activityItems([created, row("tx.rejected", { grantId: "g1" }, { subjectId: "i2", chainSignature: "failed" })]);
    expect(entries.find(i => i.outcome === "rejected")).toMatchObject({ runId: null, amountUnits: null });
    expect(activityItems([row("tx.confirmed", {})])[0].outcome).toBe("info");
  });
  it("preserves an on-chain rejection even if a precheck also blocked it", () => {
    const entries = activityItems([created, row("decision.precheck", { allow: false }), row("tx.rejected", { reasonCode: "SPEND_CAP_EXCEEDED" }, { chainSignature: "failed" })]);
    expect(entries).toHaveLength(1); expect(entries[0].outcome).toBe("rejected");
  });
});
const now = Date.parse("2026-10-25T00:00:00Z");
const grant = { id: "g1", owner: { wallet: "alice" }, agentVersion: { id: "a1", name: "Agent" }, revoked: false, spentUnits: "800000000000000000", policyVersion: { spendCapUnits: "1000000000000000000", expiresAt: new Date(now + 3600_000).toISOString() } } as Grant;
describe("verified attention items", () => {
  it("uses exact integer thresholds and only this wallet's records", () => {
    expect(attentionItems("bob", [grant], [], now)).toEqual([]);
    expect(attentionItems("alice", [grant], [], now).map(i => i.kind)).toEqual(["expiry", "budget"]);
    expect(attentionItems("alice", [{ ...grant, spentUnits: "799999999999999999" }], [], now).map(i => i.kind)).toEqual(["expiry"]);
    expect(attentionItems("alice", [{ ...grant, revoked: true }], [], now)).toEqual([]);
  });
  it("clears failed-run attention after a newer successful/stopped run", () => {
    const failed = { id: "r1", grantId: "g1", status: "failed", mode: "scripted", startedAt: "2026-10-24T00:00:00Z" };
    expect(attentionItems("alice", [grant], [failed], now).at(-1)).toMatchObject({ kind: "failed", runId: "r1" });
    expect(attentionItems("alice", [grant], [failed, { ...failed, id: "r2", status: "stopped", startedAt: "2026-10-25T00:00:00Z" }], now).some(i => i.kind === "failed")).toBe(false);
  });
});
describe("agent relation and eligibility", () => {
  const agent = { id: "a1", publisherWallet: "publisher" };
  const listing = { id: "l1", agentVersionId: "a1", developerWallet: "publisher", priceLamports: "5000" } as Listing;
  const hire = { ownerWallet: "alice", listing, endsAt: new Date(now + 3600_000).toISOString() } as Hire;
  it("separates own, rented, expired and rental-required builds", () => {
    expect(agentAccess(agent, "publisher", [], [listing], now)).toBe("owned");
    expect(agentAccess(agent, "alice", [hire], [listing], now)).toBe("rented");
    expect(agentAccess(agent, "alice", [{ ...hire, endsAt: new Date(now).toISOString() }], [listing], now)).toBe("expired");
    expect(agentAccess(agent, "bob", [hire], [listing], now)).toBe("rent-required");
    expect(agentAccess(agent, "alice", [{ ...hire, endsAt: new Date(now).toISOString() }], [], now)).toBe("expired");
    expect(agentAccess({ ...agent, listings: [{ ...listing, status: "withdrawn" }] }, "bob", [], [], now)).toBe("rent-required");
  });
  it("requires a recorded relation, including expired rentals; does not use names", () => {
    expect(relatedAgent("a1", "alice", "publisher", [], [hire])).toBe(true); expect(relatedAgent("a1", "bob", "publisher", [grant], [hire])).toBe(false); expect(relatedAgent("a1", "", "publisher", [grant], [hire])).toBe(false);
  });
});
