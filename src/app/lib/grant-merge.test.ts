import { describe, expect, it } from "vitest";
import { isSettled, mergeGrants } from "./grant-merge";
import type { Grant, OnchainGrant } from "./api";

// What the panel did before: when the per-grant chain read failed it showed the
// bare database row, so every other refresh swapped on-chain numbers for
// database numbers. These pin what a missing or lagging read is allowed to do.

const chain = (over: Partial<OnchainGrant> = {}): OnchainGrant => ({
  active: true, spentUnits: "300000000", transactionCount: 3, nextNonce: 3,
  spendCapUnits: "500000000", maxTransactions: 5, cooldownSeconds: 0, expiresAt: 1_800_000_000,
  allowedMints: [], allowedDestinations: [], ...over,
});
const grant = (over: Partial<Grant> = {}): Grant => ({
  id: "g1", grantPda: "pda", agentId: "a", executorPubkey: "e", createSignature: null,
  spentUnits: "0", transactionCount: 0, nextNonce: 0, revoked: false, createdAt: "2026-09-19T00:00:00Z", lastExecutionAt: null,
  agentVersion: {} as Grant["agentVersion"], policyVersion: {} as Grant["policyVersion"], owner: { wallet: "w" }, ...over,
});

describe("mergeGrants", () => {
  it("keeps the last on-chain state when a refresh comes back without it", () => {
    // A failed chain read is not evidence that the chain state went away.
    const merged = mergeGrants([grant({ onchain: chain() })], [grant({ onchain: undefined })]);
    expect(merged[0].onchain?.spentUnits).toBe("300000000");
  });

  it("does not let a lagging RPC node run the counters backwards", () => {
    // The program only increments these. A lower number is a stale node.
    const merged = mergeGrants(
      [grant({ onchain: chain({ spentUnits: "300000000", transactionCount: 3, nextNonce: 3 }) })],
      [grant({ onchain: chain({ spentUnits: "200000000", transactionCount: 2, nextNonce: 2 }) })],
    );
    expect(merged[0].onchain).toMatchObject({ spentUnits: "300000000", transactionCount: 3, nextNonce: 3 });
  });

  it("still moves forward when the chain does", () => {
    const merged = mergeGrants(
      [grant({ onchain: chain({ spentUnits: "300000000", transactionCount: 3 }) })],
      [grant({ onchain: chain({ spentUnits: "400000000", transactionCount: 4 }) })],
    );
    expect(merged[0].onchain).toMatchObject({ spentUnits: "400000000", transactionCount: 4 });
  });

  it("compares spend as integers, not strings", () => {
    // "9" > "10" as strings; 9 units is not more than 10.
    const merged = mergeGrants([grant({ onchain: chain({ spentUnits: "9" }) })], [grant({ onchain: chain({ spentUnits: "10" }) })]);
    expect(merged[0].onchain?.spentUnits).toBe("10");
  });

  it("never un-revokes a grant", () => {
    const merged = mergeGrants(
      [grant({ revoked: true, onchain: chain({ active: false }) })],
      [grant({ revoked: false, onchain: chain({ active: true }) })],
    );
    expect(merged[0].revoked).toBe(true);
    expect(merged[0].onchain?.active).toBe(false);
  });

  it("keeps the run list when a row arrives without one", () => {
    const runs = [{ id: "r1", mode: "scripted", status: "running", startedAt: "2026-09-19T00:00:00Z" }];
    expect(mergeGrants([grant({ runs })], [grant({ runs: undefined })])[0].runs).toEqual(runs);
    // ...but an explicit empty list means the run really ended.
    expect(mergeGrants([grant({ runs })], [grant({ runs: [] })])[0].runs).toEqual([]);
  });

  it("lets the API decide which grants exist and in what order", () => {
    const merged = mergeGrants([grant({ id: "old" }), grant({ id: "kept" })], [grant({ id: "new" }), grant({ id: "kept" })]);
    expect(merged.map(g => g.id)).toEqual(["new", "kept"]);
  });
});

describe("isSettled", () => {
  it("marks a revoked grant with known chain state as not worth re-reading", () => {
    expect(isSettled(grant({ revoked: true, onchain: chain({ active: false }) }))).toBe(true);
  });
  it("still reads a revoked grant whose chain state was never seen", () => {
    expect(isSettled(grant({ revoked: true }))).toBe(false);
  });
  it("keeps reading a live grant", () => {
    expect(isSettled(grant({ onchain: chain() }))).toBe(false);
  });
});
