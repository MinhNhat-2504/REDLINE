import { createHash } from "node:crypto";
import type { GrantState, Intent, ReasonCode, SwapIntent, SwapPolicy, Verdict } from "./types.js";

// Off-chain mirror of the on-chain gates in programs/redline_guardrails.
// This engine is advisory: it lets the runtime explain a rejection before
// paying for a transaction. The program remains the only authority.
//
// Gate order matches ERD §02 and the Rust `require!` sequence exactly, so a
// precheck reason code always equals the program error the chain would return.

// Exported as the runtime roll-call of every reason code: the protocol
// gate map is tested against it, so a new code cannot be added without
// deciding whether a gate owns it.
export const MESSAGES: Record<ReasonCode, string> = {
  OK: "All gates passed.",
  REVOKED: "Grant has been revoked by the owner.",
  EXPIRED: "Grant validity window has ended.",
  NONCE_REPLAY: "Intent nonce does not match the grant's next nonce.",
  MINT_NOT_ALLOWED: "Token mint is not on the grant allowlist.",
  DESTINATION_NOT_ALLOWED: "Destination is not on the grant allowlist.",
  TX_CAP_EXCEEDED: "Transaction count would exceed the grant cap.",
  SPEND_CAP_EXCEEDED: "Cumulative spend would exceed the grant cap.",
  COOLDOWN_ACTIVE: "Cooldown since the last execution has not elapsed.",
  CHAIN_ERROR: "The chain rejected the transaction for a reason outside the policy.",
  SWAPS_NOT_ENABLED: "This grant authorises transfers only — the owner has not enabled trading.",
  PROGRAM_NOT_ALLOWED: "That DEX program is not on the grant allowlist.",
  OUTPUT_MINT_NOT_ALLOWED: "The token this swap would buy is not on the grant allowlist.",
  SLIPPAGE_EXCEEDED: "The quote is worse than the slippage the owner allowed.",
};

function fail(gate: number, reasonCode: ReasonCode): Verdict {
  return { allow: false, reasonCode, gate, message: MESSAGES[reasonCode] };
}

export function evaluateIntent(grant: GrantState, intent: Intent, nowSeconds: number): Verdict {
  if (!grant.active) return fail(1, "REVOKED");
  if (nowSeconds >= grant.expiresAt) return fail(2, "EXPIRED");
  if (intent.nonce !== grant.nextNonce) return fail(3, "NONCE_REPLAY");
  if (!grant.allowedMints.includes(intent.mint)) return fail(4, "MINT_NOT_ALLOWED");
  if (!grant.allowedDestinations.includes(intent.destination)) return fail(5, "DESTINATION_NOT_ALLOWED");
  if (grant.transactionCount >= grant.maxTransactions) return fail(6, "TX_CAP_EXCEEDED");
  if (grant.spentUnits + intent.amountUnits > grant.spendCapUnits) return fail(6, "SPEND_CAP_EXCEEDED");
  if (grant.lastExecutionAt > 0 && nowSeconds - grant.lastExecutionAt < grant.cooldownSeconds) {
    return fail(7, "COOLDOWN_ACTIVE");
  }
  return { allow: true, reasonCode: "OK", gate: 0, message: MESSAGES.OK };
}

/**
 * The least output a swap may return and still be allowed.
 *
 * Derived from the agent's own quote, so the floor moves with the market
 * instead of being a number the owner has to re-sign every hour. The program
 * checks the result against this, not against the quote: a quote is a claim,
 * a post-swap balance is a fact.
 */
export function minimumOut(quotedOutUnits: bigint, maxSlippageBps: number): bigint {
  if (quotedOutUnits <= 0n) return 0n;
  const bps = BigInt(Math.max(0, Math.min(10_000, Math.round(maxSlippageBps))));
  return (quotedOutUnits * (10_000n - bps)) / 10_000n;
}

/**
 * Gates for a trade. The first seven are the transfer gates, unchanged and in
 * the same order, because a swap is still a spend: it must respect the cap,
 * the transaction count, the cooldown, the expiry and the revocation exactly
 * as a transfer does. What follows are the three a trade adds.
 *
 * Gate 5 is where the two differ. A transfer asks "may the money go there?";
 * a swap has no destination — the output returns to the vault — so the
 * equivalent question is "may this grant buy that token?", and it is asked
 * against the same mint allowlist. An allowlist that says USDC and SOL
 * therefore permits trading between them and nothing else, which is the
 * property an owner can actually reason about.
 */
export function evaluateSwap(
  grant: GrantState,
  policy: SwapPolicy | null,
  intent: SwapIntent,
  nowSeconds: number,
): Verdict {
  if (!grant.active) return fail(1, "REVOKED");
  if (nowSeconds >= grant.expiresAt) return fail(2, "EXPIRED");
  if (intent.nonce !== grant.nextNonce) return fail(3, "NONCE_REPLAY");
  if (!grant.allowedMints.includes(intent.inputMint)) return fail(4, "MINT_NOT_ALLOWED");

  // Trading is off unless the owner turned it on for this grant. A grant
  // signed before swaps existed has no policy, and silently treating that as
  // permission would widen every permission already in the wild.
  if (!policy || policy.allowedPrograms.length === 0) return fail(5, "SWAPS_NOT_ENABLED");
  if (!policy.allowedPrograms.includes(intent.program)) return fail(5, "PROGRAM_NOT_ALLOWED");
  if (!grant.allowedMints.includes(intent.outputMint)) return fail(5, "OUTPUT_MINT_NOT_ALLOWED");

  if (grant.transactionCount >= grant.maxTransactions) return fail(6, "TX_CAP_EXCEEDED");
  const newSpent = grant.spentUnits + intent.amountInUnits;
  if (newSpent > grant.spendCapUnits) return fail(6, "SPEND_CAP_EXCEEDED");
  if (grant.lastExecutionAt > 0 && nowSeconds - grant.lastExecutionAt < grant.cooldownSeconds) {
    return fail(7, "COOLDOWN_ACTIVE");
  }

  // A quote that already prices in more slippage than the owner allowed is
  // refused before it costs a transaction fee. The binding check is still the
  // on-chain one against the balance that actually landed.
  if (minimumOut(intent.quotedOutUnits, policy.maxSlippageBps) <= 0n) return fail(8, "SLIPPAGE_EXCEEDED");

  return { allow: true, reasonCode: "OK", gate: 0, message: MESSAGES.OK };
}

/**
 * Did the swap that settled honour the policy?
 *
 * This is the check the program performs on real balances after the DEX has
 * run, mirrored here so the runtime can explain a revert. It is the whole
 * reason the adapter does not parse DEX instructions: whatever the route did,
 * these two numbers are what the vault actually gave up and got back.
 */
export function checkSwapSettlement(
  spentIn: bigint,
  receivedOut: bigint,
  intent: SwapIntent,
  policy: SwapPolicy,
): Verdict {
  if (spentIn > intent.amountInUnits) {
    return { allow: false, reasonCode: "SPEND_CAP_EXCEEDED", gate: 6, message: `The route spent ${spentIn} units, more than the ${intent.amountInUnits} authorised.` };
  }
  const floor = minimumOut(intent.quotedOutUnits, policy.maxSlippageBps);
  if (receivedOut < floor) {
    return { allow: false, reasonCode: "SLIPPAGE_EXCEEDED", gate: 8, message: `The swap returned ${receivedOut} units, below the ${floor} floor this policy allows.` };
  }
  return { allow: true, reasonCode: "OK", gate: 0, message: MESSAGES.OK };
}

// Pure state transition applied after an ALLOW. Used by MockChain and by the
// DB mirror so both stay byte-identical with the program's counter updates.
export function applyExecution(grant: GrantState, intent: Intent, nowSeconds: number): GrantState {
  return {
    ...grant,
    spentUnits: grant.spentUnits + intent.amountUnits,
    transactionCount: grant.transactionCount + 1,
    nextNonce: grant.nextNonce + 1,
    lastExecutionAt: nowSeconds,
  };
}

// Canonical hash of an intent. Field order is fixed; bigint rendered as decimal.
export function intentHash(intent: Intent): string {
  const canonical = JSON.stringify({
    grantPda: intent.grantPda,
    mint: intent.mint,
    amountUnits: intent.amountUnits.toString(),
    destination: intent.destination,
    nonce: intent.nonce,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

// Hash of the rule set in force when a decision was made — stored with every
// decision so an auditor can prove which limits applied.
export function ruleSnapshotHash(grant: GrantState): string {
  const canonical = JSON.stringify({
    spendCapUnits: grant.spendCapUnits.toString(),
    maxTransactions: grant.maxTransactions,
    cooldownSeconds: grant.cooldownSeconds,
    expiresAt: grant.expiresAt,
    allowedMints: [...grant.allowedMints].sort(),
    allowedDestinations: [...grant.allowedDestinations].sort(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
