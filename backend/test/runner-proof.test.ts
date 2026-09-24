import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A refusal you press a button to cause proves the gate exists. A refusal the
// agent walks into on its own — the owner revokes mid-run, or the budget runs
// out while it is still working — proves the product. Those happen inside a
// run, and a run used to leave every denial at the precheck: the server's word,
// no signature. A run now sends its first refusals to Solana, and only those:
// each is a transaction the executor pays for, and an agent that keeps being
// denied should not keep billing for the privilege.

const MINT = "Mint111111111111111111111111111111111111111";
const DEST = "Dest111111111111111111111111111111111111111";

const world = vi.hoisted(() => ({
  calls: [] as { proveOnChain?: boolean }[],
  reason: "SPEND_CAP_EXCEEDED",
  runUpdates: [] as Record<string, unknown>[],
  audits: [] as { eventType: string; payload: Record<string, unknown> }[],
}));

vi.mock("../src/chain/index.js", () => ({
  getChain: () => ({
    kind: "solana", programId: "prog", executorPubkey: "exec",
    readGrant: vi.fn(async () => ({ active: true, allowedMints: [MINT], allowedDestinations: [DEST], spendCapUnits: 500_000_000n, cooldownSeconds: 0 })),
  }),
}));
vi.mock("../src/chain/solana.js", () => ({ isTransientChainError: () => false }));
vi.mock("../src/clock.js", () => ({ realMs: () => 0 }));
vi.mock("../src/runtime/llm.js", () => ({ llmPlan: vi.fn(async () => null) }));
vi.mock("../src/db/audit.js", () => ({ audit: vi.fn(async (row: { eventType: string; payload: Record<string, unknown> }) => { world.audits.push(row); }) }));
vi.mock("../src/db/client.js", () => ({
  prisma: {
    agentGrant: { findUnique: vi.fn(async () => ({ id: "g1", grantPda: "pda", hire: null })) },
    agentRun: {
      create: vi.fn(async () => ({ id: "run-1" })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { world.runUpdates.push(data); return data; }),
    },
  },
}));
vi.mock("../src/runtime/executor.js", () => ({
  processIntent: vi.fn(async (_grantId: string, _plan: unknown, opts: { proveOnChain?: boolean }) => {
    world.calls.push({ proveOnChain: opts.proveOnChain });
    // Denied by the precheck; sent to the chain only if the caller asked for proof.
    return {
      intentId: "i", intentHash: "h", precheck: { allow: false, reasonCode: world.reason, gate: 6, message: "" },
      submitted: opts.proveOnChain === true,
      ...(opts.proveOnChain ? { signature: "5ig", onchainSuccess: false, onchainReason: world.reason } : {}),
    };
  }),
}));

const { startRun, PROOFS_PER_RUN } = await import("../src/runtime/runner.js");

beforeEach(() => {
  vi.useFakeTimers();
  world.calls.length = 0; world.runUpdates.length = 0; world.audits.length = 0;
  world.reason = "SPEND_CAP_EXCEEDED";
});
afterEach(() => { vi.useRealTimers(); });

const drain = async () => { for (let i = 0; i < 12; i += 1) await vi.advanceTimersByTimeAsync(300); };

describe("a run whose proposals are refused", () => {
  it("sends the first refusals to Solana as proof, then stops paying for more", async () => {
    await startRun("g1", "scripted");
    await drain();

    // The script plans three transfers; all three are denied here.
    expect(world.calls).toHaveLength(3);
    expect(world.calls.map(c => c.proveOnChain)).toEqual([true, true, false]);
    expect(world.calls.filter(c => c.proveOnChain)).toHaveLength(PROOFS_PER_RUN);
  });

  it("ends on the refusal when the owner has revoked — after proving it once", async () => {
    world.reason = "REVOKED";
    await startRun("g1", "scripted");
    await drain();

    expect(world.calls).toHaveLength(1);
    expect(world.calls[0].proveOnChain).toBe(true);
    expect(world.runUpdates).toEqual([expect.objectContaining({ status: "stopped" })]);
    const ended = world.audits.find(a => a.eventType === "run.ended");
    expect(ended?.payload).toMatchObject({ reason: "grant revoked" });
  });

  it("keeps the budget small: proof is for watching the chain say no, not for every denial", () => {
    expect(PROOFS_PER_RUN).toBeGreaterThanOrEqual(1);
    expect(PROOFS_PER_RUN).toBeLessThanOrEqual(3);
  });
});
