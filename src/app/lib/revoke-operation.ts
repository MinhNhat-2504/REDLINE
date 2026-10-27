import { SettledTransactionError, type TransactionReceipt } from "./transaction-status";
import type { StoppableGrant } from "./emergency-stop";

export interface RevocationOutcome { id: string; status: "revoked" | "unsynced" | "unconfirmed" | "failed"; signature?: string; error?: string }
export async function revokeBatches(batches: StoppableGrant[][], io: {
  receipt: (id: string) => TransactionReceipt | null;
  remember: (ids: string[], receipt: TransactionReceipt) => void;
  clear: (id: string) => void;
  confirm: (receipt: TransactionReceipt) => Promise<void>;
  send: (batch: StoppableGrant[], remember: (receipt: TransactionReceipt) => void) => Promise<TransactionReceipt>;
  record: (id: string, signature: string) => Promise<unknown>;
}): Promise<RevocationOutcome[]> {
  const outcomes: RevocationOutcome[] = [];
  for (const batch of batches) {
    const pending = new Map<string, { receipt: TransactionReceipt | null; grants: StoppableGrant[] }>();
    for (const grant of batch) {
      const receipt = io.receipt(grant.id), key = receipt?.signature ?? "unsigned";
      const group = pending.get(key) ?? { receipt, grants: [] }; group.grants.push(grant); pending.set(key, group);
    }
    // Check old signatures before making any fresh wallet request.
    const groups = [...pending.values()].sort((a, b) => Number(Boolean(b.receipt)) - Number(Boolean(a.receipt)));
    let unsettled = false;
    for (const group of groups) {
      let receipt = group.receipt;
      try {
        if (receipt) await io.confirm(receipt);
        else {
          if (unsettled) throw new Error("Check the earlier revocation before signing another batch.");
          receipt = await io.send(group.grants, value => io.remember(group.grants.map(g => g.id), value));
        }
      } catch (error) {
        const saved = receipt ?? io.receipt(group.grants[0].id);
        const failed = error instanceof SettledTransactionError && error.outcome === "failed" || !saved;
        unsettled = true;
        for (const grant of group.grants) {
          if (failed) io.clear(grant.id);
          outcomes.push({ id: grant.id, status: failed ? "failed" : "unconfirmed", signature: saved?.signature, error: String(error) });
        }
        continue;
      }
      for (const grant of group.grants) {
        try { await io.record(grant.id, receipt.signature); io.clear(grant.id); outcomes.push({ id: grant.id, status: "revoked", signature: receipt.signature }); }
        catch (error) { outcomes.push({ id: grant.id, status: "unsynced", signature: receipt.signature, error: String(error) }); }
      }
    }
    if (unsettled) {
      // Do not open more wallet requests while the previous batch is unresolved.
      const handled = new Set(outcomes.map(item => item.id));
      for (const grant of batches.flat()) if (!handled.has(grant.id)) outcomes.push({ id: grant.id, status: "failed", error: "Not attempted; check the earlier batch first." });
      break;
    }
  }
  return outcomes;
}
