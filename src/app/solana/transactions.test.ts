import { describe, expect, it, vi } from "vitest";
import { appendTransactionMessageInstructions, createTransactionMessage, fillTransactionMessageProvisoryResourceLimits, generateKeyPairSigner, getCompiledTransactionMessageDecoder, getTransactionDecoder, setTransactionMessageFeePayerSigner, type Address } from "@solana/kit";
import { sendTrackedTransaction } from "./transactions";
import type { AppClient } from "./client";

async function transport() {
  const signer = await generateKeyPairSigner();
  const instruction = { programAddress: "11111111111111111111111111111111" as Address, accounts: [], data: new Uint8Array([0]) };
  const message = appendTransactionMessageInstructions([instruction], fillTransactionMessageProvisoryResourceLimits(setTransactionMessageFeePayerSigner(signer, createTransactionMessage({ version: 0 }))));
  const broadcast = vi.fn((_wire: string, _options: unknown) => ({ send: vi.fn(async () => "rpc-signature") }));
  const client = {
    planTransaction: vi.fn(async () => message),
    rpc: { getLatestBlockhash: () => ({ send: async () => ({ value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100n } }) }),
      simulateTransaction: () => ({ send: async () => ({ value: { err: null, unitsConsumed: 10000n } }) }),
      sendTransaction: broadcast,
      getSignatureStatuses: () => ({ send: async () => ({ value: [{ err: null, confirmationStatus: "confirmed" }] }) }),
      getBlockHeight: () => ({ send: async () => 1n }),
    },
  } as unknown as AppClient;
  return { client, broadcast, instruction };
}

describe("tracked wallet transaction", () => {
  it("uses a real signed wire transaction and persists its signature before broadcast", async () => {
    const { client, broadcast, instruction } = await transport();
    const stages: string[] = [];
    const result = await sendTrackedTransaction(client, [instruction], stage => stages.push(stage), receipt => {
      expect(receipt.signature.length).toBeGreaterThan(60); expect(receipt.lastValidBlockHeight).toBe("100");
      expect(broadcast).not.toHaveBeenCalled();
    });
    expect(result.signature).toBeTruthy();
    expect(broadcast.mock.calls[0][0]).toEqual(expect.any(String));
    const transaction = getTransactionDecoder().decode(Buffer.from(broadcast.mock.calls[0][0], "base64"));
    const compiled = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
    if (compiled.version !== 0) throw new Error("Expected the planned version-0 transaction");
    const compute = compiled.instructions[0].data!;
    expect(compute[0]).toBe(2);
    expect(new DataView(compute.buffer, compute.byteOffset, compute.byteLength).getUint32(1, true)).toBe(11000);
    expect(stages).toEqual(["wallet", "sending", "confirming", "confirmed"]);
  });
  it("does not broadcast when saving the signed receipt fails", async () => {
    const { client, broadcast, instruction } = await transport();
    await expect(sendTrackedTransaction(client, [instruction], () => {}, () => { throw new Error("storage blocked"); })).rejects.toThrow("storage blocked");
    expect(broadcast).not.toHaveBeenCalled();
  });
});
