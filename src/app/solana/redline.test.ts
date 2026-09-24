import { describe, expect, it } from "vitest";
import { policyHashHex } from "./redline";

// This digest goes into create_grant and is what an auditor later compares a
// policy against, so it has to depend on the policy's content and nothing
// else — not the order a wizard happened to collect the values in, and not
// stray whitespace. It also has to change when the policy does, or two
// different authorisations would be indistinguishable on-chain.

const policy = {
  agentName: "YieldGuard Alpha",
  strategy: "Risk-bounded DeFi yield optimization",
  tokens: ["SOL", "USDC"],
  spendCapUsdc: 500,
  maxTransactions: 25,
  durationHours: 12,
  cooldownMinutes: 10,
  allowedMints: ["7g5KxUnDjxDXqAV9yxuD6mVN8CLVu4s73jLU6UpTccoY"],
  allowedDestinations: ["7XB2hFTccpjS6sgZZjr8wWnCuk6jYuXk6aYkXRHPu62q", "2828FT2CggMGyHUPucL8Bv16FXXGhitnMgSM3Cc6ZEye"],
};

describe("policyHashHex", () => {
  it("is a 64-character hex digest", async () => {
    expect(await policyHashHex(policy)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ignores the order tokens and allowlists were collected in", async () => {
    const base = await policyHashHex(policy);
    expect(await policyHashHex({ ...policy, tokens: [...policy.tokens].reverse() })).toBe(base);
    expect(await policyHashHex({ ...policy, allowedDestinations: [...policy.allowedDestinations].reverse() })).toBe(base);
  });

  it("ignores surrounding whitespace in free text", async () => {
    const base = await policyHashHex(policy);
    expect(await policyHashHex({ ...policy, agentName: `  ${policy.agentName}  ` })).toBe(base);
  });

  // The destination allowlist is the field the product's security argument
  // rests on, so a digest that did not move with it would be worthless as
  // evidence of what was authorised.
  it("changes when any bound changes, the destination allowlist included", async () => {
    const base = await policyHashHex(policy);
    const variants = [
      { ...policy, allowedDestinations: [...policy.allowedDestinations, "3qQdbfCMfJyjggp9GGJCnuqJ2tkXDeY5Qeuwdir52ZJo"] },
      { ...policy, allowedMints: ["2828FT2CggMGyHUPucL8Bv16FXXGhitnMgSM3Cc6ZEye"] },
      { ...policy, spendCapUsdc: 501 },
      { ...policy, maxTransactions: 26 },
      { ...policy, durationHours: 13 },
      { ...policy, cooldownMinutes: 11 },
    ];
    for (const v of variants) {
      expect(await policyHashHex(v)).not.toBe(base);
    }
  });
});
