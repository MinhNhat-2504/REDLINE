import { describe, expect, it } from "vitest";
import { POLICY_GATES } from "../src/routes/protocol.js";
import { MESSAGES } from "../src/policy/engine.js";

describe("protocol overview gate catalog", () => {
  it("matches the seven on-chain checks in order, before anything moves", () => {
    const pre = POLICY_GATES.filter(gate => gate.phase === "pre-execution");
    expect(pre.map(gate => gate.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pre.map(gate => gate.key)).toEqual([
      "active", "expiry", "nonce", "mint", "destination", "budget", "cooldown",
    ]);
  });

  it("keeps settlement after execution, because a trade cannot be judged before it", () => {
    // A transfer's outcome is knowable in advance; a swap's is not. Ordering
    // this gate with the other seven would claim the program can check a fill
    // it has not seen yet.
    const settlement = POLICY_GATES.filter(gate => gate.phase === "post-settlement");
    expect(settlement.map(gate => gate.key)).toEqual(["settlement"]);
    expect(Math.min(...settlement.map(g => g.id))).toBeGreaterThan(
      Math.max(...POLICY_GATES.filter(g => g.phase === "pre-execution").map(g => g.id)),
    );
  });

  it("maps every policy rejection to exactly one visual gate", () => {
    const reasons = POLICY_GATES.flatMap(gate => gate.reasonCodes);
    expect(new Set(reasons).size).toBe(reasons.length);
    expect(reasons).toEqual(expect.arrayContaining([
      "REVOKED", "EXPIRED", "NONCE_REPLAY", "MINT_NOT_ALLOWED",
      "DESTINATION_NOT_ALLOWED", "TX_CAP_EXCEEDED", "SPEND_CAP_EXCEEDED", "COOLDOWN_ACTIVE",
      "SWAPS_NOT_ENABLED", "PROGRAM_NOT_ALLOWED", "OUTPUT_MINT_NOT_ALLOWED", "SLIPPAGE_EXCEEDED",
    ]));
  });
});

// The catalog above is a second place the reason codes are written down. This
// pins it to the first, so adding a code without deciding which gate owns it
// fails here rather than quietly vanishing from /protocol/overview's counts.
describe("gate catalog covers every reason code", () => {
  const NOT_A_GATE = new Set([
    "OK",          // a pass, not a refusal
    "CHAIN_ERROR", // infrastructure, deliberately outside the policy gates
  ]);

  it("maps every refusal the engine can produce", () => {
    const mapped = new Set(POLICY_GATES.flatMap(gate => gate.reasonCodes as readonly string[]));
    const unaccounted = Object.keys(MESSAGES).filter(code => !NOT_A_GATE.has(code) && !mapped.has(code));
    expect(unaccounted).toEqual([]);
  });

  it("maps nothing the engine cannot produce", () => {
    const known = new Set(Object.keys(MESSAGES));
    const invented = POLICY_GATES.flatMap(gate => gate.reasonCodes as readonly string[]).filter(c => !known.has(c));
    expect(invented).toEqual([]);
  });
});
