import { createHash, randomBytes } from "node:crypto";
import { nowSeconds } from "../clock.js";
import { applyExecution, checkSwapSettlement, evaluateIntent, evaluateSwap, minimumOut } from "../policy/engine.js";
import type { GrantLimits, GrantState, Intent, SwapIntent, SwapPolicy } from "../policy/types.js";
import type { ChainAdapter, ExecutionResult, SwapResult } from "./adapter.js";

// In-memory stand-in for the deployed program. Same gate order, same counter
// updates, same "reject = nothing moves" rule. Signatures are fake base58-ish
// strings prefixed MOCK so nobody mistakes them for Devnet evidence.

function fakeSignature(): string {
  return `MOCK${randomBytes(40).toString("base64url").replace(/[-_]/g, "x").slice(0, 84)}`;
}

function derivePda(...seeds: string[]): string {
  return `mock${createHash("sha256").update(seeds.join("|")).digest("base64url").slice(0, 40)}`;
}

export class MockChain implements ChainAdapter {
  readonly kind = "mock" as const;
  readonly programId = "MockRedline11111111111111111111111111111111";
  readonly executorPubkey: string;
  private grants = new Map<string, GrantState>();
  private swapPolicies = new Map<string, SwapPolicy>();
  // Pretend liquidity: how much output one unit of input buys, and how much
  // worse the fill lands than the quote. Both are knobs so a demo can show
  // a good fill and a sandwiched one without waiting for a real pool.
  private fillRatioBps = 10_000;
  private slot = 1_000n;
  private now: () => number;

  constructor(executorPubkey = "MockExecutor1111111111111111111111111111111", now = nowSeconds) {
    this.executorPubkey = executorPubkey;
    this.now = now;
  }

  async createGrant(ownerWallet: string, vaultPda: string, agentId: string, limits: GrantLimits, policyHash: string) {
    const grantPda = derivePda("grant", ownerWallet, agentId);
    if (this.grants.has(grantPda)) throw new Error("grant PDA already exists");
    void vaultPda; void policyHash; // stored on the real account; irrelevant to the mock key
    this.grants.set(grantPda, {
      ...limits,
      grantPda,
      executor: this.executorPubkey,
      active: true,
      spentUnits: 0n,
      transactionCount: 0,
      nextNonce: 0,
      lastExecutionAt: 0,
    });
    return { grantPda, signature: fakeSignature() };
  }

  async readGrant(grantPda: string) {
    const g = this.grants.get(grantPda);
    return g ? { ...g } : null;
  }

  async executeTransfer(intent: Intent): Promise<ExecutionResult> {
    const grant = this.grants.get(intent.grantPda);
    const signature = fakeSignature();
    this.slot += 1n;
    if (!grant) return { signature, success: false, reasonCode: "REVOKED", error: "AccountNotFound", slot: this.slot };
    const verdict = evaluateIntent(grant, intent, this.now());
    if (!verdict.allow) {
      return { signature, success: false, reasonCode: verdict.reasonCode, error: `custom program error: ${verdict.reasonCode}`, slot: this.slot };
    }
    this.grants.set(intent.grantPda, applyExecution(grant, intent, this.now()));
    return { signature, success: true, reasonCode: "OK", slot: this.slot };
  }

  /**
   * Simulate a route filling at `fillRatioBps` of the quote.
   *
   * 10000 is an exact fill; 9000 is a fill ten percent worse than quoted,
   * which is what a sandwich looks like from the vault's side. The mock has no
   * pool, so this is the only honest way to exercise the settlement check —
   * and it is labelled as a knob rather than dressed up as a price.
   */
  setFillRatioBps(bps: number) { this.fillRatioBps = Math.max(0, Math.min(20_000, Math.round(bps))); }

  async readSwapPolicy(grantPda: string): Promise<SwapPolicy | null> {
    const p = this.swapPolicies.get(grantPda);
    return p ? { ...p, allowedPrograms: [...p.allowedPrograms] } : null;
  }

  async createSwapPolicy(grantPda: string, policy: SwapPolicy) {
    if (!this.grants.has(grantPda)) throw new Error("grant not found");
    this.swapPolicies.set(grantPda, { allowedPrograms: [...policy.allowedPrograms], maxSlippageBps: policy.maxSlippageBps });
    return { signature: fakeSignature() };
  }

  async executeSwap(intent: SwapIntent): Promise<SwapResult> {
    const grant = this.grants.get(intent.grantPda);
    const signature = fakeSignature();
    this.slot += 1n;
    if (!grant) return { signature, success: false, reasonCode: "REVOKED", error: "AccountNotFound", slot: this.slot, amountInUnits: 0n, amountOutUnits: 0n };

    const policy = this.swapPolicies.get(intent.grantPda) ?? null;
    const verdict = evaluateSwap(grant, policy, intent, this.now());
    if (!verdict.allow) {
      return { signature, success: false, reasonCode: verdict.reasonCode, error: `custom program error: ${verdict.reasonCode}`, slot: this.slot, amountInUnits: 0n, amountOutUnits: 0n };
    }

    // The route "runs". Settlement is then judged on what it returned, exactly
    // as the program judges real balances.
    const receivedOut = (intent.quotedOutUnits * BigInt(this.fillRatioBps)) / 10_000n;
    const settled = checkSwapSettlement(intent.amountInUnits, receivedOut, intent, policy!);
    if (!settled.allow) {
      // Reverted: the vault keeps its input, so no counters move either.
      return { signature, success: false, reasonCode: settled.reasonCode, error: `custom program error: ${settled.reasonCode}`, slot: this.slot, amountInUnits: 0n, amountOutUnits: 0n };
    }

    this.grants.set(intent.grantPda, applyExecution(grant, { ...intent, mint: intent.inputMint, amountUnits: intent.amountInUnits, destination: intent.grantPda }, this.now()));
    return {
      signature, success: true, reasonCode: "OK", slot: this.slot,
      amountInUnits: intent.amountInUnits, amountOutUnits: receivedOut,
    };
  }

  /** The floor this grant's policy implies for a quote — used by the preview route. */
  async swapFloor(grantPda: string, quotedOutUnits: bigint): Promise<bigint | null> {
    const policy = this.swapPolicies.get(grantPda);
    return policy ? minimumOut(quotedOutUnits, policy.maxSlippageBps) : null;
  }

  async revokeGrant(grantPda: string) {
    const grant = this.grants.get(grantPda);
    if (grant) this.grants.set(grantPda, { ...grant, active: false });
    return { signature: fakeSignature() };
  }
}
