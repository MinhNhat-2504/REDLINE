import { existsSync, readFileSync } from "node:fs";
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
import {
  encodeCreateGrant, encodeCreateSwapPolicy, encodeExecuteSwap, encodeInitVault,
  errorCodeToReason, extractCustomError, findGrantPda, findSwapPolicyPda, findVaultPda,
} from "../src/chain/anchor.js";

// The swap guardrails, against the real deployed binary in LiteSVM.
//
//   npm run program:fetch && npm run test:onchain
//
// Two things make this testable without a DEX to trade against:
//
//   1. Every refusal happens *before* the route is invoked, so the gates can
//      be exercised with a program id that is never actually called.
//   2. The one case that does need a route is the case that matters most — a
//      route that takes the input and returns nothing — and the SPL Token
//      program plays that part perfectly: allowlist it, hand it a `transfer`,
//      and it moves the vault's tokens out and delivers no output. If the
//      settlement check works, that transaction reverts and the vault keeps
//      its money.
//
// The suite skips itself when the deployed binary predates `execute_swap`, so
// it stays green until the upgrade lands and starts testing the moment it does.

const SO = "target/deploy/redline_guardrails.so";
const PROGRAM_ID = "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4" as Address;
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;
const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;
const SYSTEM = "11111111111111111111111111111111" as Address;

type Ix = Instruction<string, readonly (AccountMeta | AccountSignerMeta)[]>;
type Lite = typeof import("litesvm");
let lite: Lite | null = null;
let svm: InstanceType<Lite["LiteSVM"]>;
let deployedSupportsSwap = false;

const enc = getAddressEncoder();
const ro = (address: Address): AccountMeta => ({ address, role: AccountRole.READONLY });
const rw = (address: Address): AccountMeta => ({ address, role: AccountRole.WRITABLE });
const signer = (s: KeyPairSigner, writable = false): AccountSignerMeta =>
  ({ address: s.address, role: writable ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER, signer: s });

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
function tokenAccount(mint: Address, owner: Address, amount: bigint): Uint8Array {
  const b = Buffer.alloc(165);
  Buffer.from(enc.encode(mint)).copy(b, 0); Buffer.from(enc.encode(owner)).copy(b, 32);
  b.writeBigUInt64LE(amount, 64); b[108] = 1;
  return new Uint8Array(b);
}
function mintAccount(authority: Address): Uint8Array {
  const b = Buffer.alloc(82);
  b.writeUInt32LE(1, 0); Buffer.from(enc.encode(authority)).copy(b, 4);
  b.writeBigUInt64LE(0n, 36); b[44] = 6; b[45] = 1;
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
/** SPL Token `transfer` — stands in for a route that takes and gives nothing. */
function splTransferData(amount: bigint): Uint8Array {
  const b = Buffer.alloc(9);
  b[0] = 3; b.writeBigUInt64LE(amount, 1);
  return new Uint8Array(b);
}

/** A vault, a grant, and optionally a swap policy — the fixture every case starts from. */
async function world(opts: { slippageBps?: number; programs?: Address[]; withPolicy?: boolean; cooldown?: bigint } = {}) {
  svm = new lite!.LiteSVM();
  svm.addProgram(PROGRAM_ID, readFileSync(SO));
  const [owner, executor, inMint, outMint, sink] = await Promise.all([1, 2, 3, 4, 5].map(() => generateKeyPairSigner()));
  svm.airdrop(owner.address, lamports(5_000_000_000n));
  svm.airdrop(executor.address, lamports(1_000_000_000n));

  const vault = (await findVaultPda(PROGRAM_ID, owner.address)).address as Address;
  const vaultIn = await ata(vault, inMint.address);
  const vaultOut = await ata(vault, outMint.address);
  const sinkAta = await ata(sink.address, inMint.address);
  put(inMint.address, mintAccount(owner.address), TOKEN_PROGRAM);
  put(outMint.address, mintAccount(owner.address), TOKEN_PROGRAM);
  put(vaultIn, tokenAccount(inMint.address, vault, 1_000_000_000n), TOKEN_PROGRAM);
  put(vaultOut, tokenAccount(outMint.address, vault, 0n), TOKEN_PROGRAM);
  put(sinkAta, tokenAccount(inMint.address, sink.address, 0n), TOKEN_PROGRAM);

  await send([{ programAddress: PROGRAM_ID, accounts: [rw(vault), signer(owner, true), ro(SYSTEM)], data: encodeInitVault() }], owner);

  const agentId = new Uint8Array(16).fill(4);
  const grant = (await findGrantPda(PROGRAM_ID, owner.address, agentId)).address as Address;
  const now = Number(svm.getClock().unixTimestamp);
  await send([{
    programAddress: PROGRAM_ID,
    accounts: [rw(grant), ro(vault), signer(owner, true), ro(executor.address), ro(SYSTEM)],
    data: encodeCreateGrant({
      agentId, policyHash: new Uint8Array(32).fill(2), spendCapUnits: 500_000_000n, maxTransactions: 5,
      expiresAt: BigInt(now + 3600), cooldownSeconds: opts.cooldown ?? 0n,
      allowedMints: [inMint.address, outMint.address], allowedDestinations: [sink.address],
    }),
  }], owner);

  const swapPolicy = (await findSwapPolicyPda(PROGRAM_ID, grant)).address as Address;
  if (opts.withPolicy !== false) {
    await send([{
      programAddress: PROGRAM_ID,
      accounts: [rw(swapPolicy), ro(grant), signer(owner, true), ro(SYSTEM)],
      data: encodeCreateSwapPolicy(opts.programs ?? [TOKEN_PROGRAM], opts.slippageBps ?? 100),
    }], owner);
  }

  const swap = (dex: Address, amountIn: bigint, quotedOut: bigint, minOut: bigint, route: Uint8Array, remaining: (AccountMeta | AccountSignerMeta)[]) => send([{
    programAddress: PROGRAM_ID,
    accounts: [
      rw(grant), ro(swapPolicy), ro(vault), signer(executor), ro(inMint.address), ro(outMint.address),
      rw(vaultIn), rw(vaultOut), ro(dex), ro(TOKEN_PROGRAM),
      ...remaining,
    ],
    data: encodeExecuteSwap(0n, amountIn, quotedOut, minOut, route),
  }], executor);

  return { owner, executor, inMint, outMint, sink, vault, vaultIn, vaultOut, sinkAta, grant, swapPolicy, swap };
}

beforeAll(async () => {
  if (process.platform === "win32" || !existsSync(SO)) return;
  try { lite = await import("litesvm"); } catch { lite = null; return; }
  // Does the deployed binary know this instruction yet? Anchor answers an
  // unknown discriminator with its fallback error, which is how this suite
  // tells "not upgraded" apart from "guardrail failed".
  try {
    const w = await world({ withPolicy: false });
    const probe = await send([{
      programAddress: PROGRAM_ID,
      accounts: [rw(w.swapPolicy), ro(w.grant), signer(w.owner, true), ro(SYSTEM)],
      data: encodeCreateSwapPolicy([TOKEN_PROGRAM], 100),
    }], w.owner);
    deployedSupportsSwap = !/InstructionFallbackNotFound|fallback functions are not supported/i.test(probe.text);
  } catch { deployedSupportsSwap = false; }
});

const it_ = (name: string, fn: () => Promise<void>) => it(name, async () => {
  if (!lite) { console.warn(`skipped (litesvm unavailable on ${process.platform} or ${SO} missing): ${name}`); return; }
  if (!deployedSupportsSwap) { console.warn(`skipped (deployed program predates execute_swap): ${name}`); return; }
  await fn();
});

describe("swap guardrails on the deployed binary", () => {
  it_("refuses to trade at all on a grant with no swap policy", async () => {
    // Every grant signed before swaps existed is in exactly this state, and it
    // must stay there until its owner says otherwise.
    const w = await world({ withPolicy: false });
    const r = await w.swap(TOKEN_PROGRAM, 100_000_000n, 1_000_000n, 990_000n, splTransferData(100_000_000n), []);
    expect(r.failed).toBe(true);
    expect(tokenBalance(w.vaultIn)).toBe(1_000_000_000n);
  });

  it_("refuses a DEX program the owner never allowlisted", async () => {
    const w = await world({ programs: [ATA_PROGRAM] }); // allowlisted something else
    const r = await w.swap(TOKEN_PROGRAM, 100_000_000n, 1_000_000n, 990_000n, splTransferData(100_000_000n), []);
    expect(reason(r)).toBe("PROGRAM_NOT_ALLOWED");
    expect(tokenBalance(w.vaultIn)).toBe(1_000_000_000n);
  });

  it_("takes the input from the spend cap like any other spend", async () => {
    const w = await world();
    const r = await w.swap(TOKEN_PROGRAM, 600_000_000n, 1_000_000n, 990_000n, splTransferData(1n), []);
    expect(reason(r)).toBe("SPEND_CAP_EXCEEDED");
    expect(tokenBalance(w.vaultIn)).toBe(1_000_000_000n);
  });

  it_("refuses a quote that already prices in worse than the owner accepted", async () => {
    // 1% tolerance, but the caller is willing to accept half the quote.
    const w = await world({ slippageBps: 100 });
    const r = await w.swap(TOKEN_PROGRAM, 100_000_000n, 1_000_000n, 500_000n, splTransferData(1n), []);
    expect(reason(r)).toBe("SLIPPAGE_EXCEEDED");
    expect(tokenBalance(w.vaultIn)).toBe(1_000_000_000n);
  });

  it_("reverts a route that takes the input and returns nothing", async () => {
    // The case the whole adapter exists for. The instruction is well-formed,
    // the program is allowlisted, the route runs and succeeds — and the vault
    // is left short. Only the balance afterwards reveals it, which is why the
    // check reads balances instead of parsing the route.
    const w = await world();
    const before = tokenBalance(w.vaultIn);
    const r = await w.swap(
      TOKEN_PROGRAM, 100_000_000n, 1_000_000n, 990_000n,
      splTransferData(100_000_000n),
      [rw(w.vaultIn), rw(w.sinkAta), ro(w.vault)], // SPL transfer: from, to, authority
    );
    expect(r.failed).toBe(true);
    expect(reason(r)).toBe("SLIPPAGE_EXCEEDED");
    // Reverted atomically: the tokens the route moved are back.
    expect(tokenBalance(w.vaultIn)).toBe(before);
    expect(tokenBalance(w.sinkAta)).toBe(0n);
  });

  it_("refuses a swap between a token and itself", async () => {
    const w = await world();
    const r = await send([{
      programAddress: PROGRAM_ID,
      accounts: [
        rw(w.grant), ro(w.swapPolicy), ro(w.vault), signer(w.executor),
        ro(w.inMint.address), ro(w.inMint.address),
        rw(w.vaultIn), rw(w.vaultIn), ro(TOKEN_PROGRAM), ro(TOKEN_PROGRAM),
      ],
      data: encodeExecuteSwap(0n, 1n, 1n, 1n, new Uint8Array()),
    }], w.executor);
    expect(r.failed).toBe(true);
  });

  it_("will not create a swap policy with a 100% slippage tolerance", async () => {
    // A zero floor is not a floor; the encoder refuses it before the chain has
    // to, and the program refuses it again.
    expect(() => encodeCreateSwapPolicy([TOKEN_PROGRAM], 10_000)).toThrow();
  });

  it_("only the grant owner may enable trading", async () => {
    const w = await world({ withPolicy: false });
    const stranger = await generateKeyPairSigner();
    svm.airdrop(stranger.address, lamports(1_000_000_000n));
    const r = await send([{
      programAddress: PROGRAM_ID,
      accounts: [rw(w.swapPolicy), ro(w.grant), signer(stranger, true), ro(SYSTEM)],
      data: encodeCreateSwapPolicy([TOKEN_PROGRAM], 100),
    }], stranger);
    expect(r.failed).toBe(true);
  });
});
