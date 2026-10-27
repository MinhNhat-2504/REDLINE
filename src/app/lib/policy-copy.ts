import { grantExpiresAt, type Grant } from "./api";
import { paymentAsset } from "./capabilities";
import { recipientError, validDraft, type PolicyDraft, type SavedRecipient } from "./policy-draft";

export type CopyProblem = "owner" | "asset" | "scope" | "limits";
/** Copies configuration only. Receipts, counters, hire ids and authority never transfer. */
export function copyPolicy(grant: Grant, owner: string, recipients: SavedRecipient[] = [], mint = paymentAsset.mint): { draft: PolicyDraft } | { problem: CopyProblem } {
  if (!owner || grant.owner.wallet !== owner) return { problem: "owner" };
  let dests: unknown, mints: unknown;
  try { dests = JSON.parse(grant.policyVersion.allowedDests); mints = JSON.parse(grant.policyVersion.allowedMints); }
  catch { return { problem: "scope" }; }
  if (!mint || !Array.isArray(mints) || mints.length !== 1 || mints[0] !== mint) return { problem: "asset" };
  if (!Array.isArray(dests) || dests.length > 4 || dests.some(d => typeof d !== "string") || recipientError(dests)) return { problem: "scope" };
  const p = grant.policyVersion;
  if (!/^\d+$/.test(p.spendCapUnits) || BigInt(p.spendCapUnits) % 1_000_000n !== 0n || BigInt(p.spendCapUnits) > 10_000_000_000n || p.cooldownSeconds % 60 !== 0) return { problem: "limits" };
  const duration = (grantExpiresAt(grant) - Date.parse(grant.createdAt)) / 3600_000;
  if (!Number.isFinite(duration) || duration <= 0 || duration > 168) return { problem: "limits" };
  const draft: PolicyDraft = {
    agentId: grant.agentVersion.id, cap: Number(BigInt(p.spendCapUnits) / 1_000_000n), txn: p.maxTransactions,
    dur: Math.ceil(duration), cool: p.cooldownSeconds / 60, dests,
    names: dests.map(address => recipients.find(r => r.address === address)?.name ?? ""),
  };
  return validDraft(draft) ? { draft } : { problem: "limits" };
}
