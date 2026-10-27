import { API_URL } from "./api";
import { PROGRAM_ID } from "../solana/redline";
import { SOLANA_RPC_URL } from "../solana/client";
import type { PendingGrant } from "./grant-operation";
import { paymentAsset } from "./capabilities";

export const PENDING_GRANT_EVENT = "redline:pending-grant";
export const grantScope = (owner: string) => `${API_URL}|${SOLANA_RPC_URL}|${PROGRAM_ID}|${paymentAsset.mint}|${owner}`;
const key = (scope: string) => `redline:pending-grant:v1:${scope}`;
export function readPendingGrant(owner: string): PendingGrant | null {
  if (!owner) return null;
  try {
    const value = JSON.parse(localStorage.getItem(key(grantScope(owner))) ?? "null") as PendingGrant | null;
    return value?.version === 1 && value.scope === grantScope(owner) && value.registration.ownerWallet === owner ? value : null;
  } catch { return null; }
}
export function savePendingGrant(pending: PendingGrant): void {
  try { localStorage.setItem(key(pending.scope), JSON.stringify(pending)); }
  catch { throw new Error("Allow local storage to save recovery information before signing."); }
  window.dispatchEvent(new Event(PENDING_GRANT_EVENT));
}
export function clearPendingGrant(owner: string) {
  localStorage.removeItem(key(grantScope(owner)));
  window.dispatchEvent(new Event(PENDING_GRANT_EVENT));
}
