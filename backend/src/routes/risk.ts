import type { FastifyInstance } from "fastify";
import { askForJson, isConfigured, modelName } from "../llm-client.js";
import { z } from "zod";

// The single origin for the frontend's risk copilot: the dashboard is a static
// site with no serverless functions of its own, so it calls this route.
// Deterministic floor first — the model can only raise severity, never lower it.

const Input = z.object({
  agentName: z.string().trim().min(1).max(80),
  strategy: z.string().trim().min(1).max(200),
  tokens: z.array(z.string().max(12)).min(1).max(8),
  spendCapUsdc: z.number().min(10).max(100_000),
  maxTransactions: z.number().int().min(1).max(1_000),
  durationHours: z.number().int().min(1).max(168),
  cooldownMinutes: z.number().int().min(1).max(120),
});
type RiskInput = z.infer<typeof Input>;

type Decision = "ALLOW" | "REVIEW" | "BLOCK";
type Level = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
interface Assessment { score: number; level: Level; decision: Decision; summary: string; findings: string[]; recommendations: string[]; source: string; model: string }

// Exported so grant registration can recompute the floor for itself instead of
// trusting the verdict a browser reports.
export function deterministic(input: RiskInput): Assessment {
  let score = 8;
  const findings: string[] = [];
  const recommendations: string[] = [];
  const strategy = input.strategy.toLowerCase();
  // The cap is weighted hardest because the program has no per-transfer limit:
  // gate 6 only asks whether the running total stays under the cap, so the
  // FIRST transfer may take all of it. Cooldown and the transaction count slow
  // nothing down until that transfer has already happened. The old weights
  // treated the cap as one knob among six, and the heaviest tier was "> 10,000"
  // — unreachable from a wizard whose slider stops at exactly 10,000 — so the
  // largest policy the product can build scored 22 and was waved through.
  if (input.spendCapUsdc >= 10_000) { score += 52; findings.push("Spend cap is at or above the 10,000 USDC pilot ceiling, and nothing limits a single transfer: the whole cap can leave at once."); recommendations.push("Stage capital: start with a smaller cap and raise it once the agent has a record."); }
  else if (input.spendCapUsdc >= 5_000) { score += 30; findings.push("Large single-transfer exposure: nothing limits one transfer below the cap."); }
  else if (input.spendCapUsdc > 2_500) score += 14;
  else if (input.spendCapUsdc > 1_000) score += 6;
  if (input.maxTransactions > 250) { score += 18; findings.push("High transaction allowance increases blast radius."); }
  else if (input.maxTransactions > 100) score += 9;
  if (input.durationHours > 72) score += 16; else if (input.durationHours > 24) score += 7;
  if (input.cooldownMinutes < 3) { score += 20; findings.push("Very short cooldown can amplify repeated execution errors."); recommendations.push("Use at least a five-minute cooldown during the pilot."); }
  else if (input.cooldownMinutes < 5) score += 8;
  if (input.tokens.length > 4) score += 9;
  if (/flash|leverage|perp|arbitrage|cross-chain/.test(strategy)) { score += 18; findings.push("Strategy is sensitive to slippage, latency, or leverage."); recommendations.push("Require simulation and human review before execution."); }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: Level = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const decision: Decision = score >= 80 ? "BLOCK" : score >= 60 ? "REVIEW" : "ALLOW";
  if (!findings.length) findings.push("Policy scope is narrow and time-bounded for a pilot.");
  if (!recommendations.length) recommendations.push("Keep simulation and anomaly alerts enabled.");
  return { score, level, decision, summary: summaryFor(decision), findings, recommendations, source: "deterministic-fallback", model: "redline-rules-v1" };
}

const summaryFor = (decision: Decision): string =>
  decision === "ALLOW" ? "Policy is bounded enough for a monitored Devnet pilot."
    : decision === "REVIEW" ? "Policy requires human review before signing."
      : "Policy exceeds the safety envelope and should not be signed.";

const decisionRank: Record<Decision, number> = { ALLOW: 0, REVIEW: 1, BLOCK: 2 };
const levelRank: Record<Level, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

// The same bands deterministic() uses, so a merged verdict cannot disagree
// with the score printed beside it.
const decisionForScore = (score: number): Decision => (score >= 80 ? "BLOCK" : score >= 60 ? "REVIEW" : "ALLOW");
const levelForScore = (score: number): Level => (score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW");
const scoreFloorFor = (decision: Decision): number => (decision === "BLOCK" ? 80 : decision === "REVIEW" ? 60 : 0);
const harsherDecision = (a: Decision, b: Decision): Decision => (decisionRank[a] >= decisionRank[b] ? a : b);
const harsherLevel = (a: Level, b: Level): Level => (levelRank[a] >= levelRank[b] ? a : b);

/** The most the model may add to the deterministic score. One band is 20–25 wide. */
export const MAX_MODEL_RAISE = 25;

export function mergeAssessments(baseline: Assessment, ai: Assessment, model: string): Assessment {
  // Severity only ever goes up, on every axis — and the axes have to agree.
  // Raising the score to match a decision was never enough on its own: a model
  // that answered "85, but ALLOW" produced a critical number beside a green
  // verdict, and signing stayed enabled because only the verdict is read.
  //
  // It also only goes up SO FAR. Seen live: 500 USDC, six transfers, one day —
  // 28 by the rules — came back from the model as 90, BLOCK, and the owner could
  // not sign a policy smaller than most test transfers. A second opinion that
  // can overrule the rules by any margin is not a second opinion, it is the
  // only one, and it is the one that gives a different answer when asked twice.
  // The model may move the score by MAX_MODEL_RAISE: enough to tip a policy
  // that is already near a boundary, never enough to invent a BLOCK from a LOW.
  const meant = Math.max(ai.score, scoreFloorFor(ai.decision)); // "40, but REVIEW" means at least 60
  const raised = Math.max(baseline.score, Math.min(meant, baseline.score + MAX_MODEL_RAISE));
  const decision = harsherDecision(baseline.decision, decisionForScore(raised));
  const score = Math.max(raised, scoreFloorFor(decision));
  const level = harsherLevel(baseline.level, levelForScore(score));

  // The sentence has to belong to the verdict it sits under. The old rule fell
  // back to the baseline's sentence whenever the merge changed anything — so a
  // policy the model pushed into REVIEW was captioned "bounded enough for a
  // pilot", the baseline's ALLOW line, directly beneath a red REVIEW.
  const summary = ai.decision === decision ? ai.summary : baseline.decision === decision ? baseline.summary : summaryFor(decision);
  return { score, level, decision, summary, findings: [...new Set([...baseline.findings, ...ai.findings])].slice(0, 5), recommendations: [...new Set([...baseline.recommendations, ...ai.recommendations])].slice(0, 5), source: "openai+deterministic-floor", model };
}

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    decision: { type: "string", enum: ["ALLOW", "REVIEW", "BLOCK"] },
    summary: { type: "string" },
    findings: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    recommendations: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
  },
  required: ["score", "level", "decision", "summary", "findings", "recommendations"],
};

export async function riskRoutes(app: FastifyInstance) {
  app.post("/risk-assess", async (req) => {
    const input = Input.parse(req.body);
    const baseline = deterministic(input);
    if (!isConfigured()) return baseline;
    try {
      const assessment = await askForJson<Assessment>({
        system: [
          "You are the REDLINE risk copilot for autonomous DeFi agents on Solana.",
          "Assess only operational risk from the supplied policy. Do not predict profit, give investment advice, or invent market data.",
          "Prefer bounded permissions, short validity windows, simulation, allowlists, and human review for high-impact actions.",
          "A BLOCK verdict is appropriate when cumulative blast radius is unacceptable; REVIEW means explicit human approval is required.",
          // The input is only the knobs the owner turned. Without this the
          // model cannot know what is always true of a grant, and it penalised
          // policies for "no address allowlist" — a control the program makes
          // mandatory — so the same 500 USDC policy came back ALLOW on one call
          // and REVIEW on the next.
          "Facts that hold for EVERY policy and are enforced on-chain by the REDLINE program, so never flag them as missing: transfers can only go to an owner-signed allowlist of 1 to 4 destination addresses; only allowlisted token mints can move; every transfer needs the next nonce, so none can be replayed; the grant expires at a fixed time; the owner can revoke it at any moment; funds sit in a program-owned vault and the agent never holds a key to them.",
          // An earlier wording called the missing per-transfer limit "a real
          // limitation to weigh". The model weighed it at +60 on every policy.
          "The spend cap is the worst-case loss, because one transfer may use all of it. That is equally true of every policy and the baseline score already counts it, so do not list it as a finding and do not raise severity for it: judge the SIZE of the cap.",
          "Calibration: a cap under 1,000 USDC open for a day or less is LOW unless another number is extreme. REVIEW is for caps in the thousands combined with a long window or a very short cooldown. BLOCK is for policies near the 10,000 USDC ceiling with several aggravating numbers at once.",
          "Judge only the numbers supplied. Do not restate the always-true facts above as findings, and do not raise severity for controls you were not told about.",
        ].join(" "),
        input,
        schemaName: "redline_agent_risk_assessment",
        schema,
        maxTokens: 700,
        temperature: 0,
      });
      if (!assessment) return baseline;
      return mergeAssessments(baseline, assessment, modelName());
    } catch (err) {
      // Falling back is right — the deterministic floor is the safe answer and
      // the caller still gets a verdict. Staying silent about it was not: a
      // rejected key, a model name that does not exist and no key at all all
      // produced the same reply, so a misconfigured copilot looked exactly
      // like a copilot that was never switched on.
      req.log.warn({ err: err instanceof Error ? err.message : String(err), model: modelName(), baseUrl: process.env.OPENAI_BASE_URL || "openai" }, "risk copilot call failed; answering from the deterministic floor");
      return baseline;
    }
  });
}
