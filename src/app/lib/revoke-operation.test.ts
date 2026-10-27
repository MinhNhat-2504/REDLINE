import { describe, expect, it, vi } from "vitest";
import { revokeBatches } from "./revoke-operation";
import type { TransactionReceipt } from "./transaction-status";
const batch = [{ id: "one", grantPda: "one-pda", revoked: false }, { id: "two", grantPda: "two-pda", revoked: false }];
function fixture() {
  const saved = new Map<string, TransactionReceipt>();
  return { saved, io: {
    receipt: (id: string) => saved.get(id) ?? null,
    remember: (ids: string[], receipt: TransactionReceipt) => { ids.forEach(id => saved.set(id, receipt)); },
    clear: (id: string) => { saved.delete(id); },
    confirm: vi.fn(async () => {}),
    send: vi.fn(async (_batch: typeof batch, remember: (receipt: TransactionReceipt) => void) => { const receipt = { signature: "revoked-signature", lastValidBlockHeight: "100" }; remember(receipt); return receipt; }),
    record: vi.fn(async (_id: string, _signature: string) => {}),
  } };
}
describe("revocation outcomes", () => {
  it("separates confirmed revocation from failed dashboard sync for each policy", async () => {
    const f = fixture(); f.io.record.mockRejectedValueOnce(new Error("API offline"));
    const result = await revokeBatches([batch], f.io);
    expect(result.map(item => item.status)).toEqual(["unsynced", "revoked"]);
    expect(f.saved.has("one")).toBe(true); expect(f.saved.has("two")).toBe(false);
    await revokeBatches([[batch[0]]], f.io);
    expect(f.io.send).toHaveBeenCalledTimes(1);
  });
  it("keeps unknown signed outcomes and does not send another batch", async () => {
    const f = fixture(); f.io.send.mockImplementationOnce(async (_batch, remember) => {
      remember({ signature: "maybe-sent", lastValidBlockHeight: "100" }); throw new Error("timeout");
    });
    const result = await revokeBatches([batch, [{ id: "three", grantPda: "pda", revoked: false }]], f.io);
    expect(result.map(item => item.status)).toEqual(["unconfirmed", "unconfirmed", "failed"]);
    expect(f.io.send).toHaveBeenCalledTimes(1); expect(f.io.record).not.toHaveBeenCalled();
    await revokeBatches([batch], f.io);
    expect(f.io.send).toHaveBeenCalledTimes(1); expect(f.io.confirm).toHaveBeenCalled();
  });
});
