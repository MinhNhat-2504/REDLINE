import { API_URL } from "./api";

export type RiskDecision = "ALLOW" | "REVIEW" | "BLOCK";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AgentPolicyInput {
  agentName: string;
  strategy: string;
  tokens: string[];
  spendCapUsdc: number;
  maxTransactions: number;
  durationHours: number;
  cooldownMinutes: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  decision: RiskDecision;
  summary: string;
  findings: string[];
  recommendations: string[];
  source: "openai" | "openai+deterministic-floor" | "deterministic-fallback";
  model: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function validatePolicy(input: AgentPolicyInput): string[] {
  const errors: string[] = [];
  if (!input.agentName.trim() || input.agentName.length > 80) errors.push("Agent name must be 1–80 characters.");
  if (!input.strategy.trim() || input.strategy.length > 200) errors.push("Strategy must be 1–200 characters.");
  if (input.tokens.length < 1 || input.tokens.length > 8) errors.push("Choose between 1 and 8 tokens.");
  if (!Number.isFinite(input.spendCapUsdc) || input.spendCapUsdc < 10 || input.spendCapUsdc > 100_000) errors.push("Spend cap is outside the supported range.");
  if (!Number.isInteger(input.maxTransactions) || input.maxTransactions < 1 || input.maxTransactions > 1_000) errors.push("Transaction limit is outside the supported range.");
  if (!Number.isInteger(input.durationHours) || input.durationHours < 1 || input.durationHours > 168) errors.push("Duration is outside the supported range.");
  if (!Number.isInteger(input.cooldownMinutes) || input.cooldownMinutes < 1 || input.cooldownMinutes > 120) errors.push("Cooldown is outside the supported range.");
  return errors;
}

export function assessPolicyLocally(input: AgentPolicyInput): RiskAssessment {
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
  if (input.spendCapUsdc >= 10_000) {
    score += 52;
    findings.push("Spend cap is at or above the 10,000 USDC pilot ceiling, and nothing limits a single transfer: the whole cap can leave at once.");
    recommendations.push("Stage capital: start with a smaller cap and raise it once the agent has a record.");
  } else if (input.spendCapUsdc >= 5_000) {
    score += 30;
    findings.push("Large single-transfer exposure: nothing limits one transfer below the cap.");
  } else if (input.spendCapUsdc > 2_500) {
    score += 14;
    findings.push("Spend cap creates meaningful treasury exposure.");
  } else if (input.spendCapUsdc > 1_000) {
    score += 6;
  }

  if (input.maxTransactions > 250) {
    score += 18;
    findings.push("High transaction allowance increases blast radius.");
    recommendations.push("Reduce the transaction ceiling or shorten the validity window.");
  } else if (input.maxTransactions > 100) {
    score += 9;
  }

  if (input.durationHours > 72) {
    score += 16;
    findings.push("The authorization remains active for more than three days.");
  } else if (input.durationHours > 24) {
    score += 7;
  }

  if (input.cooldownMinutes < 3) {
    score += 20;
    findings.push("Sub-three-minute cooldown can amplify repeated execution errors.");
    recommendations.push("Use a cooldown of at least five minutes during the pilot.");
  } else if (input.cooldownMinutes < 5) {
    score += 8;
  }

  if (input.tokens.length > 4) {
    score += 9;
    findings.push("A broad token scope increases contract and liquidity risk.");
  }

  if (/flash|leverage|perp|arbitrage|cross-chain/.test(strategy)) {
    score += 18;
    findings.push("The selected strategy is sensitive to slippage, latency, or leverage.");
    recommendations.push("Require simulation and human review before high-impact execution.");
  }

  const finalScore = clamp(score);
  const level: RiskLevel = finalScore >= 80 ? "CRITICAL" : finalScore >= 60 ? "HIGH" : finalScore >= 35 ? "MEDIUM" : "LOW";
  const decision: RiskDecision = finalScore >= 80 ? "BLOCK" : finalScore >= 60 ? "REVIEW" : "ALLOW";

  if (findings.length === 0) findings.push("Policy scope is narrow and time-bounded for a pilot deployment.");
  if (recommendations.length === 0) recommendations.push("Keep transaction simulation and anomaly alerts enabled.");

  return {
    score: finalScore,
    level,
    decision,
    summary: decision === "ALLOW"
      ? "Policy is bounded enough for a monitored Devnet pilot."
      : decision === "REVIEW"
        ? "Policy requires a human review before signing."
        : "Policy exceeds the current safety envelope and should not be signed.",
    findings,
    recommendations,
    source: "deterministic-fallback",
    model: "redline-rules-v1",
  };
}

export async function requestRiskAssessment(input: AgentPolicyInput): Promise<RiskAssessment> {
  const validationErrors = validatePolicy(input);
  if (validationErrors.length) throw new Error(validationErrors.join(" "));

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${API_URL}/risk-assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Risk service returned ${response.status}.`);
    const data = await response.json() as RiskAssessment;
    if (!Number.isFinite(data.score) || !data.decision || !Array.isArray(data.findings)) {
      throw new Error("Risk service returned an invalid response.");
    }
    return data;
  } catch {
    return assessPolicyLocally(input);
  } finally {
    window.clearTimeout(timeout);
  }
}
