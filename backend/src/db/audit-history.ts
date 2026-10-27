import { prisma } from "./client.js";

/** Join through recorded intent ids only. Never infer run membership from time. */
export async function auditHistory(rows: { id: string; subjectType: string; subjectId: string; payload: string }[]) {
  const ids = [...new Set(rows.filter(r => r.subjectType === "intent").map(r => r.subjectId))];
  const intents = ids.length ? await prisma.transactionIntent.findMany({
    where: { id: { in: ids } }, select: { id: true, grantId: true, runId: true, mint: true, amountUnits: true, destination: true },
  }) : [];
  const byId = new Map(intents.map(i => [i.id, i]));
  return rows.map(row => {
    const payload = JSON.parse(row.payload);
    const intent = row.subjectType === "intent" ? byId.get(row.subjectId) : undefined;
    // Check the grant link too, so an unrelated/corrupt audit row cannot gain data.
    const joined = intent && payload.grantId === intent.grantId ? {
      runId: intent.runId, amountUnits: intent.amountUnits.toString(), mint: intent.mint, destination: intent.destination,
    } : {};
    return { ...row, payload: { ...joined, ...payload } };
  });
}
