import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db/client.js";
import { feed, type FeedEvent } from "../feed.js";
import { callerWallet, identityEnforced } from "../auth.js";
import { redactAuditRow, redactFeedEvent } from "../redact.js";
import { json } from "./json.js";

const ANON_LIMIT = 50;

/** The grant ids this wallet owns — the scope of "my audit trail". */
async function grantIdsFor(wallet: string): Promise<string[]> {
  const grants = await prisma.agentGrant.findMany({ where: { owner: { wallet } }, select: { id: true } });
  return grants.map(g => g.id);
}

export async function auditRoutes(app: FastifyInstance) {
  // Everything that happened for a grant, oldest first, with explorer-ready
  // signatures. This is the page a treasury operator pays for — and precisely
  // because of that it cannot be the page a stranger reads to harvest wallets.
  //
  // Two views, one route:
  //   signed in  → your own grants, in full
  //   anonymous  → a short recent window, redacted (see src/redact.ts)
  //
  // Anonymous readers keep the part that makes REDLINE checkable: the event
  // type, the reason code, the amount and the on-chain signature. They lose
  // the part that only helps someone building a map of who runs what.
  app.get("/audit", async (req) => {
    const { grant, limit } = req.query as { grant?: string; limit?: string };
    const caller = callerWallet(req);
    const enforced = identityEnforced();

    // Open/mock deployments keep the old unscoped behaviour so scripts/demo.sh
    // and the local six-beat run still print a full trail.
    if (!enforced) {
      const take = Math.min(Number(limit ?? 200), 1000);
      const where = grant
        ? { OR: [{ subjectType: "grant", subjectId: grant }, { payload: { contains: `"grantId":"${grant}"` } }] }
        : {};
      const rows = await prisma.auditEvent.findMany({ where, orderBy: { createdAt: "asc" }, take });
      return json(rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })));
    }

    if (!caller) {
      // No session: a redacted recent window. Not filterable by grant, because
      // "show me everything about this grant" is exactly the enumeration this
      // guards against.
      const rows = await prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: ANON_LIMIT });
      return json(rows.reverse().map(r => redactAuditRow({ ...r, payload: JSON.parse(r.payload) })));
    }

    const owned = await grantIdsFor(caller);
    if (grant && !owned.includes(grant)) {
      // Asking about someone else's grant answers with the same redacted view
      // a stranger gets, rather than a 403 that would confirm it exists.
      const rows = await prisma.auditEvent.findMany({
        where: { OR: [{ subjectType: "grant", subjectId: grant }, { payload: { contains: `"grantId":"${grant}"` } }] },
        orderBy: { createdAt: "asc" }, take: ANON_LIMIT,
      });
      return json(rows.map(r => redactAuditRow({ ...r, payload: JSON.parse(r.payload) })));
    }

    const take = Math.min(Number(limit ?? 200), 1000);
    const scope = grant ? [grant] : owned;
    const rows = scope.length
      ? await prisma.auditEvent.findMany({
          where: {
            OR: [
              { subjectType: "grant", subjectId: { in: scope } },
              ...scope.map(id => ({ payload: { contains: `"grantId":"${id}"` } })),
              // Events the caller authored that are not grant-scoped at all
              // (signing in, publishing, renting, reviewing) — only when no
              // single grant was asked for, so a per-grant view stays per-grant.
              ...(grant ? [] : [{ actorId: caller }]),
            ],
          },
          orderBy: { createdAt: "asc" }, take,
        })
      : await prisma.auditEvent.findMany({ where: { actorId: caller }, orderBy: { createdAt: "asc" }, take });
    return json(rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })));
  });

  // Server-sent events. `*` streams every grant.
  //
  // The stream carries the same information as the audit table, so it gets the
  // same rule: an anonymous subscriber to `*` used to watch every owner's
  // wallet, vault and destination scroll past live.
  app.get("/grants/:id/feed", async (req, reply) => {
    const { id } = req.params as { id: string };
    const caller = callerWallet(req);
    const enforced = identityEnforced();

    let redact = false;
    if (enforced) {
      if (!caller) redact = true;
      else if (id === "*") {
        // A signed-in wallet watching everything still only owns its own
        // grants; the rest of the firehose is redacted for it too.
        redact = false;
        const owned = new Set(await grantIdsFor(caller));
        return streamFeed(reply, req, id, event => {
          const grantId = typeof event.payload.grantId === "string" ? event.payload.grantId : null;
          return grantId && owned.has(grantId) ? event : redactFeedEvent(event);
        });
      } else {
        const grant = await prisma.agentGrant.findUnique({ where: { id }, include: { owner: true } });
        redact = !grant || grant.owner.wallet !== caller;
      }
    }
    return streamFeed(reply, req, id, event => (redact ? redactFeedEvent(event) : event));
  });
}

async function streamFeed(
  reply: FastifyReply,
  req: FastifyRequest,
  id: string,
  project: (e: FeedEvent) => unknown,
): Promise<void> {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  reply.raw.write(`event: hello\ndata: ${JSON.stringify({ grantId: id })}\n\n`);
  const unsubscribe = feed.subscribe(id, e => {
    const projected = project(e);
    reply.raw.write(`event: ${e.eventType}\ndata: ${JSON.stringify(projected, (_k, v) => (typeof v === "bigint" ? v.toString() : v))}\n\n`);
  });
  const ping = setInterval(() => reply.raw.write(": ping\n\n"), 15_000);
  req.raw.on("close", () => { clearInterval(ping); unsubscribe(); });
  await new Promise(() => {}); // keep the handler open until the client leaves
}
