import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ events: vi.fn(), intents: vi.fn(), grants: vi.fn() }));
vi.mock("../src/db/client.js", () => ({ prisma: { auditEvent: { findMany: db.events }, transactionIntent: { findMany: db.intents }, agentGrant: { findMany: db.grants } } }));
vi.mock("../src/auth.js", () => ({ callerWallet: (req: { headers: Record<string, string> }) => req.headers["test-owner"] ?? null, identityEnforced: () => true }));
import { auditHistory } from "../src/db/audit-history.js";
import { auditRoutes } from "../src/routes/audit.js";
beforeEach(() => { vi.clearAllMocks(); db.events.mockResolvedValue([]); db.intents.mockResolvedValue([]); db.grants.mockResolvedValue([{ id: "g1" }]); });
describe("audit history linkage and recent window", () => {
  it("enriches historical events only through matching intent and grant ids", async () => {
    db.intents.mockResolvedValue([{ id: "i1", grantId: "g1", runId: "r1", amountUnits: 5n, mint: "mint", destination: "dest" }]);
    const rows = await auditHistory([{ id: "e1", subjectType: "intent", subjectId: "i1", payload: JSON.stringify({ grantId: "g1" }) }, { id: "e2", subjectType: "intent", subjectId: "i1", payload: JSON.stringify({ grantId: "g2" }) }]);
    expect(rows[0].payload).toMatchObject({ runId: "r1", amountUnits: "5", destination: "dest" }); expect(rows[1].payload).toEqual({ grantId: "g2" });
  });
  it("requests latest rows before applying the limit and retains owner scope", async () => {
    const app = Fastify(); await app.register(auditRoutes);
    const res = await app.inject({ url: "/audit?order=latest&limit=1000", headers: { "test-owner": "alice" } });
    expect(res.statusCode).toBe(200); expect(db.events).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: "desc" }, take: 1000, where: { OR: expect.arrayContaining([{ subjectType: "grant", subjectId: { in: ["g1"] } }, { actorId: "alice" }]) } })); await app.close();
  });
  it("keeps anonymous history short and redacted, without enriching private links", async () => {
    const destination = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";
    db.events.mockResolvedValue([{ id: "e1", createdAt: new Date(), subjectType: "intent", subjectId: "i1", actorType: "agent", actorId: "executor", chainSignature: null, eventType: "intent.created", payload: JSON.stringify({ grantId: "g1", runId: "r1", destination, amountUnits: "5" }) }]);
    const app = Fastify(); await app.register(auditRoutes); const res = await app.inject("/audit?order=latest&limit=1000");
    expect(res.statusCode).toBe(200); expect(db.events).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" }, take: 50 }); expect(db.intents).not.toHaveBeenCalled(); expect(JSON.stringify(res.json())).not.toContain(destination); await app.close();
  });
  it("bounds invalid limits while keeping old chronological calls compatible", async () => {
    const app = Fastify(); await app.register(auditRoutes);
    for (const [limit, take] of [["NaN", 200], ["-10", 1], ["100000", 1000]] as const) {
      await app.inject({ url: `/audit?limit=${limit}`, headers: { "test-owner": "alice" } }); expect(db.events).toHaveBeenLastCalledWith(expect.objectContaining({ orderBy: { createdAt: "asc" }, take }));
    }
    await app.close();
  });
});
