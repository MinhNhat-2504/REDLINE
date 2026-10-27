import { grantScope } from "./pending-grant";
import { isAddressLike } from "../solana/client";

export interface PolicyDraft {
  agentId: string; cap: number; txn: number; dur: number; cool: number;
  dests: string[]; names: string[];
}
export const POLICY_TEMPLATES = [
  { id: "trial", cap: 50, txn: 5, dur: 24, cool: 10 },
  { id: "daily", cap: 500, txn: 50, dur: 24, cool: 6 },
] as const;
const key = (owner: string) => `redline:policy-draft:v1:${grantScope(owner)}`;
export function validDraft(value: unknown): value is PolicyDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as PolicyDraft;
  return typeof d.agentId === "string" && d.agentId.length <= 200 &&
    [[d.cap, 10, 10000], [d.txn, 1, 500], [d.dur, 1, 168], [d.cool, 1, 60]].every(([n, min, max]) => Number.isInteger(n) && n >= min && n <= max) &&
    Array.isArray(d.dests) && d.dests.length > 0 && d.dests.length <= 4 && d.dests.every(a => typeof a === "string" && a.length <= 100) &&
    Array.isArray(d.names) && d.names.length === d.dests.length && d.names.every(n => typeof n === "string" && n.length <= 60);
}
export function readDraft(owner: string): PolicyDraft | null {
  if (!owner) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(key(owner)) ?? "null");
    return saved?.version === 1 && saved.scope === grantScope(owner) && validDraft(saved.value) ? saved.value : null;
  } catch { return null; }
}
export function writeDraft(owner: string, value: PolicyDraft) {
  if (!owner || !validDraft(value)) throw new Error("Invalid draft");
  localStorage.setItem(key(owner), JSON.stringify({ version: 1, scope: grantScope(owner), value }));
}
export function deleteDraft(owner: string) { if (owner) localStorage.removeItem(key(owner)); }
export function recipientError(dests: string[]): "invalid" | "duplicate" | null {
  const addresses = dests.map(a => a.trim());
  if (!addresses.length || addresses.some(a => !isAddressLike(a))) return "invalid";
  return new Set(addresses).size !== addresses.length ? "duplicate" : null;
}
export interface SavedRecipient { address: string; name: string }
const recipientsKey = (owner: string) => `redline:recipients:v1:${grantScope(owner)}`;
export function readRecipients(owner: string): SavedRecipient[] {
  if (!owner) return [];
  try {
    const value = JSON.parse(localStorage.getItem(recipientsKey(owner)) ?? "[]");
    return Array.isArray(value) ? value.filter((r): r is SavedRecipient => r && typeof r.name === "string" && r.name.length <= 60 && typeof r.address === "string" && isAddressLike(r.address)).slice(0, 50) : [];
  } catch { return []; }
}
export function writeRecipients(owner: string, recipients: SavedRecipient[]) {
  if (!owner) throw new Error("Connect a wallet first");
  localStorage.setItem(recipientsKey(owner), JSON.stringify(recipients.slice(0, 50)));
}
