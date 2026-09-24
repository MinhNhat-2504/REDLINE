import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { activeRunIds, startRun, stopRun } from "../runtime/runner.js";
import { callerWallet, identityEnforced, requireGrantOwner } from "../auth.js";
import { json } from "./json.js";

export async function runRoutes(app: FastifyInstance) {
  app.post("/runs", async (req, reply) => {
    const body = z.object({ grantId: z.string().min(1), mode: z.enum(["scripted", "llm"]).default("scripted"), tickMs: z.number().int().min(250).max(600_000).optional() }).parse(req.body);
    // Starting a run makes the executor spend from this grant's vault.
    await requireGrantOwner(req, body.grantId);
    const run = await startRun(body.grantId, body.mode, body.tickMs);
    return reply.code(201).send(json(run));
  });

  app.post("/runs/:id/stop", async (req, reply) => {
    const { id } = req.params as { id: string };
    // Stopping someone's agent is as much a control over it as starting one;
    // the start route checked ownership and this one did not.
    const run = await prisma.agentRun.findUnique({ where: { id } });
    if (!run) return reply.code(404).send({ error: "run not found" });
    await requireGrantOwner(req, run.grantId);
    if (!stopRun(id)) return reply.code(404).send({ error: "run is not active" });
    return { ok: true };
  });

  app.get("/runs", async (req) => {
    const caller = callerWallet(req);
    if (identityEnforced() && !caller) return json({ active: [], runs: [] });
    const runs = await prisma.agentRun.findMany({
      where: caller ? { grant: { owner: { wallet: caller } } } : undefined,
      orderBy: { startedAt: "desc" }, take: 50,
    });
    const mine = new Set(runs.map(r => r.id));
    return json({ active: activeRunIds().filter(id => mine.has(id)), runs });
  });
}
