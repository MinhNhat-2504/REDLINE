export type TransactionStage = "wallet" | "sending" | "confirming" | "confirmed";
export interface TransactionReceipt { signature: string; lastValidBlockHeight: string }
export class SettledTransactionError extends Error {
  constructor(public readonly outcome: "failed" | "expired", message: string) { super(message); }
}

/** A timeout is unknown, never a reason to submit another transaction. */
export async function confirmReceipt(
  receipt: TransactionReceipt,
  read: () => Promise<{ err: unknown; confirmationStatus: string | null } | null>,
  blockHeight: () => Promise<bigint>,
  pause: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 1_000)),
  attempts = 40,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const status = await read();
    if (status?.err) throw new SettledTransactionError("failed", "The transaction was refused. Review the details before trying again.");
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
    // A processed transaction can still confirm, even after its blockhash expires.
    if (!status && await blockHeight() > BigInt(receipt.lastValidBlockHeight)) {
      throw new SettledTransactionError("expired", "The transaction window expired. Check the account before signing again.");
    }
    if (i + 1 < attempts) await pause();
  }
  throw new Error("Confirmation is taking longer than expected. Check status; do not submit again.");
}
