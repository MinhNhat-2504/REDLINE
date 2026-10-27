import type { ActivityItem } from "./activity";
import type { Grant } from "./api";

export interface ReportMetadata {
  owner: string; generatedAt: string; verifiedAt: string; timezone: string;
  network: string; api: string; program: string; mint: string;
  filters: { grant: string; run: string; agent: string; outcome: string; from: string; to: string; search: string };
  sourceEventCount: number; sourceEventLimit: number;
}
export function activityReport(items: ActivityItem[], grants: Grant[], metadata: ReportMetadata) {
  if (!metadata.owner || !items.length) throw new Error("No verified wallet records to export");
  const own = new Map(grants.filter(g => g.owner.wallet === metadata.owner).map(g => [g.id, g]));
  if (items.some(i => i.row.redacted || (i.grantId ? !own.has(i.grantId) : i.row.actorId !== metadata.owner))) throw new Error("Only this wallet's unredacted records can be exported");
  return { schemaVersion: 1, ...metadata, scope: "filtered_recent_window", rowCount: items.length, rows: items.map(item => ({
    eventId: item.row.id, recordedAt: item.row.createdAt, eventType: item.row.eventType, outcome: item.outcome,
    grantId: item.grantId, runId: item.runId, agentId: item.grantId ? own.get(item.grantId)?.agentVersion.id ?? null : null,
    agentName: item.grantId ? own.get(item.grantId)?.agentVersion.name ?? null : null,
    amountUnits: item.amountUnits, mint: item.mint, destination: item.destination, reasonCode: item.reason,
    signature: item.row.chainSignature,
  })) };
}
/** Quoting alone does not stop spreadsheet formulas; neutralize their prefixes. */
export function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const safe = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportCsv(report: ReturnType<typeof activityReport>): string {
  const rows = report.rows.map(row => ({
    report_owner: report.owner, report_generated_at: report.generatedAt, data_verified_at: report.verifiedAt,
    timezone: report.timezone, network: report.network, api: report.api, program: report.program,
    scope: report.scope, source_event_count: report.sourceEventCount, source_event_limit: report.sourceEventLimit,
    filters: JSON.stringify(report.filters), ...row,
  }));
  return '\uFEFF' + [Object.keys(rows[0]), ...rows.map(Object.values)].map(row => row.map(csvCell).join(",")).join("\r\n");
}
