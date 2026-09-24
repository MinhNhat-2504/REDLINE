import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assessPolicyLocally, validatePolicy, type AgentPolicyInput } from "./risk-engine";

const safePolicy: AgentPolicyInput = {
  agentName: "Treasury Scout",
  strategy: "Monitor stablecoin yield and request approval before rebalancing",
  tokens: ["SOL", "USDC"],
  spendCapUsdc: 500,
  maxTransactions: 25,
  durationHours: 12,
  cooldownMinutes: 10,
};

describe("REDLINE risk engine", () => {
  it("allows a tightly bounded pilot policy", () => {
    const result = assessPolicyLocally(safePolicy);
    expect(result.decision).toBe("ALLOW");
    expect(result.level).toBe("LOW");
    expect(result.score).toBeLessThan(35);
  });

  it("blocks an unbounded high-risk strategy", () => {
    const result = assessPolicyLocally({
      ...safePolicy,
      strategy: "Leveraged cross-chain flash arbitrage",
      tokens: ["SOL", "USDC", "JUP", "JTO", "BONK", "PYTH"],
      spendCapUsdc: 50_000,
      maxTransactions: 800,
      durationHours: 168,
      cooldownMinutes: 1,
    });
    expect(result.decision).toBe("BLOCK");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("rejects malformed policies", () => {
    expect(validatePolicy({ ...safePolicy, tokens: [], spendCapUsdc: -1 })).toHaveLength(2);
  });
});

// The other half of the contract in backend/test/risk-contract.test.ts. Both
// suites run the same vectors: this fallback is what decides whether the sign
// button unlocks when the API cannot be reached, so a verdict it produces that
// the server would not have is a real divergence, not a cosmetic one.
describe("deterministic risk floor — shared contract", () => {
  const vectorsPath = fileURLToPath(new URL("../../../risk-vectors.json", import.meta.url));
  const { vectors } = JSON.parse(readFileSync(vectorsPath, "utf8")) as {
    vectors: { name: string; policy: AgentPolicyInput; score: number; level: string; decision: string }[];
  };

  it("has vectors to check", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  for (const v of vectors) {
    it(`browser fallback: ${v.name}`, () => {
      const got = assessPolicyLocally(v.policy);
      expect({ score: got.score, level: got.level, decision: got.decision })
        .toEqual({ score: v.score, level: v.level, decision: v.decision });
    });
  }
});
