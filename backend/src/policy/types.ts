// Shared shapes for the policy engine, chain adapters and runtime.
// Units are raw token base units (e.g. 1 USDC = 1_000_000 with 6 decimals).

export interface GrantLimits {
  spendCapUnits: bigint;
  maxTransactions: number;
  cooldownSeconds: number;
  expiresAt: number; // unix seconds
  allowedMints: string[];
  allowedDestinations: string[];
}

export interface GrantState extends GrantLimits {
  grantPda: string;
  executor: string;
  active: boolean;
  spentUnits: bigint;
  transactionCount: number;
  nextNonce: number;
  lastExecutionAt: number; // unix seconds, 0 if never
}

export interface Intent {
  grantPda: string;
  mint: string;
  amountUnits: bigint;
  destination: string;
  nonce: number;
  reason?: string;
}

/**
 * The extra rules a grant needs before its agent may trade rather than only
 * transfer. Held in its own account (a `SwapPolicy` PDA beside the grant)
 * rather than inside `Grant`, so turning swaps on does not change the layout
 * of grants that already exist on-chain.
 *
 * `null` means this grant may not swap at all — which is the default, and the
 * state every grant signed before swaps existed is in.
 */
export interface SwapPolicy {
  /**
   * DEX programs this grant may route through. An empty list is not "any
   * program"; it is "no swaps", because "whatever program the agent names" is
   * the permission REDLINE exists to refuse.
   */
  allowedPrograms: string[];
  /**
   * Worst acceptable execution, in basis points below the quote the agent
   * proposed. The program enforces the resulting minimum against what actually
   * landed, so a sandwich that eats more than this reverts the whole swap.
   */
  maxSlippageBps: number;
}

/**
 * A proposed trade: spend `amountInUnits` of `inputMint`, receive at least
 * `minOutUnits` of `outputMint`, routed through `program`.
 *
 * There is no destination. A swap's output must come back to the vault it was
 * funded from — sending it anywhere else is a transfer wearing a trade's
 * clothes, and the transfer gates already cover that case.
 */
export interface SwapIntent {
  grantPda: string;
  inputMint: string;
  outputMint: string;
  amountInUnits: bigint;
  /** What the agent quoted before slippage. Used to derive the floor. */
  quotedOutUnits: bigint;
  program: string;
  nonce: number;
  reason?: string;
}

// Mirrors the program's error enum, in gate order. The first failing gate wins.
export type ReasonCode =
  | "OK"
  | "REVOKED"
  | "EXPIRED"
  | "NONCE_REPLAY"
  | "MINT_NOT_ALLOWED"
  | "DESTINATION_NOT_ALLOWED"
  | "TX_CAP_EXCEEDED"
  | "SPEND_CAP_EXCEEDED"
  | "COOLDOWN_ACTIVE"
  // Swap-only gates. Appended rather than interleaved so every existing
  // reason code keeps its meaning and its on-chain error number.
  | "SWAPS_NOT_ENABLED"
  | "PROGRAM_NOT_ALLOWED"
  | "OUTPUT_MINT_NOT_ALLOWED"
  | "SLIPPAGE_EXCEEDED"
  // Not a gate: the chain rejected the transaction for a reason outside the
  // policy (an Anchor framework error, a missing account). Kept distinct so an
  // infrastructure failure is never reported as an owner's policy decision.
  | "CHAIN_ERROR";

export interface Verdict {
  allow: boolean;
  reasonCode: ReasonCode;
  gate: number; // 0 = passed all, 1..7 = index of failed gate
  message: string;
}
