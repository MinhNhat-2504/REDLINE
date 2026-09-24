import { getChain } from "../chain/index.js";
import { isTransientChainError } from "../chain/solana.js";
import { realMs } from "../clock.js";
import { prisma } from "../db/client.js";
import { audit } from "../db/audit.js";
import { processIntent } from "./executor.js";
import { scriptedPlan } from "./scripted.js";
import { llmPlan } from "./llm.js";

// Agent runtime: one loop per active run. Each tick plans one intent and
// hands it to the executor. Ticks are spaced by the grant cooldown so a
// well-behaved agent never trips gate 7 by accident.

const active = new Map<string, { stop: () => void }>();

/**
 * How many of a run's refused proposals are sent to Solana anyway.
 *
 * The refusal worth showing is the one the agent walks into by itself: the
 * owner revokes while it is mid-run, or the budget runs out while it is still
 * working. Left at the precheck, that moment was the server's word with no
 * signature. Sent on-chain, it is a failed transaction anyone can open. But
 * each one costs the executor a fee, and an agent that keeps being denied
 * should not keep billing for it — so the first few are proven and the rest
 * are recorded at the precheck as before.
 */
export const PROOFS_PER_RUN = 2;

// Every promise this loop lets go of lands here. Node 15+ turns an unhandled
// rejection into a process exit, and Fastify installs no handler, so a single
// failed `agentRun.update` during a stop — one DB blip — used to take the
// whole API (and every other run) down with it.
function swallow(label: string): (err: unknown) => void {
  return err => console.error(`[runtime] ${label}:`, err instanceof Error ? err.message : err);
}

const fail = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });

export async function startRun(grantId: string, mode: "scripted" | "llm", tickMs?: number) {
  const chain = getChain();
  const grant = await prisma.agentGrant.findUnique({ where: { id: grantId }, include: { hire: true } });
  if (!grant) throw fail(404, "grant not found");
  const state = await chain.readGrant(grant.grantPda);
  if (!state) throw fail(409, "grant not found on chain");
  // These are expected states of the world, not server faults: 409, so the
  // dashboard can show the words instead of "Internal Server Error".
  if (!state.active) throw fail(409, "grant is revoked");
  if (grant.hire && grant.hire.endsAt.getTime() <= Date.now()) throw fail(409, "the rental covering this grant has ended — renew it before running the agent");

  const run = await prisma.agentRun.create({ data: { grantId, mode } });
  await audit({ actorType: "agent", actorId: chain.executorPubkey, eventType: "run.started", subjectType: "run", subjectId: run.id, payload: { grantId, mode } });

  // Space ticks by the cooldown (on the shared clock) so a compliant agent
  // never trips gate 7; tickMs only overrides for tests.
  const interval = tickMs ?? Math.max(250, realMs(state.cooldownSeconds) + 250);
  const hireEndsAt = grant.hire?.endsAt.getTime() ?? null;
  let step = 0;
  let stopped = false;
  let proofsLeft = PROOFS_PER_RUN;

  const finish = async (status: "stopped" | "failed", reason: string) => {
    if (stopped) return;
    stopped = true;
    active.delete(run.id);
    await prisma.agentRun.update({ where: { id: run.id }, data: { status, endedAt: new Date() } });
    await audit({ actorType: "agent", actorId: chain.executorPubkey, eventType: "run.ended", subjectType: "run", subjectId: run.id, payload: { grantId, status, reason, steps: step } });
  };

  const tick = async () => {
    if (stopped) return;
    try {
      // A rented agent's authority ends with the rental, whatever the on-chain
      // window says: the browser signed that window before the term was
      // checked, so this is where the boundary is actually enforced.
      if (hireEndsAt !== null && hireEndsAt <= Date.now()) return finish("stopped", "rental ended");
      const fresh = await chain.readGrant(grant.grantPda);
      if (!fresh) return finish("failed", "grant vanished");
      const plan = mode === "scripted" ? scriptedPlan(fresh, step) : await llmPlan(fresh, grant.id);
      if (!plan) return finish("stopped", "script complete");
      step += 1;
      const res = await processIntent(grantId, plan, { runId: run.id, proveOnChain: proofsLeft > 0 });
      if (!res.precheck.allow && res.submitted) proofsLeft -= 1;
      // A revoked grant ends the run; any other rejection lets the loop go on
      // so the owner can watch the agent keep getting denied.
      if (res.precheck.reasonCode === "REVOKED" || res.onchainReason === "REVOKED") return finish("stopped", "grant revoked");
      if (res.precheck.reasonCode === "EXPIRED") return finish("stopped", "grant expired");
      // A gate denial is the demo; a chain error is a broken setup the agent
      // cannot retry its way out of, so end the run instead of looping on it.
      if (res.onchainReason === "CHAIN_ERROR") return finish("failed", "chain rejected the transfer outside the policy");
    } catch (err) {
      if (isTransientChainError(err)) {
        // RPC throttled: keep the run alive, retry this step on the next tick.
        step = Math.max(0, step - 1);
        await audit({ actorType: "system", actorId: "runtime", eventType: "run.retry", subjectType: "run", subjectId: run.id, payload: { grantId, step, error: err instanceof Error ? err.message.slice(0, 200) : String(err) } });
      } else {
        return finish("failed", err instanceof Error ? err.message : String(err));
      }
    }
    if (!stopped) timer = setTimeout(guardedTick, interval);
  };
  // setTimeout discards the promise an async callback returns, so any
  // rejection out of `tick` (an audit write failing inside its own catch
  // block, say) would otherwise be unhandled.
  const guardedTick = () => { tick().catch(swallow(`run ${run.id} tick`)); };

  let timer = setTimeout(guardedTick, 250);
  active.set(run.id, { stop: () => { clearTimeout(timer); finish("stopped", "stopped by owner").catch(swallow(`run ${run.id} stop`)); } });
  return run;
}

export function stopRun(runId: string): boolean {
  const h = active.get(runId);
  if (!h) return false;
  h.stop();
  return true;
}

export function activeRunIds(): string[] {
  return [...active.keys()];
}

/**
 * Close runs that a previous process left open.
 *
 * A run lives in this process's memory; its row says `running` until `finish`
 * writes otherwise. A redeploy or a free-tier spin-down (routine on Render)
 * skips `finish`, so the row stays `running` forever, the dashboard shows
 * "AGENT RUNNING", and the Start button stays disabled — for a loop that no
 * longer exists anywhere. Nothing can resume those runs (the step counter
 * was in memory too), so the honest status is `failed`.
 */
export async function reconcileOrphanedRuns(): Promise<number> {
  const orphans = await prisma.agentRun.findMany({ where: { status: "running" }, select: { id: true, grantId: true, mode: true } });
  if (orphans.length === 0) return 0;
  const endedAt = new Date();
  await prisma.agentRun.updateMany({ where: { id: { in: orphans.map(r => r.id) } }, data: { status: "failed", endedAt } });
  for (const run of orphans) {
    await audit({
      actorType: "system", actorId: "runtime", eventType: "run.ended", subjectType: "run", subjectId: run.id,
      payload: { grantId: run.grantId, status: "failed", reason: "interrupted by an API restart", steps: null, mode: run.mode },
    });
  }
  return orphans.length;
}
