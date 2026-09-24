import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { POLICY_PRESETS, SimulationInput, simulatePolicy } from "../src/policy/simulation.js";
import { simulationRoutes } from "../src/routes/simulation.js";
import { registerAuth } from "../src/auth.js";

const base = () => SimulationInput.parse({ policy: POLICY_PRESETS[0].policy, proposal: POLICY_PRESETS[0].proposal });

describe("sequential policy simulation", () => {
  it("allows exact budget and blocks the next proposal without consuming counters", () => {
    const input = base();
    const result = simulatePolicy(input);
    expect(result.steps.map(step => step.verdict.reasonCode)).toEqual(["OK", "OK", "OK", "OK", "SPEND_CAP_EXCEEDED"]);
    expect(result.summary).toEqual({ allowed: 4, blocked: 1, spentUnits: "1000000000", remainingUnits: "0", nextNonce: 4 });
    expect(result.steps[4].gates.map(gate => gate.status)).toEqual(["passed", "passed", "passed", "passed", "passed", "blocked", "skipped"]);
    expect(input).toEqual(base());
  });
  it("retries after cooldown using the unchanged nonce and does not spend on rejection", () => {
    const input = base(); input.proposal.intervalSeconds = 30;
    const result = simulatePolicy(input);
    expect(result.steps.map(step => step.verdict.reasonCode)).toEqual(["OK", "COOLDOWN_ACTIVE", "OK", "COOLDOWN_ACTIVE", "OK"]);
    expect(result.steps.map(step => step.nonce)).toEqual([0, 1, 1, 2, 2]);
    expect(result.summary.spentUnits).toBe("750000000");
  });
  it("expires at the exact deadline before checking nonce or budget", () => {
    const input = base(); input.policy.durationSeconds = 60; input.proposal.replayNonce = true;
    expect(simulatePolicy(input).steps[1].verdict.reasonCode).toBe("EXPIRED");
  });
  it.each([
    ["destinationAllowed", false, "DESTINATION_NOT_ALLOWED"],
    ["mintAllowed", false, "MINT_NOT_ALLOWED"],
    ["active", false, "REVOKED"],
  ] as const)("checks %s without advancing state", (key, value, reason) => {
    const input = base(); input.proposal[key] = value;
    const result = simulatePolicy(input);
    expect(result.steps.every(step => step.verdict.reasonCode === reason)).toBe(true);
    expect(result.summary.spentUnits).toBe("0");
    expect(result.summary.nextNonce).toBe(0);
  });
  it("rejects a replay only after the original nonce was consumed", () => {
    const input = base(); input.proposal.replayNonce = true;
    const result = simulatePolicy(input);
    expect(result.steps[0].verdict.reasonCode).toBe("OK");
    expect(result.steps.slice(1).every(step => step.verdict.reasonCode === "NONCE_REPLAY")).toBe(true);
  });
  it("checks transaction count before spend", () => {
    const input = base(); input.policy.maxTransactions = 1; input.policy.spendCapUnits = input.proposal.amountUnits;
    expect(simulatePolicy(input).steps[1].verdict.reasonCode).toBe("TX_CAP_EXCEEDED");
  });
  it("preserves precision beyond JavaScript's safe integer range", () => {
    const input = base(); input.policy.spendCapUnits = "18446744073709551615"; input.proposal.amountUnits = "9007199254740993"; input.proposal.attempts = 2;
    expect(simulatePolicy(input).summary.spentUnits).toBe("18014398509481986");
  });
});

describe("public bounded simulation API", () => {
  const originalKey = process.env.REDLINE_API_KEY;
  afterEach(() => { if (originalKey === undefined) delete process.env.REDLINE_API_KEY; else process.env.REDLINE_API_KEY = originalKey; });
  it("works without a wallet even when execution endpoints require authentication", async () => {
    process.env.REDLINE_API_KEY = "test-key";
    const app = Fastify(); registerAuth(app); await app.register(simulationRoutes);
    app.post("/runs", async () => ({ ok: true }));
    try {
      const response = await app.inject({ method: "POST", url: "/policy/simulate", headers: { authorization: "Bearer irrelevant-to-stateless-simulation" }, payload: base() });
      expect(response.statusCode).toBe(200); expect(response.json().mode).toBe("simulation");
      expect((await app.inject({ method: "POST", url: "/runs" })).statusCode).toBe(401);
      const catalog = (await app.inject({ url: "/policy/presets" })).json();
      expect(catalog.presets).toHaveLength(3);
      for (const preset of catalog.presets) expect(SimulationInput.safeParse({ policy: preset.policy, proposal: preset.proposal }).success).toBe(true);
    } finally { await app.close(); }
  });
  it("rejects malformed, overflowing and unbounded inputs with 400", async () => {
    const app = Fastify(); await app.register(simulationRoutes);
    const payloads = [
      { ...base(), proposal: { ...base().proposal, attempts: 51 } },
      { ...base(), proposal: { ...base().proposal, amountUnits: "18446744073709551616" } },
      { ...base(), proposal: { ...base().proposal, amountUnits: "0" } },
      { ...base(), proposal: { ...base().proposal, amountUnits: "-1" } },
      ...["not-a-number", "1.5", "1e6", "", "01", " 1"].map(amountUnits => ({ ...base(), proposal: { ...base().proposal, amountUnits } })),
      { ...base(), proposal: { ...base().proposal, intervalSeconds: -1 } },
      { ...base(), policy: { ...base().policy, maxTransactions: 1.5 } },
      { ...base(), policy: { ...base().policy, durationSeconds: 0 } },
      { ...base(), grantId: "must-not-touch-a-real-grant" },
    ];
    try { for (const payload of payloads) expect((await app.inject({ method: "POST", url: "/policy/simulate", payload })).statusCode).toBe(400); }
    finally { await app.close(); }
  });
});
