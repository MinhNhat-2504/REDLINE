export interface ErrorContext {
  area: "policy" | "vault" | "run" | "activity";
  message?: string; code?: string; signature?: string | null;
  outcome?: "blocked" | "rejected" | "pending";
  transactionState?: "unknown" | "confirmed" | "failed" | "expired";
  grantId?: string;
}
export type ExplanationKind = "unknown-transaction" | "transaction-expired" | "confirmed-sync" | "budget" | "expired" | "revoked" | "cooldown" | "scope" | "count" | "replay" | "session" | "cancelled" | "funds" | "network" | "transaction-failed" | "simulation" | "unknown";
export function explanationKind(context: ErrorContext): ExplanationKind {
  const text = `${context.code ?? ""} ${context.message ?? ""}`;
  if (context.transactionState === "confirmed") return "confirmed-sync";
  if (context.signature && context.transactionState === "unknown" || context.outcome === "pending" && context.signature) return "unknown-transaction";
  if (/SPEND_CAP_EXCEEDED/.test(text)) return "budget";
  if (/MAX_TRANSACTIONS|MAX_TX|TX_LIMIT|TX_CAP_EXCEEDED/.test(text)) return "count";
  if (/NONCE_REPLAY/.test(text)) return "replay";
  if (/COOLDOWN/.test(text)) return "cooldown";
  if (/REVOKED/.test(text)) return "revoked";
  if (context.transactionState === "expired" || /transaction.*expired|blockhash.*expired|block height/i.test(text)) return "transaction-expired";
  if (context.code === "EXPIRED" || /rental.*ended|rental.*hour|unsigned policy has expired/i.test(text)) return "expired";
  if (/DESTINATION_NOT_ALLOWED|MINT_NOT_ALLOWED|DEST_NOT_ALLOWED|TOKEN_NOT_ALLOWED/.test(text)) return "scope";
  if (/401|session|unauthenticated|sign in/i.test(text)) return "session";
  if (/4001|user.*reject|wallet.*reject|cancelled|canceled|declined/i.test(text)) return "cancelled";
  if (/insufficient|needs funds|balance.*(empty|zero)|balance.*unavailable/i.test(text)) return "funds";
  if (context.outcome === "rejected" || context.transactionState === "failed") return "transaction-failed";
  if (context.signature && /network|fetch|timeout|timed out|offline|503|502/i.test(text)) return "unknown-transaction";
  if (/network|fetch|timeout|timed out|offline|unreachable|503|502/i.test(text)) return "network";
  if (/simulat|compute|preflight/i.test(text)) return "simulation";
  return "unknown";
}
