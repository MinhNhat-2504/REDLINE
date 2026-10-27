import { createHash } from "node:crypto";
import { prisma } from "./client.js";
import { feed } from "../feed.js";

export type ActorType = "owner" | "agent" | "admin" | "chain" | "system";

// Append-only audit trail. Every hand-off in the ERD writes one row here, and
// the SSE feed forwards it so the dashboard shows the same thing an auditor
// would read back later.
export type AuditInput = {
  actorType: ActorType;
  actorId: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  payload: Record<string, unknown>;
  chainSignature?: string;
};

export async function recordAudit(input: AuditInput, db: Pick<typeof prisma, "auditEvent"> = prisma) {
  const payload = JSON.stringify(input.payload, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return db.auditEvent.create({
    data: {
      actorType: input.actorType,
      actorId: input.actorId,
      eventType: input.eventType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      payload,
      payloadHash: createHash("sha256").update(payload).digest("hex"),
      chainSignature: input.chainSignature,
    },
  });
}

export function publishAudit(row: { id: string; createdAt: Date; eventType: string; actorType: string; chainSignature: string | null }, input: AuditInput) {
  feed.publish(input.subjectType === "grant" ? input.subjectId : (input.payload.grantId as string | undefined), {
    id: row.id,
    at: row.createdAt.toISOString(),
    eventType: row.eventType,
    actorType: row.actorType,
    payload: input.payload,
    chainSignature: row.chainSignature,
  });
}

export async function audit(input: AuditInput) {
  const row = await recordAudit(input);
  publishAudit(row, input);
  return row;
}
