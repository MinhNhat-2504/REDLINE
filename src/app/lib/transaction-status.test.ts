import { describe, expect, it, vi } from "vitest";
import { confirmReceipt, SettledTransactionError } from "./transaction-status";
const receipt = { signature: "signature", lastValidBlockHeight: "100" };
describe("transaction confirmation", () => {
  it("does not mistake processed for confirmed or expired", async () => {
    const read = vi.fn().mockResolvedValueOnce({ err: null, confirmationStatus: "processed" }).mockResolvedValueOnce({ err: null, confirmationStatus: "confirmed" });
    await confirmReceipt(receipt, read, async () => 101n, async () => {}, 2);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("retains an unknown timeout for checking instead of retrying submission", async () => {
    const read = vi.fn(async () => null);
    await expect(confirmReceipt(receipt, read, async () => 50n, async () => {}, 3)).rejects.toThrow("do not submit again");
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("distinguishes a refusal from an expired unknown transaction", async () => {
    await expect(confirmReceipt(receipt, async () => ({ err: { InstructionError: [0, "failed"] }, confirmationStatus: "confirmed" }), async () => 50n)).rejects.toMatchObject({ outcome: "failed" });
    await expect(confirmReceipt(receipt, async () => null, async () => 101n)).rejects.toBeInstanceOf(SettledTransactionError);
  });
});
