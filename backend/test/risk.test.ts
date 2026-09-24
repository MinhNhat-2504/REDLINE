import Fastify from "fastify";
import { ZodError } from "zod";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAX_MODEL_RAISE, mergeAssessments, riskRoutes } from "../src/routes/risk.js";

const originalApiKey = process.env.OPENAI_API_KEY;

const safePolicy = {
  agentName: "Treasury Scout",
  strategy: "Monitor stablecoin yield and request approval before rebalancing",
  tokens: ["SOL", "USDC"],
  spendCapUsdc: 500,
  maxTransactions: 25,
  durationHours: 12,
  cooldownMinutes: 10,
};

async function build() {
  const app = Fastify({ logger: false });
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: "Invalid input" });
    return reply.code(err.statusCode ?? 500).send({ error: err.message });
  });
  await app.register(riskRoutes);
  await app.ready();
  return app;
}

// No OPENAI_API_KEY: the route must answer from the deterministic rules alone.
beforeEach(() => { delete process.env.OPENAI_API_KEY; });
afterEach(() => {
  if (originalApiKey) process.env.OPENAI_API_KEY = originalApiKey;
  else delete process.env.OPENAI_API_KEY;
});

describe("POST /risk-assess", () => {
  it("returns a deterministic allow verdict when OpenAI is not configured", async () => {
    const app = await build();
    const res = await app.inject({ method: "POST", url: "/risk-assess", payload: safePolicy });
    const body = res.json();

    expect(res.statusCode).toBe(200);
    expect(body.decision).toBe("ALLOW");
    expect(body.source).toBe("deterministic-fallback");
  });

  it("blocks a high-blast-radius policy", async () => {
    const app = await build();
    const res = await app.inject({
      method: "POST",
      url: "/risk-assess",
      payload: {
        ...safePolicy,
        strategy: "Leveraged cross-chain flash arbitrage",
        tokens: ["SOL", "USDC", "JUP", "JTO", "BONK", "PYTH"],
        spendCapUsdc: 50_000,
        maxTransactions: 800,
        durationHours: 168,
        cooldownMinutes: 1,
      },
    });
    const body = res.json();

    expect(res.statusCode).toBe(200);
    expect(body.decision).toBe("BLOCK");
    expect(body.score).toBe(100);
  });

  // The middle band is the one grant registration acts on: it recomputes this
  // verdict itself, so a browser that skips the acceptance prompt cannot also
  // report the policy as ALLOW.
  it("puts a broad but not extreme policy in REVIEW", async () => {
    const app = await build();
    const res = await app.inject({
      method: "POST",
      url: "/risk-assess",
      // A cap at the pilot ceiling is REVIEW on its own (60); a generous
      // transaction allowance keeps it there (69) without tipping into BLOCK.
      payload: { ...safePolicy, spendCapUsdc: 10_000, maxTransactions: 150 },
    });
    const body = res.json();

    expect(body.decision).toBe("REVIEW");
    expect(body.score).toBeGreaterThanOrEqual(60);
    expect(body.score).toBeLessThan(80);
  });

  it("rejects malformed input", async () => {
    const app = await build();
    expect((await app.inject({ method: "POST", url: "/risk-assess", payload: {} })).statusCode).toBe(400);
    expect((await app.inject({
      method: "POST",
      url: "/risk-assess",
      payload: { ...safePolicy, spendCapUsdc: 1 },
    })).statusCode).toBe(400);
  });
});

describe("deterministic floor", () => {
  it("keeps deterministic rules as a non-reducible safety floor", () => {
    const baseline = {
      score: 100,
      level: "CRITICAL" as const,
      decision: "BLOCK" as const,
      summary: "Policy exceeds the safety envelope.",
      findings: ["High transaction allowance increases blast radius."],
      recommendations: ["Reduce the transaction ceiling."],
      source: "deterministic-fallback",
      model: "redline-rules-v1",
    };
    const optimisticAi = {
      score: 12,
      level: "LOW" as const,
      decision: "ALLOW" as const,
      summary: "Looks safe.",
      findings: ["Short explanation."],
      recommendations: ["Monitor it."],
      source: "openai",
      model: "test-model",
    };
    const merged = mergeAssessments(baseline, optimisticAi, "test-model");

    expect(merged.decision).toBe("BLOCK");
    expect(merged.level).toBe("CRITICAL");
    expect(merged.score).toBe(100);
    expect(merged.source).toBe("openai+deterministic-floor");
  });

  // Observed live against a real model on identical input: 8/LOW/ALLOW, then
  // 70/LOW/ALLOW, then 60/MEDIUM/REVIEW. An LLM is entitled to be noisy — the
  // floor exists because it is. What the merge must not do is publish the
  // noise as a contradiction: a score in the BLOCK band beside a green verdict
  // reads as safe to the one thing that gates signing.
  it("never returns a score that disagrees with its own verdict", () => {
    const calm = {
      score: 8, level: "LOW" as const, decision: "ALLOW" as const,
      summary: "Bounded.", findings: ["Narrow scope."], recommendations: ["Keep alerts on."],
      source: "deterministic-fallback", model: "redline-rules-v1",
    };
    const incoherent = [
      { score: 85, level: "LOW" as const, decision: "ALLOW" as const },
      { score: 70, level: "LOW" as const, decision: "ALLOW" as const },
      { score: 60, level: "MEDIUM" as const, decision: "REVIEW" as const },
      { score: 95, level: "MEDIUM" as const, decision: "REVIEW" as const },
    ];
    for (const ai of incoherent) {
      const m = mergeAssessments(calm, { ...ai, summary: "s", findings: ["f"], recommendations: ["r"], source: "openai", model: "test" }, "test");
      const expectedDecision = m.score >= 80 ? "BLOCK" : m.score >= 60 ? "REVIEW" : "ALLOW";
      const expectedLevel = m.score >= 80 ? "CRITICAL" : m.score >= 60 ? "HIGH" : m.score >= 35 ? "MEDIUM" : "LOW";
      expect(m.decision, `score ${m.score}`).toBe(expectedDecision);
      expect(m.level, `score ${m.score}`).toBe(expectedLevel);
    }
  });

  it("lets the model raise severity above the baseline", () => {
    // 45 → 65: inside what the model is allowed to add, and across a boundary.
    const baseline = {
      score: 45,
      level: "MEDIUM" as const,
      decision: "ALLOW" as const,
      summary: "Bounded.",
      findings: ["Narrow scope."],
      recommendations: ["Keep alerts on."],
      source: "deterministic-fallback",
      model: "redline-rules-v1",
    };
    const strictAi = {
      score: 65,
      level: "HIGH" as const,
      decision: "REVIEW" as const,
      summary: "Destination allowlist is unusually broad.",
      findings: ["Broad destination set."],
      recommendations: ["Require human approval."],
      source: "openai",
      model: "test-model",
    };
    const merged = mergeAssessments(baseline, strictAi, "test-model");

    expect(merged.decision).toBe("REVIEW");
    expect(merged.level).toBe("HIGH");
    expect(merged.score).toBe(65);
    expect(merged.summary).toBe("Destination allowlist is unusually broad.");
  });
});

describe("mergeAssessments — the sentence belongs to the verdict", () => {
  const base = { findings: ["f"], recommendations: ["r"], source: "x", model: "m" };

  it("does not caption a REVIEW with the baseline's ALLOW sentence", () => {
    // The model scores it 70 but writes ALLOW; the merge makes it REVIEW, and
    // neither side's sentence fits, so the canonical one is used.
    const merged = mergeAssessments(
      { ...base, score: 50, level: "MEDIUM", decision: "ALLOW", summary: "Policy is bounded enough for a monitored Devnet pilot." },
      { ...base, score: 70, level: "LOW", decision: "ALLOW", summary: "Looks fine to me." },
      "m",
    );
    expect(merged.decision).toBe("REVIEW");
    expect(merged.summary).not.toMatch(/bounded enough|looks fine/i);
    expect(merged.summary).toMatch(/review/i);
  });

  it("keeps the model's own sentence when the verdict is the model's", () => {
    const merged = mergeAssessments(
      { ...base, score: 50, level: "MEDIUM", decision: "ALLOW", summary: "baseline says allow" },
      { ...base, score: 65, level: "HIGH", decision: "REVIEW", summary: "Window is long for this cap." },
      "m",
    );
    expect(merged.summary).toBe("Window is long for this cap.");
  });

  it("keeps the baseline's sentence when the floor is what decided", () => {
    const merged = mergeAssessments(
      { ...base, score: 94, level: "CRITICAL", decision: "BLOCK", summary: "Policy exceeds the safety envelope and should not be signed." },
      { ...base, score: 10, level: "LOW", decision: "ALLOW", summary: "All good." },
      "m",
    );
    expect(merged.decision).toBe("BLOCK");
    expect(merged.summary).toMatch(/should not be signed/);
  });
});

describe("mergeAssessments — how far the model may move the rules", () => {
  const base = { findings: ["f"], recommendations: ["r"], source: "x", model: "m", summary: "s" };

  it("cannot turn a LOW policy into a BLOCK", () => {
    // The live case: 500 USDC, six transfers, 24 hours, two-minute cooldown.
    // The rules say 28. The model said 90 and the sign button locked.
    const merged = mergeAssessments(
      { ...base, score: 28, level: "LOW", decision: "ALLOW" },
      { ...base, score: 90, level: "CRITICAL", decision: "BLOCK" },
      "m",
    );
    expect(merged.score).toBe(28 + MAX_MODEL_RAISE);
    expect(merged.decision).toBe("ALLOW");
    expect(merged.level).toBe("MEDIUM");
  });

  it("can still tip a policy that is already near a boundary", () => {
    const merged = mergeAssessments(
      { ...base, score: 60, level: "HIGH", decision: "REVIEW" },
      { ...base, score: 95, level: "CRITICAL", decision: "BLOCK" },
      "m",
    );
    expect(merged.decision).toBe("BLOCK");
    expect(merged.score).toBe(85);
  });

  it("bounds a harsh verdict the same as a harsh score", () => {
    // "12, but BLOCK" is the model meaning at least 80 — and is bounded as 80.
    const merged = mergeAssessments(
      { ...base, score: 8, level: "LOW", decision: "ALLOW" },
      { ...base, score: 12, level: "LOW", decision: "BLOCK" },
      "m",
    );
    expect(merged.decision).toBe("ALLOW");
    expect(merged.score).toBe(8 + MAX_MODEL_RAISE);
  });

  it("never lowers what the rules decided", () => {
    const merged = mergeAssessments(
      { ...base, score: 78, level: "HIGH", decision: "REVIEW" },
      { ...base, score: 5, level: "LOW", decision: "ALLOW" },
      "m",
    );
    expect(merged).toMatchObject({ score: 78, decision: "REVIEW", level: "HIGH" });
  });
});
