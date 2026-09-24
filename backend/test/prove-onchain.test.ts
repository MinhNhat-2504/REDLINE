import { beforeEach, describe, expect, it, vi } from "vitest";

// REDLINE's claim is that the chain decides. The executor is careful, though:
// it runs the same gates off-chain first and does not submit a proposal they
// deny. That is the right default — a refused transfer still costs a fee — but
// it means the live dashboard never actually shows the program refusing
// anything: every "rejected" row is the server's opinion, with no signature to
// follow. `proveOnChain` is the owner's deliberate exception: send the denied
// proposal anyway and let Solana say no.

const GRANT_PDA = "GrantPda11111111111111111111111111111111111";
const MINT = "Mint111111111111111111111111111111111111111";
const DEST = "Dest111111111111111111111111111111111111111";

const world = vi.hoisted(() => ({
  audits: [] as { eventType: string; chainSignature?: string | null; payload: Record<string, unknown> }[],
  decisions: [] as Record<string, unknown>[],
  chainTxs: [] as Record<string, unknown>[],
  executeTransfer: null as unknown as ReturnType<typeof import("vitest")["vi"]["fn"]>,
  state: null as unknown as Record<string, unknown>,
}));

vi.mock("../src/db/audit.js", () => ({
  audit: vi.fn(async (row: { eventType: string; chainSignature?: string | null; payload: Record<string, unknown> }) => { world.audits.push(row); }),
}));

vi.mock("../src/db/client.js", () => ({
  prisma: {
    agentGrant: {
      findUniqueOrThrow: vi.fn(async () => ({ id: "g1", grantPda: GRANT_PDA })),
      update: vi.fn(async () => ({})),
    },
    transactionIntent: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "intent-1", ...data })) },
    policyDecision: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { world.decisions.push(data); return { id: "decision-1", ...data }; }) },
    chainTransaction: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { world.chainTxs.push(data); return data; }) },
  },
}));

vi.mock("../src/chain/index.js", () => ({
  getChain: () => ({
    kind: "solana",
    programId: "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4",
    executorPubkey: "Exec1111111111111111111111111111111111111111",
    readGrant: vi.fn(async () => world.state),
    executeTransfer: world.executeTransfer,
  }),
}));

const { processIntent } = await import("../src/runtime/executor.js");

const NOW = 1_800_000_000;
// 400 of 500 spent: a transfer of 101 is one unit past what is left.
const grantState = () => ({
  active: true, expiresAt: NOW + 3_600, nextNonce: 4,
  allowedMints: [MINT], allowedDestinations: [DEST],
  transactionCount: 4, maxTransactions: 10,
  spentUnits: 400n, spendCapUnits: 500n,
  lastExecutionAt: 0, cooldownSeconds: 0,
});
const overCap = { mint: MINT, amountUnits: 101n, destination: DEST, reason: "one unit past the cap" };

beforeEach(() => {
  world.audits.length = 0; world.decisions.length = 0; world.chainTxs.length = 0;
  world.state = grantState();
  world.executeTransfer = vi.fn(async () => ({
    signature: "5ig_refused_by_program", success: false, reasonCode: "SPEND_CAP_EXCEEDED",
    error: "custom program error: 0x177b", slot: 123n,
  }));
});

describe("a proposal the precheck denies", () => {
  it("is not sent to the chain by default — a refused transfer still costs a fee", async () => {
    const result = await processIntent("g1", overCap, { now: () => NOW });

    expect(result.precheck).toMatchObject({ allow: false, reasonCode: "SPEND_CAP_EXCEEDED" });
    expect(result.submitted).toBe(false);
    expect(world.executeTransfer).not.toHaveBeenCalled();
    expect(world.decisions).toEqual([expect.objectContaining({ stage: "precheck", allow: false })]);
    expect(world.chainTxs).toHaveLength(0);
    expect(world.audits.map(a => a.eventType)).not.toContain("tx.rejected");
  });

  it("is sent when the owner asks for proof, and the program's refusal is what gets recorded", async () => {
    const result = await processIntent("g1", overCap, { now: () => NOW, proveOnChain: true });

    expect(world.executeTransfer).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ submitted: true, onchainSuccess: false, onchainReason: "SPEND_CAP_EXCEEDED", signature: "5ig_refused_by_program" });

    // The verdict on record is the chain's, not the server's prediction of it.
    expect(world.decisions).toEqual([expect.objectContaining({ stage: "onchain", allow: false, reasonCode: "SPEND_CAP_EXCEEDED" })]);
    expect(world.chainTxs).toEqual([expect.objectContaining({ signature: "5ig_refused_by_program", result: "failed" })]);

    // ...and there is a signature to follow to Explorer.
    const rejected = world.audits.find(a => a.eventType === "tx.rejected");
    expect(rejected?.chainSignature).toBe("5ig_refused_by_program");
  });

  it("still records what the server predicted, so the two can be compared", async () => {
    await processIntent("g1", overCap, { now: () => NOW, proveOnChain: true });
    const precheck = world.audits.find(a => a.eventType === "decision.precheck");
    expect(precheck?.payload).toMatchObject({ allow: false, reasonCode: "SPEND_CAP_EXCEEDED", gate: 6 });
  });

  it("writes one decision per intent, never a precheck row and an on-chain row both", async () => {
    await processIntent("g1", overCap, { now: () => NOW, proveOnChain: true });
    expect(world.decisions).toHaveLength(1);
  });
});

describe("a proposal the precheck allows", () => {
  it("is unaffected by the flag", async () => {
    world.executeTransfer = vi.fn(async () => ({ signature: "5ig_ok", success: true, reasonCode: "OK", slot: 124n }));
    const result = await processIntent("g1", { ...overCap, amountUnits: 50n }, { now: () => NOW, proveOnChain: true });
    expect(result).toMatchObject({ submitted: true, onchainSuccess: true });
    expect(world.audits.map(a => a.eventType)).toContain("tx.confirmed");
  });
});
