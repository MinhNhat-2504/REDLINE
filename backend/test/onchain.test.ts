import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AccountRole,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getProgramDerivedAddress,
  lamports,
  pipe,
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners,
  type Address,
  type AccountMeta,
  type AccountSignerMeta,
  type Instruction,
  type KeyPairSigner,
} from "@solana/kit";
import { decodeGrant, encodeCreateGrant, encodeExecuteTransfer, encodeInitVault, encodeRevokeGrant, errorCodeToReason, extractCustomError, findGrantPda, findVaultPda } from "../src/chain/anchor.js";

// On-chain gate tests against the real program binary in LiteSVM.
//   npm run program:fetch   # downloads the deployed .so from Devnet
//   npm run test:onchain    # Linux/macOS — litesvm ships no Windows build
// CI runs this on ubuntu (see .github/workflows/backend-ci.yml).

const SO = "target/deploy/redline_guardrails.so";
const PROGRAM_ID = "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4" as Address;
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;
const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;
const SYSTEM = "11111111111111111111111111111111" as Address;

type Ix = Instruction<string, readonly (AccountMeta | AccountSignerMeta)[]>;
type Lite = typeof import("litesvm");
let lite: Lite | null = null;
let svm: InstanceType<Lite["LiteSVM"]>;

beforeAll(async () => {
  if (process.platform === "win32" || !existsSync(SO)) return;
  try { lite = await import("litesvm"); } catch { lite = null; }
});

const it_ = (name: string, fn: () => Promise<void>) => it(name, async () => {
  if (!lite) { console.warn(`skipped (litesvm unavailable on ${process.platform} or ${SO} missing): ${name}`); return; }
  await fn();
});

// ── helpers ──
const enc = getAddressEncoder();
const ro = (address: Address): AccountMeta => ({ address, role: AccountRole.READONLY });
const rw = (address: Address): AccountMeta => ({ address, role: AccountRole.WRITABLE });
const signer = (s: KeyPairSigner, writable = false): AccountSignerMeta => ({ address: s.address, role: writable ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER, signer: s });

async function send(ixs: Ix[], feePayer: KeyPairSigner) {
  const tx = await pipe(
    createTransactionMessage({ version: 0 }),
    m => setTransactionMessageFeePayerSigner(feePayer, m),
    m => svm.setTransactionMessageLifetimeUsingLatestBlockhash(m),
    m => appendTransactionMessageInstructions(ixs, m),
    m => signTransactionMessageWithSigners(m),
  );
  const r = svm.sendTransaction(tx);
  const failed = r instanceof lite!.FailedTransactionMetadata;
  const text = failed ? `${r.toString()} ${(r as InstanceType<Lite["FailedTransactionMetadata"]>).meta().logs().join("\n")}` : "";
  return { failed, code: failed ? extractCustomError(text) : null, text };
}
const reason = (r: { code: number | null }) => (r.code === null ? null : errorCodeToReason(r.code).reasonCode);

async function ata(owner: Address, mint: Address): Promise<Address> {
  const [a] = await getProgramDerivedAddress({ programAddress: ATA_PROGRAM, seeds: [enc.encode(owner), enc.encode(TOKEN_PROGRAM), enc.encode(mint)] });
  return a;
}
// Minimal SPL layouts written straight into the bank — no init instructions needed.
function tokenAccount(mint: Address, owner: Address, amount: bigint): Uint8Array {
  const b = Buffer.alloc(165);
  Buffer.from(enc.encode(mint)).copy(b, 0); Buffer.from(enc.encode(owner)).copy(b, 32);
  b.writeBigUInt64LE(amount, 64); b[108] = 1; // state = Initialized
  return new Uint8Array(b);
}
function mintAccount(authority: Address): Uint8Array {
  const b = Buffer.alloc(82);
  b.writeUInt32LE(1, 0); Buffer.from(enc.encode(authority)).copy(b, 4); // COption::Some(authority)
  b.writeBigUInt64LE(0n, 36); b[44] = 6; b[45] = 1; // supply, decimals, is_initialized
  return new Uint8Array(b);
}
function put(address: Address, data: Uint8Array, programAddress: Address) {
  svm.setAccount({ address, data, executable: false, lamports: lamports(1_000_000_000n), programAddress, space: BigInt(data.length) });
}
function tokenBalance(address: Address): bigint {
  const acc = svm.getAccount(address);
  if (!acc.exists) throw new Error(`no account ${address}`);
  return Buffer.from(acc.data).readBigUInt64LE(64);
}

describe("redline_guardrails on LiteSVM (deployed Devnet binary)", () => {
  it_("loads the program", async () => {
    svm = new lite!.LiteSVM();
    svm.addProgram(PROGRAM_ID, readFileSync(SO));
    expect(svm.getAccount(PROGRAM_ID).exists).toBe(true);
  });

  it_("enforces the gates and moves nothing on rejection", async () => {
    svm = new lite!.LiteSVM();
    svm.addProgram(PROGRAM_ID, readFileSync(SO));
    const [owner, executor, dest, mint, stranger] = await Promise.all([1, 2, 3, 4, 5].map(() => generateKeyPairSigner()));
    svm.airdrop(owner.address, lamports(5_000_000_000n));
    svm.airdrop(executor.address, lamports(1_000_000_000n));
    svm.airdrop(stranger.address, lamports(1_000_000_000n));

    const vault = (await findVaultPda(PROGRAM_ID, owner.address)).address as Address;
    const vaultAta = await ata(vault, mint.address);
    const destAta = await ata(dest.address, mint.address);
    const strangerAta = await ata(stranger.address, mint.address);
    put(mint.address, mintAccount(owner.address), TOKEN_PROGRAM);
    put(vaultAta, tokenAccount(mint.address, vault, 1_000_000_000n), TOKEN_PROGRAM);
    put(destAta, tokenAccount(mint.address, dest.address, 0n), TOKEN_PROGRAM);
    put(strangerAta, tokenAccount(mint.address, stranger.address, 0n), TOKEN_PROGRAM);

    // init_vault
    let r = await send([{ programAddress: PROGRAM_ID, accounts: [rw(vault), signer(owner, true), ro(SYSTEM)], data: encodeInitVault() }], owner);
    expect(r.text).toBe("");

    // create_grant: cap 500, 5 tx, cooldown 0
    const agentId = new Uint8Array(16).fill(9);
    const grant = (await findGrantPda(PROGRAM_ID, owner.address, agentId)).address as Address;
    const now = Number(svm.getClock().unixTimestamp);
    r = await send([{
      programAddress: PROGRAM_ID,
      accounts: [rw(grant), ro(vault), signer(owner, true), ro(executor.address), ro(SYSTEM)],
      data: encodeCreateGrant({ agentId, policyHash: new Uint8Array(32).fill(1), spendCapUnits: 500_000_000n, maxTransactions: 5, expiresAt: BigInt(now + 3600), cooldownSeconds: 0n, allowedMints: [mint.address], allowedDestinations: [dest.address] }),
    }], owner);
    expect(r.text).toBe("");

    const exec = (nonce: bigint, amount: bigint, who: KeyPairSigner = executor, to: Address = destAta) => send([{
      programAddress: PROGRAM_ID,
      accounts: [rw(grant), ro(vault), signer(who), ro(mint.address), rw(vaultAta), rw(to), ro(TOKEN_PROGRAM)],
      data: encodeExecuteTransfer(nonce, amount),
    }], who);
    const state = () => { const a = svm.getAccount(grant); if (!a.exists) throw new Error("grant missing"); return decodeGrant(new Uint8Array(a.data), grant); };

    // three compliant transfers
    for (let n = 0n; n < 3n; n += 1n) expect((await exec(n, 100_000_000n)).text).toBe("");
    expect(tokenBalance(vaultAta)).toBe(700_000_000n);
    expect(tokenBalance(destAta)).toBe(300_000_000n);
    expect(state().spentUnits).toBe(300_000_000n);
    expect(state().nextNonce).toBe(3);

    // gate 3 — nonce replay
    expect(reason(await exec(1n, 1_000_000n))).toBe("NONCE_REPLAY");
    // gate 6 — spend cap: the demo moment; nothing moves, nonce not consumed
    expect(reason(await exec(3n, 300_000_000n))).toBe("SPEND_CAP_EXCEEDED");
    expect(tokenBalance(vaultAta)).toBe(700_000_000n);
    expect(state().nextNonce).toBe(3);
    // gate 5 — destination not on allowlist
    expect(reason(await exec(3n, 1_000_000n, executor, strangerAta))).toBe("DESTINATION_NOT_ALLOWED");
    // wrong signer is rejected by Anchor's has_one before any gate
    expect((await exec(3n, 1_000_000n, stranger)).failed).toBe(true);

    // gate 1 — revoke, then any transfer fails
    r = await send([{ programAddress: PROGRAM_ID, accounts: [rw(grant), signer(owner)], data: encodeRevokeGrant() }], owner);
    expect(r.text).toBe("");
    expect(state().active).toBe(false);
    expect(reason(await exec(3n, 1_000_000n))).toBe("REVOKED");
    expect(tokenBalance(vaultAta)).toBe(700_000_000n);
  });

  it("documents the discriminator the program expects", () => {
    expect(Buffer.from(encodeInitVault()).toString("hex")).toBe(createHash("sha256").update("global:init_vault").digest("hex").slice(0, 16));
  });
});
