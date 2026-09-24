// Server-side redaction for anonymous readers of the audit trail.
//
// The dashboard already shortened these strings for display, but shortening in
// the browser is decoration: the API was still handing every full wallet
// address, vault PDA and destination to anyone who asked, and a `curl` skipped
// the decoration entirely. Masking has to happen before the bytes leave the
// server or it is not masking.
//
// What stays visible matters as much as what goes. REDLINE's whole claim is
// that a stranger can verify the program refused an over-cap transfer, so
// event types, reason codes, gate numbers, amounts and on-chain signatures are
// kept: a signature is already public on Solana, and without it the evidence
// is unverifiable. What goes is the linkage a stranger has no business
// assembling — which wallet owns which vault, paid whom, how often.

/** Anything shaped like a Solana address, a signature, or a 32–64 char hash. */
const SECRET_LIKE = /\b[1-9A-HJ-NP-Za-km-z]{32,88}\b|\b[0-9a-f]{32,64}\b/g;

/** `4f3a…tgFr` — enough to recognise a value you already know, useless to harvest. */
export function maskValue(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/** Mask every address/signature/hash embedded in a free-text string. */
export function maskText(text: string): string {
  return text.replace(SECRET_LIKE, match => maskValue(match));
}

// Payload keys whose values are identity or linkage rather than evidence.
const IDENTITY_KEYS = new Set([
  "ownerWallet", "owner", "wallet", "reviewerWallet", "developerWallet", "publisherWallet",
  "destination", "vaultPda", "vaultAta", "executor", "executorPubkey", "actorId", "payer", "payee",
]);

// Keys that are internal database ids. Masked so an anonymous reader cannot
// pivot from one event to a whole history, while a reader who already has the
// id (their own grant) can still match it up.
const LINKAGE_KEYS = new Set(["grantId", "listingId", "hireId", "agentVersionId", "runId", "intentId", "vaultId", "ownerId"]);

// Keys whose values are evidence. They still pass through maskText, which
// leaves short codes and numbers alone; listed here so a reader knows what
// an anonymous caller is meant to see.
const EVIDENCE_KEYS = new Set([
  "eventType", "reasonCode", "gate", "message", "allow", "success", "error", "variant", "code",
  "amountUnits", "spentUnits", "transactionCount", "nonce", "slot", "decision", "score", "status",
  "mode", "steps", "rating", "durationHours", "maxTransactions", "cooldownSeconds", "expiresAt",
]);

function redactValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(v => redactValue(key, v));
  // A Date is a timestamp, not a bag of keys: spreading it through the object
  // branch produced `{}` and the dashboard rendered "Invalid Date" for every
  // redacted grant's expiry. Same for anything else with its own toJSON.
  if (value instanceof Date) return value;
  if (typeof value === "object") return redactPayload(value as Record<string, unknown>);
  if (typeof value !== "string") return value;
  if (IDENTITY_KEYS.has(key) || LINKAGE_KEYS.has(key)) return maskValue(value);
  // Evidence keys are not exempt from the scan: a reason code or amount never
  // matches the address/hash pattern, so scanning costs nothing, while an
  // error string that happened to quote an address would otherwise slip out.
  return maskText(value);
}

export const evidenceKeys = EVIDENCE_KEYS;

/** Recursively mask identity and linkage inside one audit payload. */
export function redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) out[key] = redactValue(key, value);
  return out;
}

export interface AuditLike {
  id: string;
  createdAt: Date | string;
  actorType: string;
  actorId: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  chainSignature: string | null;
  payload: Record<string, unknown>;
}

/**
 * The public projection of one audit row.
 *
 * `chainSignature` is left whole on purpose — it is the link an auditor
 * follows to Solana Explorer to check the claim for themselves, and it is
 * already public there. Redacting it would delete the evidence and keep only
 * the assertion, which is the opposite of the point.
 */
export function redactAuditRow<T extends AuditLike>(row: T): T {
  return {
    ...row,
    actorId: maskValue(row.actorId),
    subjectId: maskValue(row.subjectId),
    payload: redactPayload(row.payload),
    redacted: true,
  } as T & { redacted: true };
}

export function redactFeedEvent<T extends { actorType: string; payload: Record<string, unknown>; chainSignature?: string | null }>(event: T): T {
  return { ...event, payload: redactPayload(event.payload), redacted: true } as T & { redacted: true };
}
