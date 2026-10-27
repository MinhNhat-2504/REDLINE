import { describe, expect, it } from "vitest";
import { setupProgress } from "./onboarding";
import type { Grant, VaultView } from "./api";

const now = Date.parse("2026-10-25T00:00:00Z");
const grant = (overrides: Partial<Grant> = {}): Grant => ({
  id: "grant", grantPda: "pda", agentId: "agent", executorPubkey: "executor", createSignature: null,
  spentUnits: "0", transactionCount: 0, nextNonce: 0, revoked: false,
  createdAt: "2026-10-24T00:00:00Z", lastExecutionAt: null,
  agentVersion: { id: "agent", name: "Agent", version: "1", strategy: "payments", agentHash: "hash" },
  owner: { wallet: "owner" },
  policyVersion: { policyHash: "hash", spendCapUnits: "500000000", maxTransactions: 5, cooldownSeconds: 60, expiresAt: "2026-10-26T00:00:00Z", allowedMints: "[]", allowedDests: "[]" },
  ...overrides,
});
const vault: VaultView = { owner: "owner", vaultPda: "pda", vaultAta: "ata", mint: "mint", exists: true, balanceUnits: "1000000000" };

describe("setup progress", () => {
  it("requires verified ownership even when records are available", () => {
    expect(setupProgress("owner", false, [grant()], vault, now).done).toEqual([false, false, false, false]);
    expect(setupProgress("", true, [grant()], vault, now).done).toEqual([false, false, false, false]);
  });

  it("never advances from another wallet's policy, vault or run", () => {
    const running = grant({ runs: [{ id: "run", mode: "scripted", status: "running", startedAt: "2026-10-24T00:00:00Z" }] });
    expect(setupProgress("someone-else", true, [running], vault, now).done).toEqual([true, false, false, false]);
  });

  it("requires a current policy instead of a revoked or expired one", () => {
    const records = [grant({ revoked: true }), grant({ expiresAt: new Date(now).toISOString() }), grant({ expiresAt: "2026-10-24T00:00:00Z" })];
    expect(setupProgress("owner", true, records, vault, now).done).toEqual([true, false, true, false]);
  });

  it("does not report funding for missing or empty vaults", () => {
    for (const view of [null, { ...vault, exists: false }, { ...vault, balanceUnits: "0" }, { ...vault, balanceUnits: null }]) {
      expect(setupProgress("owner", true, [grant()], view, now).done).toEqual([true, true, false, false]);
    }
  });

  it("never treats a run status alone as a confirmed payment", () => {
    for (const status of ["failed", "running", "completed"]) {
      const record = grant({ runs: [{ id: "run", mode: "scripted", status, startedAt: "2026-10-24T00:00:00Z" }] });
      expect(setupProgress("owner", true, [record], vault, now).done).toEqual([true, true, true, false]);
    }
  });
  it("keeps first-use completion after revocation, expiry and an empty vault", () => {
    const record = grant({ revoked: true, expiresAt: "2026-10-24T00:00:00Z", transactionCount: 1, spentUnits: "1", runs: [{ id: "run", mode: "scripted", status: "stopped", startedAt: "2026-10-24T00:00:00Z" }] });
    const result = setupProgress("owner", true, [record], { ...vault, balanceUnits: "0" }, now);
    expect(result.done).toEqual([true, true, true, true]); expect(result.readiness).toBe("policy");
  });
  it("does not mark an exhausted policy as ready to start", () => {
    const result = setupProgress("owner", true, [grant({ transactionCount: 5 })], vault, now);
    expect(result.readiness).toBe("policy"); expect(result.active).toHaveLength(0);
  });
});
