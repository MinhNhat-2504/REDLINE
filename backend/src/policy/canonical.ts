import { createHash } from "node:crypto";
import { z } from "zod";
import { SolanaAddressSchema } from "../validation.js";

// The policy the owner reviews in the UI. Same field set as the frontend's
// AgentPolicyInput plus the on-chain allowlists; hashing must stay identical
// to src/app/lib/risk-engine.ts policyDigest so the UI and API agree.

export const PolicySchema = z.object({
  agentName: z.string().trim().min(1).max(80),
  strategy: z.string().trim().min(1).max(200),
  tokens: z.array(z.string().max(12)).min(1).max(8),
  spendCapUsdc: z.number().min(10).max(100_000),
  maxTransactions: z.number().int().min(1).max(1_000),
  durationHours: z.number().int().min(1).max(168),
  cooldownMinutes: z.number().int().min(0).max(120), // 0 allowed for fast Devnet demos; UI keeps its own floor
  allowedMints: z.array(SolanaAddressSchema).min(1).max(4),
  allowedDestinations: z.array(SolanaAddressSchema).min(1).max(4),
});
export type PolicyInput = z.infer<typeof PolicySchema>;

export const USDC_DECIMALS = 6;

export function canonicalPolicy(p: PolicyInput): string {
  return JSON.stringify({
    agentName: p.agentName.trim(),
    strategy: p.strategy.trim(),
    tokens: [...p.tokens].sort(),
    spendCapUsdc: p.spendCapUsdc,
    maxTransactions: p.maxTransactions,
    durationHours: p.durationHours,
    cooldownMinutes: p.cooldownMinutes,
    allowedMints: [...p.allowedMints].sort(),
    allowedDestinations: [...p.allowedDestinations].sort(),
  });
}

export function policyHash(p: PolicyInput): string {
  return createHash("sha256").update(canonicalPolicy(p)).digest("hex");
}

export function toGrantLimits(p: PolicyInput, nowSeconds: number) {
  return {
    spendCapUnits: BigInt(Math.round(p.spendCapUsdc * 10 ** USDC_DECIMALS)),
    maxTransactions: p.maxTransactions,
    cooldownSeconds: p.cooldownMinutes * 60,
    expiresAt: nowSeconds + p.durationHours * 3600,
    allowedMints: p.allowedMints,
    allowedDestinations: p.allowedDestinations,
  };
}
