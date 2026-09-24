import { describe, expect, it } from "vitest";
import { checkSwapSettlement, evaluateSwap, minimumOut } from "../src/policy/engine.js";
import type { GrantState, SwapIntent, SwapPolicy } from "../src/policy/types.js";

// A trade is still a spend, so it must clear the same seven gates a transfer
// does. What it adds is the three questions a transfer never has to ask: may
// this grant route through that program, may it buy that token, and did the
// route return enough.

const NOW = 1_800_000_000;
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const ORCA = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
const EVIL = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

function grant(overrides: Partial<GrantState> = {}): GrantState {
  return {
    grantPda: "GrantPda111", executor: "Exec111", active: true,
    spendCapUnits: 500_000_000n, maxTransactions: 5, cooldownSeconds: 30, expiresAt: NOW + 3600,
    allowedMints: [USDC, WSOL], allowedDestinations: [],
    spentUnits: 0n, transactionCount: 0, nextNonce: 0, lastExecutionAt: 0,
    ...overrides,
  };
}
const policy = (o: Partial<SwapPolicy> = {}): SwapPolicy => ({ allowedPrograms: [JUPITER], maxSlippageBps: 100, ...o });
const intent = (o: Partial<SwapIntent> = {}): SwapIntent => ({
  grantPda: "GrantPda111", inputMint: USDC, outputMint: WSOL,
  amountInUnits: 100_000_000n, quotedOutUnits: 1_000_000_000n, program: JUPITER, nonce: 0, ...o,
});

describe("minimumOut", () => {
  it("derives the floor from the agent's own quote, so it tracks the market", () => {
    expect(minimumOut(1_000_000_000n, 100)).toBe(990_000_000n);  // 1%
    expect(minimumOut(1_000_000_000n, 50)).toBe(995_000_000n);   // 0.5%
    expect(minimumOut(1_000_000_000n, 0)).toBe(1_000_000_000n);  // exact fill or nothing
  });
  it("clamps a nonsense tolerance instead of inverting the floor", () => {
    expect(minimumOut(1_000n, 20_000)).toBe(0n);
    expect(minimumOut(1_000n, -5)).toBe(1_000n);
  });
  it("is zero for a zero quote", () => {
    expect(minimumOut(0n, 100)).toBe(0n);
  });
});

describe("evaluateSwap — the transfer gates still apply", () => {
  it("allows a trade inside every limit", () => {
    expect(evaluateSwap(grant(), policy(), intent(), NOW)).toMatchObject({ allow: true, reasonCode: "OK" });
  });
  it("1 revoked", () => {
    expect(evaluateSwap(grant({ active: false }), policy(), intent(), NOW).reasonCode).toBe("REVOKED");
  });
  it("2 expired", () => {
    expect(evaluateSwap(grant({ expiresAt: NOW }), policy(), intent(), NOW).reasonCode).toBe("EXPIRED");
  });
  it("3 nonce replay", () => {
    expect(evaluateSwap(grant({ nextNonce: 2 }), policy(), intent({ nonce: 1 }), NOW).reasonCode).toBe("NONCE_REPLAY");
  });
  it("4 the token being sold must be allowlisted", () => {
    expect(evaluateSwap(grant(), policy(), intent({ inputMint: BONK }), NOW).reasonCode).toBe("MINT_NOT_ALLOWED");
  });
  it("6 the input counts against the spend cap, exactly as a transfer would", () => {
    expect(evaluateSwap(grant({ spentUnits: 450_000_000n }), policy(), intent(), NOW).reasonCode).toBe("SPEND_CAP_EXCEEDED");
  });
  it("6 transaction cap", () => {
    expect(evaluateSwap(grant({ transactionCount: 5 }), policy(), intent(), NOW).reasonCode).toBe("TX_CAP_EXCEEDED");
  });
  it("7 cooldown", () => {
    expect(evaluateSwap(grant({ lastExecutionAt: NOW - 10 }), policy(), intent(), NOW).reasonCode).toBe("COOLDOWN_ACTIVE");
  });
  it("an earlier gate still wins when several fail", () => {
    expect(evaluateSwap(grant({ active: false }), null, intent({ program: EVIL }), NOW).reasonCode).toBe("REVOKED");
  });
});

describe("evaluateSwap — the gates a trade adds", () => {
  it("refuses to trade at all on a grant that never enabled it", () => {
    // Every grant signed before swaps existed is in this state. Treating a
    // missing policy as permission would silently widen permissions already
    // in the wild.
    expect(evaluateSwap(grant(), null, intent(), NOW).reasonCode).toBe("SWAPS_NOT_ENABLED");
    expect(evaluateSwap(grant(), policy({ allowedPrograms: [] }), intent(), NOW).reasonCode).toBe("SWAPS_NOT_ENABLED");
  });

  it("refuses a program the owner did not name", () => {
    // The headline case: an agent told to route through a contract of its own
    // choosing is the permission REDLINE exists to refuse.
    expect(evaluateSwap(grant(), policy(), intent({ program: EVIL }), NOW).reasonCode).toBe("PROGRAM_NOT_ALLOWED");
  });

  it("allows any program the owner did name", () => {
    const multi = policy({ allowedPrograms: [JUPITER, ORCA] });
    expect(evaluateSwap(grant(), multi, intent({ program: ORCA }), NOW).allow).toBe(true);
  });

  it("refuses to buy a token outside the allowlist", () => {
    // Draining a treasury into a worthless token is a swap, not a transfer,
    // so the transfer gates would never have caught it.
    expect(evaluateSwap(grant(), policy(), intent({ outputMint: BONK }), NOW).reasonCode).toBe("OUTPUT_MINT_NOT_ALLOWED");
  });

  it("lets an allowlist of two mints permit trading between exactly those two", () => {
    const g = grant();
    expect(evaluateSwap(g, policy(), intent({ inputMint: USDC, outputMint: WSOL }), NOW).allow).toBe(true);
    expect(evaluateSwap(g, policy(), intent({ inputMint: WSOL, outputMint: USDC }), NOW).allow).toBe(true);
  });

  it("refuses a quote whose floor has already collapsed", () => {
    expect(evaluateSwap(grant(), policy(), intent({ quotedOutUnits: 0n }), NOW).reasonCode).toBe("SLIPPAGE_EXCEEDED");
  });
});

describe("checkSwapSettlement — what actually landed", () => {
  const p = policy({ maxSlippageBps: 100 });
  const i = intent(); // 100 USDC in, 1 SOL quoted, 1% tolerance -> floor 0.99 SOL

  it("accepts a fill at the quote", () => {
    expect(checkSwapSettlement(100_000_000n, 1_000_000_000n, i, p).allow).toBe(true);
  });

  it("accepts a fill inside the tolerance", () => {
    expect(checkSwapSettlement(100_000_000n, 991_000_000n, i, p).allow).toBe(true);
  });

  it("rejects a fill below the floor — this is the sandwich case", () => {
    // The route ran, the quote was honoured on paper, and the vault came back
    // with less than the owner agreed to accept. Nothing about the
    // instruction looked wrong; only the balance does.
    const v = checkSwapSettlement(100_000_000n, 900_000_000n, i, p);
    expect(v.allow).toBe(false);
    expect(v.reasonCode).toBe("SLIPPAGE_EXCEEDED");
    expect(v.message).toContain("990000000");
  });

  it("rejects a route that spent more of the vault than it was authorised to", () => {
    // A DEX that pulls extra input is the other half of the same trust
    // problem, and a quote-only check would miss it entirely.
    const v = checkSwapSettlement(120_000_000n, 1_200_000_000n, i, p);
    expect(v.allow).toBe(false);
    expect(v.reasonCode).toBe("SPEND_CAP_EXCEEDED");
  });

  it("accepts a route that spent less than authorised", () => {
    expect(checkSwapSettlement(90_000_000n, 1_000_000_000n, i, p).allow).toBe(true);
  });

  it("rejects a swap that returned nothing at all", () => {
    expect(checkSwapSettlement(100_000_000n, 0n, i, p).reasonCode).toBe("SLIPPAGE_EXCEEDED");
  });

  it("demands an exact fill when the owner allowed no slippage", () => {
    const strict = policy({ maxSlippageBps: 0 });
    expect(checkSwapSettlement(100_000_000n, 999_999_999n, i, strict).allow).toBe(false);
    expect(checkSwapSettlement(100_000_000n, 1_000_000_000n, i, strict).allow).toBe(true);
  });
});
