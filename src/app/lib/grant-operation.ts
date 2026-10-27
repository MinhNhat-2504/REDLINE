import type { api } from "./api";
import { SettledTransactionError, type TransactionReceipt } from "./transaction-status";

export type GrantRegistration = Parameters<typeof api.createGrant>[0];
export interface PendingGrant {
  version: 1;
  scope: string;
  expiresAt: number;
  executor: string;
  registration: GrantRegistration;
  vaultReceipt?: TransactionReceipt;
  grantReceipt?: TransactionReceipt;
}
export type GrantPhase = "signin" | "checking" | "vault" | "funding" | "wallet" | "sending" | "confirming" | "confirmed" | "registering";

export interface GrantOperationIO {
  assertOwner: () => void;
  save: (pending: PendingGrant) => void;
  phase: (phase: GrantPhase) => void;
  exists: (address: string) => Promise<boolean>;
  confirm: (receipt: TransactionReceipt) => Promise<void>;
  initVault: (remember: (receipt: TransactionReceipt) => void) => Promise<TransactionReceipt>;
  balance: () => Promise<string | null>;
  fund: () => Promise<unknown>;
  create: (pending: PendingGrant, remember: (receipt: TransactionReceipt) => void) => Promise<TransactionReceipt>;
  register: (registration: GrantRegistration) => Promise<{ grant: { id: string } }>;
}

/** Durable, resumable operation: a stored receipt is checked, never broadcast again. */
export async function continueGrantOperation(initial: PendingGrant, io: GrantOperationIO): Promise<string> {
  let pending = initial;
  const save = (next: PendingGrant) => { io.assertOwner(); io.save(next); pending = next; };
  const confirm = async (receipt: TransactionReceipt, field: "vaultReceipt" | "grantReceipt", account: string) => {
    io.phase("confirming");
    try { await io.confirm(receipt); }
    catch (error) {
      if (error instanceof SettledTransactionError && !await io.exists(account)) {
        // A later explicit retry can sign the SAME PDA, never a fresh policy.
        save({ ...pending, [field]: undefined });
      }
      throw error;
    }
  };
  io.assertOwner();
  const { ownerWallet, vaultPda, grantPda } = pending.registration;
  if (!vaultPda || !grantPda) throw new Error("Recovery information is incomplete.");

  // Once the grant is signed, registration no longer depends on funding or current rental eligibility.
  if (!pending.grantReceipt) {
    if (pending.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("This unsigned policy has expired. Discard it and review a new policy.");
    io.phase("vault");
    const vaultExists = await io.exists(vaultPda);
    if (pending.vaultReceipt && !vaultExists) await confirm(pending.vaultReceipt, "vaultReceipt", vaultPda);
    if (!vaultExists) {
      if (pending.vaultReceipt) throw new Error("The vault is confirmed but not readable yet. Check status again.");
      io.assertOwner();
      try { await io.initVault(receipt => save({ ...pending, vaultReceipt: receipt })); }
      catch (error) {
        if (error instanceof SettledTransactionError && error.outcome === "failed" && pending.vaultReceipt && !await io.exists(vaultPda)) save({ ...pending, vaultReceipt: undefined });
        throw error;
      }
    }
    io.phase("funding");
    const balance = await io.balance();
    if (balance === null) throw new Error("The vault balance is unavailable. Refresh before continuing.");
    if (BigInt(balance) === 0n) { io.assertOwner(); await io.fund(); }
    if (await io.exists(grantPda)) throw new Error("This policy account already exists. Check its recorded transaction before continuing.");
    io.assertOwner();
    try { await io.create(pending, receipt => save({ ...pending, grantReceipt: receipt })); }
    catch (error) {
      if (error instanceof SettledTransactionError && error.outcome === "failed" && pending.grantReceipt && !await io.exists(grantPda)) save({ ...pending, grantReceipt: undefined });
      throw error;
    }
  } else {
    await confirm(pending.grantReceipt, "grantReceipt", grantPda);
  }
  io.assertOwner();
  if (!pending.grantReceipt) throw new Error("The policy transaction has not been signed.");
  io.phase("registering");
  const result = await io.register({ ...pending.registration, ownerWallet, createSignature: pending.grantReceipt.signature });
  return result.grant.id;
}

const active = new Set<string>();
export async function withGrantLock<T>(scope: string, work: () => Promise<T>): Promise<T> {
  const execute = async () => {
    if (active.has(scope)) throw new Error("A policy operation is already in progress. Wait for it to finish.");
    active.add(scope);
    try { return await work(); } finally { active.delete(scope); }
  };
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(`redline:grant:${scope}`, { ifAvailable: true }, lock => {
      if (!lock) throw new Error("A policy operation is already open in another tab.");
      return execute();
    });
  }
  return execute();
}
