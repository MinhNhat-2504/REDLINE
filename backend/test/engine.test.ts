import { describe, expect, it } from "vitest";
import { applyExecution, evaluateIntent, intentHash } from "../src/policy/engine.js";
import type { GrantState, Intent } from "../src/policy/types.js";

const NOW = 1_800_000_000;
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEST = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

function grant(overrides: Partial<GrantState> = {}): GrantState {
  return {
    grantPda: "GrantPda111",
    executor: "Exec111",
    active: true,
    spendCapUnits: 500_000_000n, // 500 USDC
    maxTransactions: 5,
    cooldownSeconds: 30,
    expiresAt: NOW + 3600,
    allowedMints: [USDC],
    allowedDestinations: [DEST],
    spentUnits: 0n,
    transactionCount: 0,
    nextNonce: 0,
    lastExecutionAt: 0,
    ...overrides,
  };
}

function intent(overrides: Partial<Intent> = {}): Intent {
  return { grantPda: "GrantPda111", mint: USDC, amountUnits: 100_000_000n, destination: DEST, nonce: 0, ...overrides };
}

describe("evaluateIntent — gate order matches the program", () => {
  it("allows a compliant intent", () => {
    expect(evaluateIntent(grant(), intent(), NOW)).toMatchObject({ allow: true, reasonCode: "OK", gate: 0 });
  });
  it("1 revoked", () => {
    expect(evaluateIntent(grant({ active: false }), intent(), NOW).reasonCode).toBe("REVOKED");
  });
  it("2 expired", () => {
    expect(evaluateIntent(grant({ expiresAt: NOW }), intent(), NOW).reasonCode).toBe("EXPIRED");
  });
  it("3 nonce replay", () => {
    expect(evaluateIntent(grant({ nextNonce: 2 }), intent({ nonce: 1 }), NOW).reasonCode).toBe("NONCE_REPLAY");
  });
  it("4 mint not allowed", () => {
    expect(evaluateIntent(grant(), intent({ mint: "So11111111111111111111111111111111111111112" }), NOW).reasonCode).toBe("MINT_NOT_ALLOWED");
  });
  it("5 destination not allowed", () => {
    expect(evaluateIntent(grant(), intent({ destination: "Attacker111" }), NOW).reasonCode).toBe("DESTINATION_NOT_ALLOWED");
  });
  it("6 transaction cap", () => {
    expect(evaluateIntent(grant({ transactionCount: 5 }), intent(), NOW).reasonCode).toBe("TX_CAP_EXCEEDED");
  });
  it("6 spend cap — the demo moment: 600 over a 500 cap", () => {
    const v = evaluateIntent(grant(), intent({ amountUnits: 600_000_000n }), NOW);
    expect(v.reasonCode).toBe("SPEND_CAP_EXCEEDED");
    expect(v.allow).toBe(false);
  });
  it("6 spend cap is cumulative", () => {
    expect(evaluateIntent(grant({ spentUnits: 450_000_000n }), intent(), NOW).reasonCode).toBe("SPEND_CAP_EXCEEDED");
  });
  it("7 cooldown", () => {
    expect(evaluateIntent(grant({ lastExecutionAt: NOW - 10 }), intent(), NOW).reasonCode).toBe("COOLDOWN_ACTIVE");
    expect(evaluateIntent(grant({ lastExecutionAt: NOW - 30 }), intent(), NOW).allow).toBe(true);
  });
  it("earlier gate wins when several fail", () => {
    const v = evaluateIntent(grant({ active: false, expiresAt: NOW }), intent({ amountUnits: 999_000_000n }), NOW);
    expect(v.reasonCode).toBe("REVOKED");
  });
});

describe("applyExecution", () => {
  it("advances counters and nonce exactly like the program", () => {
    const next = applyExecution(grant(), intent(), NOW);
    expect(next).toMatchObject({ spentUnits: 100_000_000n, transactionCount: 1, nextNonce: 1, lastExecutionAt: NOW });
  });
  it("sequence of 5 valid then 1 over cap", () => {
    let g = grant();
    for (let i = 0; i < 4; i += 1) {
      const it = intent({ nonce: i });
      expect(evaluateIntent(g, it, NOW + i * 60).allow).toBe(true);
      g = applyExecution(g, it, NOW + i * 60);
    }
    // 400 spent, one tx left, 200 more would exceed 500
    expect(evaluateIntent(g, intent({ nonce: 4, amountUnits: 200_000_000n }), NOW + 300).reasonCode).toBe("SPEND_CAP_EXCEEDED");
    expect(evaluateIntent(g, intent({ nonce: 4 }), NOW + 300).allow).toBe(true);
  });
});

describe("intentHash", () => {
  it("is stable and ignores the free-text reason", () => {
    expect(intentHash(intent({ reason: "a" }))).toBe(intentHash(intent({ reason: "b" })));
    expect(intentHash(intent())).not.toBe(intentHash(intent({ nonce: 1 })));
  });
});
