import { beforeEach, describe, expect, it } from "vitest";
import { MockChain } from "../src/chain/mock.js";
import type { GrantLimits, SwapIntent } from "../src/policy/types.js";

// End-to-end against the in-memory program. MockChain mirrors the Rust gate
// for gate, so this exercises the whole swap flow — enable trading, propose,
// settle, revert — before the upgraded program is deployed, and keeps working
// as the local/mock mode afterwards.

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const EVIL = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const OWNER = "CjTtqFRVUoXZrFoLcgfhSTSNQMWtgS8oG4ETFX4KtgFr";

const NOW = 1_800_000_000;
const limits: GrantLimits = {
  spendCapUnits: 500_000_000n, maxTransactions: 5, cooldownSeconds: 0,
  expiresAt: NOW + 3600, allowedMints: [USDC, WSOL], allowedDestinations: [OWNER],
};

let chain: MockChain;
let grantPda: string;

const swap = (o: Partial<SwapIntent> = {}): SwapIntent => ({
  grantPda, inputMint: USDC, outputMint: WSOL,
  amountInUnits: 100_000_000n, quotedOutUnits: 1_000_000_000n,
  program: JUPITER, nonce: 0, ...o,
});

beforeEach(async () => {
  chain = new MockChain(undefined, () => NOW);
  ({ grantPda } = await chain.createGrant(OWNER, "vault1", "aa".repeat(16), limits, "00".repeat(32)));
});

describe("trading is off until the owner turns it on", () => {
  it("refuses a swap on a grant with no policy", async () => {
    const r = await chain.executeSwap(swap());
    expect(r.success).toBe(false);
    expect(r.reasonCode).toBe("SWAPS_NOT_ENABLED");
    // Nothing moved, so nothing was counted either.
    expect((await chain.readGrant(grantPda))!.nextNonce).toBe(0);
  });

  it("reports no policy rather than an empty one", async () => {
    expect(await chain.readSwapPolicy(grantPda)).toBeNull();
  });

  it("allows the trade once the owner enables it", async () => {
    await chain.createSwapPolicy(grantPda, { allowedPrograms: [JUPITER], maxSlippageBps: 100 });
    const r = await chain.executeSwap(swap());
    expect(r.success).toBe(true);
    expect(r.amountOutUnits).toBe(1_000_000_000n);
  });
});

describe("the gates a trade adds", () => {
  beforeEach(async () => {
    await chain.createSwapPolicy(grantPda, { allowedPrograms: [JUPITER], maxSlippageBps: 100 });
  });

  it("refuses a venue the owner never named", async () => {
    const r = await chain.executeSwap(swap({ program: EVIL }));
    expect(r.reasonCode).toBe("PROGRAM_NOT_ALLOWED");
  });

  it("refuses to buy a token outside the allowlist", async () => {
    const r = await chain.executeSwap(swap({ outputMint: BONK }));
    expect(r.reasonCode).toBe("OUTPUT_MINT_NOT_ALLOWED");
  });

  it("counts the input against the same spend cap a transfer uses", async () => {
    const r = await chain.executeSwap(swap({ amountInUnits: 600_000_000n }));
    expect(r.reasonCode).toBe("SPEND_CAP_EXCEEDED");
  });

  it("shares the nonce sequence with transfers, so neither can replay", async () => {
    await chain.executeSwap(swap({ nonce: 0 }));
    const replay = await chain.executeSwap(swap({ nonce: 0 }));
    expect(replay.reasonCode).toBe("NONCE_REPLAY");
  });
});

describe("settlement is judged on what came back", () => {
  beforeEach(async () => {
    await chain.createSwapPolicy(grantPda, { allowedPrograms: [JUPITER], maxSlippageBps: 100 });
  });

  it("accepts a fill inside the tolerance", async () => {
    chain.setFillRatioBps(9_950); // 0.5% worse than quoted, tolerance is 1%
    const r = await chain.executeSwap(swap());
    expect(r.success).toBe(true);
    expect(r.amountOutUnits).toBe(995_000_000n);
  });

  it("reverts a fill below the floor, and moves nothing when it does", async () => {
    // The sandwich: the route ran and succeeded, and the vault came back with
    // ten percent less than the owner agreed to accept.
    chain.setFillRatioBps(9_000);
    const r = await chain.executeSwap(swap());
    expect(r.success).toBe(false);
    expect(r.reasonCode).toBe("SLIPPAGE_EXCEEDED");
    expect(r.amountInUnits).toBe(0n);
    const state = await chain.readGrant(grantPda);
    expect(state!.spentUnits).toBe(0n);
    expect(state!.nextNonce).toBe(0);
    expect(state!.transactionCount).toBe(0);
  });

  it("spends the cap only on trades that actually settled", async () => {
    chain.setFillRatioBps(9_000);
    await chain.executeSwap(swap());            // reverted
    chain.setFillRatioBps(10_000);
    await chain.executeSwap(swap({ nonce: 0 })); // settled, nonce never advanced
    const state = await chain.readGrant(grantPda);
    expect(state!.spentUnits).toBe(100_000_000n);
    expect(state!.transactionCount).toBe(1);
  });

  it("reports the floor its policy implies for a quote", async () => {
    expect(await chain.swapFloor(grantPda, 1_000_000_000n)).toBe(990_000_000n);
  });
});

describe("a revoked grant cannot trade either", () => {
  it("refuses after revocation", async () => {
    await chain.createSwapPolicy(grantPda, { allowedPrograms: [JUPITER], maxSlippageBps: 100 });
    await chain.revokeGrant(grantPda);
    expect((await chain.executeSwap(swap())).reasonCode).toBe("REVOKED");
  });
});
