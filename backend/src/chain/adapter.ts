import type { GrantLimits, GrantState, Intent, ReasonCode, SwapIntent, SwapPolicy } from "../policy/types.js";

// The runtime and API talk to the chain only through this interface.
// MockChain applies the same gates in memory so the whole flow works before
// the Anchor program is deployed; SolanaChain sends real transactions.

export interface ExecutionResult {
  signature: string;
  success: boolean;
  reasonCode: ReasonCode;
  error?: string;
  slot?: bigint;
}

/**
 * What a settled swap actually moved.
 *
 * `amountInUnits` and `amountOutUnits` are measured after the route ran, not
 * quoted before it — the whole point of the swap adapter is that these two
 * numbers, and not the instruction that produced them, decide whether the
 * trade was inside the policy.
 */
export interface SwapResult extends ExecutionResult {
  amountInUnits: bigint;
  amountOutUnits: bigint;
}

export interface ChainAdapter {
  readonly kind: "mock" | "solana";
  readonly programId: string;
  readonly executorPubkey: string;
  // agentId is the 16-byte PDA seed (hex) — unique per grant, same as the
  // program's `agent_id` so one owner can hold many grants.
  createGrant(ownerWallet: string, vaultPda: string, agentId: string, limits: GrantLimits, policyHash: string): Promise<{ grantPda: string; signature: string }>;
  readGrant(grantPda: string): Promise<GrantState | null>;
  // Submits execute_transfer. Returns a failed result (never throws) when the
  // program rejects, so the demo can show a deliberately failed transaction.
  executeTransfer(intent: Intent): Promise<ExecutionResult>;
  revokeGrant(grantPda: string): Promise<{ signature: string }>;

  // ── swaps ──
  // Optional: an adapter that cannot trade simply does not implement these,
  // and the routes report that the grant may not swap rather than pretending.

  /** The grant's trading policy, or null when its owner never enabled trading. */
  readSwapPolicy?(grantPda: string): Promise<SwapPolicy | null>;
  /** Owner-signed: turn trading on for one grant. */
  createSwapPolicy?(grantPda: string, policy: SwapPolicy): Promise<{ signature: string }>;
  /** Executor-signed: route a trade and judge it on the balances it produced. */
  executeSwap?(intent: SwapIntent): Promise<SwapResult>;
}
