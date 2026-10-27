import type { AuditRow } from "./api";
export type ActivityOutcome = "confirmed" | "blocked" | "rejected" | "pending" | "info";
export interface ActivityItem { row: AuditRow; runId: string | null; grantId: string | null; outcome: ActivityOutcome; amountUnits: string | null; mint: string | null; destination: string | null; reason: string | null }
const str = (value: unknown) => typeof value === "string" ? value : null;
export function activityItems(rows: AuditRow[]): ActivityItem[] {
  const intents = new Map(rows.filter(r => r.eventType === "intent.created").map(r => [r.subjectId, r]));
  const settled = new Set(rows.filter(r => r.subjectType === "intent" && ["tx.confirmed", "tx.rejected"].includes(r.eventType)).map(r => r.subjectId));
  const signatures = new Set(rows.filter(r => r.eventType === "tx.confirmed" && r.chainSignature).map(r => r.chainSignature));
  return rows.filter(r => !(r.subjectType === "intent" && settled.has(r.subjectId) && ["intent.created", "decision.precheck"].includes(r.eventType)) &&
    !(r.eventType === "decision.precheck" && r.payload.allow === true && intents.has(r.subjectId)) &&
    !(r.eventType === "intent.created" && rows.some(d => d.subjectId === r.subjectId && d.eventType === "decision.precheck" && d.payload.allow === false)) &&
    !(r.eventType === "chain.policy_decision" && signatures.has(r.chainSignature))).map(row => {
    const source = row.subjectType === "intent" ? intents.get(row.subjectId)?.payload : undefined;
    const p = row.payload;
    const outcome: ActivityOutcome = row.chainSignature && ["tx.confirmed", "chain.policy_decision"].includes(row.eventType) ? "confirmed"
      : ["tx.rejected", "chain.tx_failed"].includes(row.eventType) ? "rejected"
      : row.eventType === "decision.precheck" && p.allow === false ? "blocked"
      : ["intent.created", "decision.precheck"].includes(row.eventType) ? "pending" : "info";
    return { row, outcome, runId: str(p.runId) ?? str(source?.runId) ?? (row.subjectType === "run" ? row.subjectId : null),
      grantId: str(p.grantId) ?? str(source?.grantId) ?? (row.subjectType === "grant" ? row.subjectId : null),
      amountUnits: str(p.amountUnits) ?? str(source?.amountUnits), mint: str(p.mint) ?? str(source?.mint),
      destination: str(p.destination) ?? str(source?.destination), reason: str(p.reasonCode) };
  }).sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt));
}
