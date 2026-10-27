import { describe, expect, it, vi } from "vitest";
import { continueGrantOperation, withGrantLock, type GrantOperationIO, type PendingGrant } from "./grant-operation";
import { SettledTransactionError } from "./transaction-status";

function fixture() {
  let pending: PendingGrant = { version: 1, scope: "owner-devnet", expiresAt: Math.floor(Date.now() / 1000) + 86400, executor: "executor",
    registration: { ownerWallet: "owner", agentVersionId: "agent", agentId: "00".repeat(16), vaultPda: "vault", grantPda: "fixed-policy", createSignature: "",
      policy: { agentName: "Test", strategy: "payments", tokens: ["USDC"], allowedMints: ["mint"], allowedDestinations: ["recipient"], spendCapUsdc: 100, maxTransactions: 5, durationHours: 24, cooldownMinutes: 1 } } };
  let vault = false, balance = "0";
  const io: GrantOperationIO = {
    assertOwner: vi.fn(), phase: vi.fn(), save: value => { pending = value; },
    exists: vi.fn(async address => address === "vault" && vault), confirm: vi.fn(async () => {}),
    initVault: vi.fn(async remember => { const receipt = { signature: "vault-sig", lastValidBlockHeight: "100" }; remember(receipt); vault = true; return receipt; }),
    balance: vi.fn(async () => balance), fund: vi.fn(async () => { balance = "1000000000"; }),
    create: vi.fn(async (_saved, remember) => { const receipt = { signature: "policy-sig", lastValidBlockHeight: "200" }; remember(receipt); return receipt; }),
    register: vi.fn(async () => ({ grant: { id: "registered-policy" } })),
  };
  return { get pending() { return pending; }, io };
}

describe("resumable policy creation", () => {
  it("registers the same reviewed address and saved signature", async () => {
    const f = fixture();
    expect(await continueGrantOperation(f.pending, f.io)).toBe("registered-policy");
    expect(f.io.register).toHaveBeenCalledWith(expect.objectContaining({ grantPda: "fixed-policy", createSignature: "policy-sig" }));
    expect(f.io.initVault).toHaveBeenCalledTimes(1);
    expect(f.io.fund).toHaveBeenCalledTimes(1);
  });
  it("only retries registration after a confirmed transaction and API interruption", async () => {
    const f = fixture();
    vi.mocked(f.io.register).mockRejectedValueOnce(new Error("API connection lost"));
    await expect(continueGrantOperation(f.pending, f.io)).rejects.toThrow("connection lost");
    await continueGrantOperation(f.pending, f.io);
    expect(f.io.create).toHaveBeenCalledTimes(1);
    expect(f.io.initVault).toHaveBeenCalledTimes(1);
    expect(f.io.fund).toHaveBeenCalledTimes(1);
    expect(f.io.register).toHaveBeenCalledTimes(2);
  });
  it("checks a saved signed transaction after an unknown broadcast outcome", async () => {
    const f = fixture();
    vi.mocked(f.io.create).mockImplementationOnce(async (_saved, remember) => {
      remember({ signature: "uncertain-sig", lastValidBlockHeight: "200" }); throw new Error("network timeout");
    });
    await expect(continueGrantOperation(f.pending, f.io)).rejects.toThrow("timeout");
    await continueGrantOperation(f.pending, f.io);
    expect(f.io.create).toHaveBeenCalledTimes(1);
    expect(f.io.confirm).toHaveBeenCalledWith({ signature: "uncertain-sig", lastValidBlockHeight: "200" });
    expect(f.io.register).toHaveBeenCalledWith(expect.objectContaining({ createSignature: "uncertain-sig" }));
  });
  it("keeps a confirmed vault after wallet rejection and retries the same policy", async () => {
    const f = fixture();
    vi.mocked(f.io.create).mockRejectedValueOnce(new Error("wallet rejected"));
    await expect(continueGrantOperation(f.pending, f.io)).rejects.toThrow("wallet rejected");
    await continueGrantOperation(f.pending, f.io);
    expect(f.io.initVault).toHaveBeenCalledTimes(1);
    expect(f.io.create).toHaveBeenLastCalledWith(expect.objectContaining({ registration: expect.objectContaining({ grantPda: "fixed-policy" }) }), expect.any(Function));
  });
  it("does not auto-submit again when confirmation expires", async () => {
    const f = fixture();
    await continueGrantOperation(f.pending, f.io);
    vi.mocked(f.io.confirm).mockRejectedValue(new SettledTransactionError("expired", "expired"));
    await expect(continueGrantOperation(f.pending, f.io)).rejects.toThrow("expired");
    expect(f.pending.grantReceipt).toBeUndefined();
    expect(f.pending.registration.grantPda).toBe("fixed-policy");
    expect(f.io.create).toHaveBeenCalledTimes(1);
  });
  it("stops when storage or ownership checks fail before signing", async () => {
    const f = fixture(); f.io.assertOwner = () => { throw new Error("wallet changed"); };
    await expect(continueGrantOperation(f.pending, f.io)).rejects.toThrow("wallet changed");
    expect(f.io.create).not.toHaveBeenCalled(); expect(f.io.initVault).not.toHaveBeenCalled();
  });
  it("rejects a duplicate operation while the first is pending", async () => {
    let finish!: () => void;
    const first = withGrantLock("one-owner", () => new Promise<void>(resolve => { finish = resolve; }));
    await expect(withGrantLock("one-owner", async () => {})).rejects.toThrow("already");
    finish(); await first;
    await expect(withGrantLock("one-owner", async () => "ok")).resolves.toBe("ok");
  });
});
