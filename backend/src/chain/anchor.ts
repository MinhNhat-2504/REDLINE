import { createHash } from "node:crypto";
import { getAddressDecoder, getAddressEncoder, getProgramDerivedAddress, type Address } from "@solana/kit";
import type { GrantState, ReasonCode } from "../policy/types.js";

// Hand-rolled Anchor wire format for redline_guardrails so the backend does
// not depend on a generated client. Everything here is derived from the Rust
// source: instruction/event discriminators are sha256 prefixes, arguments are
// Borsh, account layout follows the struct field order.

export const VAULT_SEED = new TextEncoder().encode("vault");
export const GRANT_SEED = new TextEncoder().encode("grant");
export const SWAP_POLICY_SEED = new TextEncoder().encode("swap");

const addressEncoder = getAddressEncoder();
const addressDecoder = getAddressDecoder();

export function discriminator(namespace: "global" | "event" | "account", name: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(`${namespace}:${name}`).digest().subarray(0, 8));
}

// ── Borsh writer ──
class Writer {
  private parts: Uint8Array[] = [];
  bytes(b: Uint8Array) { this.parts.push(b); return this; }
  u8(v: number) { return this.bytes(new Uint8Array([v])); }
  u16(v: number) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); return this.bytes(b); }
  u32(v: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, true); return this.bytes(b); }
  vecU8(b: Uint8Array) { this.u32(b.length); return this.bytes(b); }
  u64(v: bigint) { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, v, true); return this.bytes(b); }
  i64(v: bigint) { const b = new Uint8Array(8); new DataView(b.buffer).setBigInt64(0, v, true); return this.bytes(b); }
  address(a: string) { return this.bytes(new Uint8Array(addressEncoder.encode(a as Address))); }
  vecAddress(list: string[]) { this.u32(list.length); for (const a of list) this.address(a); return this; }
  build(): Uint8Array {
    const len = this.parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of this.parts) { out.set(p, o); o += p.length; }
    return out;
  }
}

// ── Borsh reader ──
class Reader {
  private o = 0;
  constructor(private buf: Uint8Array) {}
  private view() { return new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength); }
  skip(n: number) { this.o += n; return this; }
  bytes(n: number) { const b = this.buf.subarray(this.o, this.o + n); this.o += n; return b; }
  u8() { return this.buf[this.o++]; }
  u16() { const v = this.view().getUint16(this.o, true); this.o += 2; return v; }
  u32() { const v = this.view().getUint32(this.o, true); this.o += 4; return v; }
  u64() { const v = this.view().getBigUint64(this.o, true); this.o += 8; return v; }
  i64() { const v = this.view().getBigInt64(this.o, true); this.o += 8; return v; }
  bool() { return this.u8() === 1; }
  address() { return addressDecoder.decode(this.bytes(32)) as string; }
  vecAddress() { const n = this.u32(); const out: string[] = []; for (let i = 0; i < n; i += 1) out.push(this.address()); return out; }
}

// ── instruction data ──
export function encodeInitVault(): Uint8Array {
  return new Writer().bytes(discriminator("global", "init_vault")).build();
}

export interface CreateGrantArgs {
  agentId: Uint8Array; // 16 bytes
  policyHash: Uint8Array; // 32 bytes
  spendCapUnits: bigint;
  maxTransactions: number;
  expiresAt: bigint;
  cooldownSeconds: bigint;
  allowedMints: string[];
  allowedDestinations: string[];
}

export function encodeCreateGrant(a: CreateGrantArgs): Uint8Array {
  if (a.agentId.length !== 16) throw new Error("agentId must be 16 bytes");
  if (a.policyHash.length !== 32) throw new Error("policyHash must be 32 bytes");
  return new Writer()
    .bytes(discriminator("global", "create_grant"))
    .bytes(a.agentId).bytes(a.policyHash)
    .u64(a.spendCapUnits).u32(a.maxTransactions).i64(a.expiresAt).i64(a.cooldownSeconds)
    .vecAddress(a.allowedMints).vecAddress(a.allowedDestinations)
    .build();
}

export function encodeExecuteTransfer(nonce: bigint, amountUnits: bigint): Uint8Array {
  return new Writer().bytes(discriminator("global", "execute_transfer")).u64(nonce).u64(amountUnits).build();
}

/**
 * Turn trading on for one grant.
 *
 * A separate instruction, and a separate account, because signing a transfer
 * policy is not the same decision as letting an agent trade — and because
 * adding a field to `Grant` would make every grant already live on Devnet
 * undecodable.
 */
export function encodeCreateSwapPolicy(allowedPrograms: string[], maxSlippageBps: number): Uint8Array {
  if (!allowedPrograms.length || allowedPrograms.length > 4) throw new Error("a swap policy names 1 to 4 programs");
  if (maxSlippageBps < 0 || maxSlippageBps >= 10_000) throw new Error("slippage tolerance must be below 100%");
  return new Writer()
    .bytes(discriminator("global", "create_swap_policy"))
    .vecAddress(allowedPrograms)
    .u16(Math.round(maxSlippageBps))
    .build();
}

/**
 * Trade inside the policy.
 *
 * `routeData` is the DEX's own instruction payload, passed through untouched:
 * the program does not parse it, it brackets the call and judges the balances
 * afterwards. `quotedOut` is recorded on-chain so the audit trail can show the
 * quote, the floor it implied, and the fill that actually landed.
 */
export function encodeExecuteSwap(nonce: bigint, amountIn: bigint, quotedOut: bigint, minOut: bigint, routeData: Uint8Array): Uint8Array {
  return new Writer()
    .bytes(discriminator("global", "execute_swap"))
    .u64(nonce).u64(amountIn).u64(quotedOut).u64(minOut)
    .vecU8(routeData)
    .build();
}

export function encodeRevokeGrant(): Uint8Array {
  return new Writer().bytes(discriminator("global", "revoke_grant")).build();
}

export function encodeWithdraw(amountUnits: bigint): Uint8Array {
  return new Writer().bytes(discriminator("global", "withdraw")).u64(amountUnits).build();
}

// ── PDAs ──
export async function findVaultPda(programId: string, owner: string) {
  const [address, bump] = await getProgramDerivedAddress({ programAddress: programId as Address, seeds: [VAULT_SEED, addressEncoder.encode(owner as Address)] });
  return { address: address as string, bump };
}

export async function findSwapPolicyPda(programId: string, grantPda: string) {
  const [address, bump] = await getProgramDerivedAddress({ programAddress: programId as Address, seeds: [SWAP_POLICY_SEED, addressEncoder.encode(grantPda as Address)] });
  return { address: address as string, bump };
}

export async function findGrantPda(programId: string, owner: string, agentId: Uint8Array) {
  const [address, bump] = await getProgramDerivedAddress({ programAddress: programId as Address, seeds: [GRANT_SEED, addressEncoder.encode(owner as Address), agentId] });
  return { address: address as string, bump };
}

// ── account decoding ──
export const GRANT_DISCRIMINATOR = discriminator("account", "Grant");

export interface GrantAccount extends GrantState {
  owner: string;
  vault: string;
  agentId: Uint8Array;
  policyHash: Uint8Array;
  createdAt: number;
  bump: number;
}

export function decodeGrant(data: Uint8Array, grantPda: string): GrantAccount {
  const r = new Reader(data);
  const disc = r.bytes(8);
  if (!GRANT_DISCRIMINATOR.every((b, i) => b === disc[i])) throw new Error("not a Grant account");
  const owner = r.address();
  const vault = r.address();
  const executor = r.address();
  const agentId = new Uint8Array(r.bytes(16));
  const policyHash = new Uint8Array(r.bytes(32));
  const spendCapUnits = r.u64();
  const spentUnits = r.u64();
  const maxTransactions = r.u32();
  const transactionCount = r.u32();
  const nextNonce = Number(r.u64());
  const createdAt = Number(r.i64());
  const expiresAt = Number(r.i64());
  const cooldownSeconds = Number(r.i64());
  const lastExecutionAt = Number(r.i64());
  const active = r.bool();
  const bump = r.u8();
  const allowedMints = r.vecAddress();
  const allowedDestinations = r.vecAddress();
  return { grantPda, owner, vault, executor, agentId, policyHash, spendCapUnits, spentUnits, maxTransactions, transactionCount, nextNonce, createdAt, expiresAt, cooldownSeconds, lastExecutionAt, active, bump, allowedMints, allowedDestinations };
}

// Encoder for tests: produce the exact bytes the program would store.
export function encodeGrantForTest(g: GrantAccount): Uint8Array {
  return new Writer()
    .bytes(GRANT_DISCRIMINATOR)
    .address(g.owner).address(g.vault).address(g.executor)
    .bytes(g.agentId).bytes(g.policyHash)
    .u64(g.spendCapUnits).u64(g.spentUnits).u32(g.maxTransactions).u32(g.transactionCount)
    .u64(BigInt(g.nextNonce)).i64(BigInt(g.createdAt)).i64(BigInt(g.expiresAt)).i64(BigInt(g.cooldownSeconds)).i64(BigInt(g.lastExecutionAt))
    .u8(g.active ? 1 : 0).u8(g.bump)
    .vecAddress(g.allowedMints).vecAddress(g.allowedDestinations)
    .build();
}

export const SWAP_POLICY_DISCRIMINATOR = discriminator("account", "SwapPolicy");

export interface SwapPolicyAccount {
  swapPolicyPda: string;
  grant: string;
  maxSlippageBps: number;
  bump: number;
  allowedPrograms: string[];
}

/** Field order mirrors `SwapPolicy` in lib.rs. Append only; never reorder. */
export function decodeSwapPolicy(data: Uint8Array, swapPolicyPda: string): SwapPolicyAccount {
  const r = new Reader(data);
  const disc = r.bytes(8);
  if (!SWAP_POLICY_DISCRIMINATOR.every((b, i) => b === disc[i])) throw new Error("not a SwapPolicy account");
  const grant = r.address();
  const maxSlippageBps = r.u16();
  const bump = r.u8();
  const allowedPrograms = r.vecAddress();
  return { swapPolicyPda, grant, maxSlippageBps, bump, allowedPrograms };
}

/** Encoder for tests: the exact bytes the program would store. */
export function encodeSwapPolicyForTest(p: SwapPolicyAccount): Uint8Array {
  return new Writer()
    .bytes(SWAP_POLICY_DISCRIMINATOR)
    .address(p.grant).u16(p.maxSlippageBps).u8(p.bump)
    .vecAddress(p.allowedPrograms)
    .build();
}

// ── errors ──
// Index = variant order in RedlineError. Code on chain = 6000 + index.
const ERROR_VARIANTS = [
  "InvalidSpendCap", "InvalidTransactionCap", "InvalidExpiry", "InvalidCooldown", "InvalidAllowlist",
  "Revoked", "Expired", "NonceReplay", "MintNotAllowed", "DestinationNotAllowed",
  "TxCapExceeded", "SpendCapExceeded", "CooldownActive", "ArithmeticOverflow",
  // 6014 onwards. Appended, never interleaved: an existing code appears in
  // audit rows already written, and renumbering would rewrite their meaning.
  "SwapsNotEnabled", "ProgramNotAllowed", "OutputMintNotAllowed", "SlippageExceeded",
  "InputOverspent", "InvalidSlippage", "InvalidSwapPair",
] as const;

const VARIANT_TO_REASON: Partial<Record<(typeof ERROR_VARIANTS)[number], ReasonCode>> = {
  Revoked: "REVOKED",
  Expired: "EXPIRED",
  NonceReplay: "NONCE_REPLAY",
  MintNotAllowed: "MINT_NOT_ALLOWED",
  DestinationNotAllowed: "DESTINATION_NOT_ALLOWED",
  TxCapExceeded: "TX_CAP_EXCEEDED",
  SpendCapExceeded: "SPEND_CAP_EXCEEDED",
  CooldownActive: "COOLDOWN_ACTIVE",
  SwapsNotEnabled: "SWAPS_NOT_ENABLED",
  ProgramNotAllowed: "PROGRAM_NOT_ALLOWED",
  OutputMintNotAllowed: "OUTPUT_MINT_NOT_ALLOWED",
  SlippageExceeded: "SLIPPAGE_EXCEEDED",
  // A route that pulled more input than authorised is the spend cap being
  // broken by the venue rather than by the agent, so it reports as the same
  // refusal an over-cap transfer would.
  InputOverspent: "SPEND_CAP_EXCEEDED",
};

export function errorCodeToReason(code: number): { variant: string; reasonCode: ReasonCode | null } {
  const idx = code - 6000;
  const variant = ERROR_VARIANTS[idx] ?? `Unknown(${code})`;
  return { variant, reasonCode: (VARIANT_TO_REASON as Record<string, ReasonCode>)[variant] ?? null };
}

// Pull the custom error code out of a transaction meta.err or a thrown
// SolanaError. Shapes seen in practice:
//   { InstructionError: [0, { Custom: 6011 }] }
//   "custom program error: 0x177b" inside log lines
export function extractCustomError(err: unknown): number | null {
  if (!err) return null;
  if (typeof err === "object") {
    const ie = (err as { InstructionError?: unknown }).InstructionError;
    if (Array.isArray(ie) && ie[1] && typeof ie[1] === "object" && "Custom" in (ie[1] as object)) {
      return Number((ie[1] as { Custom: number }).Custom);
    }
  }
  const text = typeof err === "string" ? err : JSON.stringify(err);
  const m = /custom program error: 0x([0-9a-f]+)/i.exec(text);
  return m ? parseInt(m[1], 16) : null;
}

// ── events ──
export const EVENT_DISCRIMINATORS = {
  PolicyDecision: discriminator("event", "PolicyDecision"),
  GrantCreated: discriminator("event", "GrantCreated"),
  GrantRevoked: discriminator("event", "GrantRevoked"),
  VaultInitialized: discriminator("event", "VaultInitialized"),
  Withdrawn: discriminator("event", "Withdrawn"),
  SwapDecision: discriminator("event", "SwapDecision"),
  SwapPolicyCreated: discriminator("event", "SwapPolicyCreated"),
} as const;

export type DecodedEvent =
  | { name: "PolicyDecision"; grant: string; executor: string; nonce: bigint; mint: string; destination: string; amountUnits: bigint; spentUnits: bigint; transactionCount: number; slot: bigint }
  | { name: "GrantCreated"; grant: string; owner: string; vault: string; executor: string; policyHash: string; spendCapUnits: bigint; maxTransactions: number; expiresAt: number }
  | { name: "GrantRevoked"; grant: string; owner: string }
  | { name: "VaultInitialized"; vault: string; owner: string }
  | { name: "Withdrawn"; vault: string; owner: string; mint: string; amountUnits: bigint }
  | { name: "SwapDecision"; grant: string; executor: string; nonce: bigint; inputMint: string; outputMint: string; dexProgram: string; amountIn: bigint; quotedOut: bigint; minOut: bigint; amountOut: bigint; spentUnits: bigint; transactionCount: number; slot: bigint }
  | { name: "SwapPolicyCreated"; grant: string; swapPolicy: string; programs: number; maxSlippageBps: number };

function same(a: Uint8Array, b: Uint8Array) { return a.length === b.length && a.every((v, i) => v === b[i]); }

export function decodeEvent(data: Uint8Array): DecodedEvent | null {
  const r = new Reader(data);
  const disc = r.bytes(8);
  if (same(disc, EVENT_DISCRIMINATORS.PolicyDecision)) {
    return { name: "PolicyDecision", grant: r.address(), executor: r.address(), nonce: r.u64(), mint: r.address(), destination: r.address(), amountUnits: r.u64(), spentUnits: r.u64(), transactionCount: r.u32(), slot: r.u64() };
  }
  if (same(disc, EVENT_DISCRIMINATORS.GrantCreated)) {
    return { name: "GrantCreated", grant: r.address(), owner: r.address(), vault: r.address(), executor: r.address(), policyHash: Buffer.from(r.bytes(32)).toString("hex"), spendCapUnits: r.u64(), maxTransactions: r.u32(), expiresAt: Number(r.i64()) };
  }
  if (same(disc, EVENT_DISCRIMINATORS.GrantRevoked)) return { name: "GrantRevoked", grant: r.address(), owner: r.address() };
  if (same(disc, EVENT_DISCRIMINATORS.VaultInitialized)) return { name: "VaultInitialized", vault: r.address(), owner: r.address() };
  if (same(disc, EVENT_DISCRIMINATORS.Withdrawn)) return { name: "Withdrawn", vault: r.address(), owner: r.address(), mint: r.address(), amountUnits: r.u64() };
  if (same(disc, EVENT_DISCRIMINATORS.SwapDecision)) {
    return {
      name: "SwapDecision", grant: r.address(), executor: r.address(), nonce: r.u64(),
      inputMint: r.address(), outputMint: r.address(), dexProgram: r.address(),
      amountIn: r.u64(), quotedOut: r.u64(), minOut: r.u64(), amountOut: r.u64(),
      spentUnits: r.u64(), transactionCount: r.u32(), slot: r.u64(),
    };
  }
  if (same(disc, EVENT_DISCRIMINATORS.SwapPolicyCreated)) {
    return { name: "SwapPolicyCreated", grant: r.address(), swapPolicy: r.address(), programs: r.u8(), maxSlippageBps: r.u16() };
  }
  return null;
}

// Anchor emits events as `Program data: <base64>` log lines.
export function eventsFromLogs(logs: readonly string[]): DecodedEvent[] {
  const out: DecodedEvent[] = [];
  for (const line of logs) {
    if (!line.startsWith("Program data: ")) continue;
    try {
      const ev = decodeEvent(new Uint8Array(Buffer.from(line.slice("Program data: ".length), "base64")));
      if (ev) out.push(ev);
    } catch {
      // not one of ours
    }
  }
  return out;
}
