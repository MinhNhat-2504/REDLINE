import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client.js";
import { json } from "./json.js";

const USDC_DECIMALS = 1_000_000;
const DAY_MS = 86_400_000;
const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Every number here comes from the audit trail / mirrored on-chain counters —
// no price feed, no strategy backtest, so there is no honest way to compute
// P&L, APY or a win rate. What *is* real: how much moved, how often the
// program said yes, and how fast a decision came back.
export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics", async (req) => {
    const { owner } = req.query as { owner?: string };
    const grants = await prisma.agentGrant.findMany({
      where: owner ? { owner: { wallet: owner } } : undefined,
      include: { agentVersion: true, policyVersion: { select: { expiresAt: true } } },
    });
    const grantIds = grants.map(g => g.id);

    const intents = grantIds.length
      ? await prisma.transactionIntent.findMany({
          where: { grantId: { in: grantIds } },
          include: { decision: { include: { chainTx: true } } },
          orderBy: { createdAt: "asc" },
        })
      : [];

    let confirmed = 0;
    let rejected = 0;
    let latencyTotalMs = 0;
    let latencyCount = 0;
    const volumeByDay = new Map<string, number>();

    for (const intent of intents) {
      const decision = intent.decision;
      if (!decision) continue;
      latencyTotalMs += decision.createdAt.getTime() - intent.createdAt.getTime();
      latencyCount += 1;
      if (decision.chainTx?.result === "success") {
        confirmed += 1;
        const day = new Date(Math.floor(intent.createdAt.getTime() / DAY_MS) * DAY_MS);
        const key = day.toISOString().slice(0, 10);
        const usdc = Number(intent.amountUnits) / USDC_DECIMALS;
        volumeByDay.set(key, (volumeByDay.get(key) ?? 0) + usdc);
      } else {
        // Precheck DENY (never submitted) and on-chain REJECT both count as
        // the policy saying no to an attempted transfer.
        rejected += 1;
      }
    }

    const totalVolumeUsdc = grants.reduce((sum, g) => sum + Number(g.spentUnits) / USDC_DECIMALS, 0);
    const totalDecisions = confirmed + rejected;

    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      return { t: DAY_LABEL[d.getUTCDay()], date: key, volumeUsdc: Math.round((volumeByDay.get(key) ?? 0) * 100) / 100 };
    });

    const byAgent = new Map<string, { name: string; volumeUsdc: number; grants: number }>();
    for (const g of grants) {
      const entry = byAgent.get(g.agentVersionId) ?? { name: g.agentVersion.name, volumeUsdc: 0, grants: 0 };
      entry.volumeUsdc += Number(g.spentUnits) / USDC_DECIMALS;
      entry.grants += 1;
      byAgent.set(g.agentVersionId, entry);
    }

    // Active = the executor could still act: not revoked, window still open.
    // The grant's own expiry, with the (shared) policy expiry as the fallback
    // for rows written before grants carried one.
    const nowMs = now.getTime();
    return json({
      activeGrants: grants.filter(g => !g.revoked && (g.expiresAt ?? g.policyVersion.expiresAt).getTime() > nowMs).length,
      totalGrants: grants.length,
      totalVolumeUsdc: Math.round(totalVolumeUsdc * 100) / 100,
      totalTransactions: confirmed,
      totalRejections: rejected,
      successRatePct: totalDecisions ? Math.round((confirmed / totalDecisions) * 1000) / 10 : null,
      avgDecisionLatencyMs: latencyCount ? Math.round(latencyTotalMs / latencyCount) : null,
      weeklyVolume: last7Days,
      topAgentsByVolume: [...byAgent.values()].sort((a, b) => b.volumeUsdc - a.volumeUsdc).slice(0, 5).map(a => ({ ...a, volumeUsdc: Math.round(a.volumeUsdc * 100) / 100 })),
    });
  });
}
