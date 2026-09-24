import { AccountRole, getAddressEncoder, getProgramDerivedAddress, type Address, type Instruction } from "@solana/kit";

// Browser-side encoder for the redline_guardrails program — the owner-signed
// instructions only (init_vault, create_grant, revoke_grant). Mirrors
// backend/src/chain/anchor.ts; the executor-signed execute_transfer never
// runs in the browser.

export const PROGRAM_ID = (import.meta.env.VITE_REDLINE_PROGRAM_ID ?? "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4") as Address;
const SYSTEM_PROGRAM = "11111111111111111111111111111111" as Address;
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;
const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;
const enc = new TextEncoder();
const addressEncoder = getAddressEncoder();

async function discriminator(name: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`global:${name}`));
  return new Uint8Array(digest).slice(0, 8);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const u32 = (v: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, true); return b; };
const u64 = (v: bigint) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, v, true); return b; };
const i64 = (v: bigint) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigInt64(0, v, true); return b; };
const addr = (a: string) => new Uint8Array(addressEncoder.encode(a as Address));
const vecAddr = (list: string[]) => concat([u32(list.length), ...list.map(addr)]);

export async function findVaultPda(owner: string): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({ programAddress: PROGRAM_ID, seeds: [enc.encode("vault"), addr(owner)] });
  return pda;
}
export async function findGrantPda(owner: string, agentId: Uint8Array): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({ programAddress: PROGRAM_ID, seeds: [enc.encode("grant"), addr(owner), agentId] });
  return pda;
}

export function randomAgentId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
export const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string) => new Uint8Array(h.match(/.{2}/g)!.map(x => parseInt(x, 16)));

export async function initVaultInstruction(owner: string): Promise<Instruction> {
  const vault = await findVaultPda(owner);
  return {
    programAddress: PROGRAM_ID,
    accounts: [
      { address: vault, role: AccountRole.WRITABLE },
      { address: owner as Address, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: await discriminator("init_vault"),
  };
}

export interface CreateGrantParams {
  owner: string;
  executor: string;
  agentId: Uint8Array;
  policyHashHex: string;
  spendCapUnits: bigint;
  maxTransactions: number;
  expiresAt: number;
  cooldownSeconds: number;
  allowedMints: string[];
  allowedDestinations: string[];
}

export async function createGrantInstruction(p: CreateGrantParams): Promise<{ instruction: Instruction; grantPda: Address; vaultPda: Address }> {
  const vaultPda = await findVaultPda(p.owner);
  const grantPda = await findGrantPda(p.owner, p.agentId);
  const data = concat([
    await discriminator("create_grant"),
    p.agentId, fromHex(p.policyHashHex),
    u64(p.spendCapUnits), u32(p.maxTransactions), i64(BigInt(p.expiresAt)), i64(BigInt(p.cooldownSeconds)),
    vecAddr(p.allowedMints), vecAddr(p.allowedDestinations),
  ]);
  return {
    grantPda, vaultPda,
    instruction: {
      programAddress: PROGRAM_ID,
      accounts: [
        { address: grantPda, role: AccountRole.WRITABLE },
        { address: vaultPda, role: AccountRole.READONLY },
        { address: p.owner as Address, role: AccountRole.WRITABLE_SIGNER },
        { address: p.executor as Address, role: AccountRole.READONLY },
        { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      ],
      data,
    },
  };
}

async function findAta(owner: string, mint: string): Promise<Address> {
  const [ata] = await getProgramDerivedAddress({ programAddress: ATA_PROGRAM, seeds: [addr(owner), addr(TOKEN_PROGRAM), addr(mint)] });
  return ata;
}

// Owner pulls tokens out of the vault. No gates — the owner's key is the
// authority. Account order mirrors `Withdraw` in lib.rs.
export async function withdrawInstruction(owner: string, mint: string, amountUnits: bigint): Promise<Instruction> {
  const vault = await findVaultPda(owner);
  return {
    programAddress: PROGRAM_ID,
    accounts: [
      { address: vault, role: AccountRole.READONLY },
      { address: owner as Address, role: AccountRole.WRITABLE_SIGNER },
      { address: mint as Address, role: AccountRole.READONLY },
      { address: await findAta(vault, mint), role: AccountRole.WRITABLE },
      { address: await findAta(owner, mint), role: AccountRole.WRITABLE },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
      { address: ATA_PROGRAM, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concat([await discriminator("withdraw"), u64(amountUnits)]),
  };
}

export async function revokeGrantInstruction(owner: string, grantPda: string): Promise<Instruction> {
  return {
    programAddress: PROGRAM_ID,
    accounts: [
      { address: grantPda as Address, role: AccountRole.WRITABLE },
      { address: owner as Address, role: AccountRole.READONLY_SIGNER },
    ],
    data: await discriminator("revoke_grant"),
  };
}

// Same canonical form as backend/src/policy/canonical.ts — the hash the
// owner signs must be byte-identical to what the API stores.
export async function policyHashHex(p: { agentName: string; strategy: string; tokens: string[]; spendCapUsdc: number; maxTransactions: number; durationHours: number; cooldownMinutes: number; allowedMints: string[]; allowedDestinations: string[] }): Promise<string> {
  const canonical = JSON.stringify({
    agentName: p.agentName.trim(), strategy: p.strategy.trim(), tokens: [...p.tokens].sort(),
    spendCapUsdc: p.spendCapUsdc, maxTransactions: p.maxTransactions, durationHours: p.durationHours, cooldownMinutes: p.cooldownMinutes,
    allowedMints: [...p.allowedMints].sort(), allowedDestinations: [...p.allowedDestinations].sort(),
  });
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(canonical))));
}

// Revoke several grants in one transaction.
//
// The program takes one revocation per grant account, which the dashboard used
// to present as a reason you had to sign once per grant. It is not: a Solana
// transaction carries many instructions, so N grants is N instructions and one
// wallet prompt. `planEmergencyStop` decides how many fit; this only turns a
// batch into the instruction array.
export async function emergencyStopInstructions(owner: string, grantPdas: string[]): Promise<Instruction[]> {
  return Promise.all(grantPdas.map(pda => revokeGrantInstruction(owner, pda)));
}
