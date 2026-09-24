import "../src/env.js";
import { existsSync, writeFileSync } from "node:fs";
import {
  AccountRole,
  airdropFactory,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type AccountMeta,
  type AccountSignerMeta,
  type Instruction,
  type KeyPairSigner,
} from "@solana/kit";
import { getCreateAccountInstruction, getTransferSolInstruction, SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import {
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getInitializeMintInstruction,
  getMintSize,
  getMintToInstruction,
  getTransferInstruction,
} from "@solana-program/token";
import { encodeInitVault, findVaultPda } from "../src/chain/anchor.js";
import { loadKeypair } from "../src/chain/solana.js";

// One-shot Devnet bootstrap for the demo:
//   keypairs (owner, executor, ops destination) → airdrops → demo USDC mint
//   → init_vault → vault ATA + ops ATA → mint 1,000 dUSDC into the vault.
// Prints the env lines to paste into .env. Safe to re-run: reuses keypairs,
// skips a vault that already exists.

type Ix = Instruction<string, readonly (AccountMeta | AccountSignerMeta)[]>;

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const WS = process.env.SOLANA_WS_URL ?? "wss://api.devnet.solana.com";
const PROGRAM_ID = process.env.REDLINE_PROGRAM_ID ?? "Fj7MV8Z2a3RdH4W8VF2XKfWAsWHT3jxhoqGMcmb4WbS4";
const DECIMALS = 6;
const VAULT_FUNDING = 1_000n * 10n ** BigInt(DECIMALS);

const rpc = createSolanaRpc(devnet(RPC));
const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(WS));
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
const airdrop = airdropFactory({ rpc, rpcSubscriptions });

async function keypair(path: string): Promise<KeyPairSigner> {
  if (existsSync(path)) return loadKeypair(path);
  const signer = await generateKeyPairSigner();
  // @solana/kit keeps the private key non-extractable by default; regenerate
  // as extractable so we can persist the 64-byte secret in Solana CLI format.
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const { createSignerFromKeyPair } = await import("@solana/kit");
  const extractable = await createSignerFromKeyPair(pair as CryptoKeyPair);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const secret = pkcs8.subarray(pkcs8.length - 32); // last 32 bytes of PKCS#8 Ed25519 = seed
  const bytes = new Uint8Array(64); bytes.set(secret, 0); bytes.set(raw, 32);
  writeFileSync(path, JSON.stringify([...bytes]));
  void signer;
  return extractable;
}

async function send(ixs: Ix[], feePayer: KeyPairSigner) {
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const msg = pipe(
    createTransactionMessage({ version: 0 }),
    m => setTransactionMessageFeePayerSigner(feePayer, m),
    m => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    m => appendTransactionMessageInstructions(ixs, m),
  );
  const signed = await signTransactionMessageWithSigners(msg);
  assertIsTransactionWithBlockhashLifetime(signed);
  await sendAndConfirm(signed, { commitment: "confirmed" });
  return getSignatureFromTransaction(signed) as string;
}

// Public Devnet faucet is often rate-limited. Try once; if it fails, tell the
// operator exactly which address to fund by hand and stop before spending.
async function ensureSol(address: Address, minSol: number, label: string) {
  const balance = async () => Number((await rpc.getBalance(address).send()).value) / 1e9;
  if ((await balance()) >= minSol) return;
  console.log(`airdrop ${minSol} SOL → ${label} ${address}`);
  try {
    await airdrop({ recipientAddress: address, lamports: lamports(BigInt(Math.round(minSol * 1e9))), commitment: "confirmed" });
  } catch (e) {
    const have = await balance();
    console.error(`
Airdrop failed (${e instanceof Error ? e.message : String(e)}).`);
    console.error(`${label} ${address} has ${have} SOL, needs ${minSol}. Fund it from another wallet, e.g. in Solana Playground:`);
    console.error(`  solana transfer ${address} ${minSol} --allow-unfunded-recipient`);
    console.error(`or https://faucet.solana.com, then re-run npm run devnet:setup.`);
    process.exit(1);
  }
}

const owner = await keypair(process.env.DEMO_OWNER_KEYPAIR_PATH ?? "./owner.json");
const executor = await keypair(process.env.EXECUTOR_KEYPAIR_PATH ?? "./executor.json");
const ops = await keypair("./ops-destination.json");
console.log({ owner: owner.address, executor: executor.address, ops: ops.address, programId: PROGRAM_ID });

await ensureSol(owner.address, 1.5, "owner");
// Executor only needs fee money; take it from the owner instead of the faucet.
{
  const have = Number((await rpc.getBalance(executor.address).send()).value) / 1e9;
  if (have < 0.3) {
    await send([getTransferSolInstruction({ source: owner, destination: executor.address, amount: lamports(400_000_000n) })], owner);
    console.log(`owner → executor 0.4 SOL for fees`);
  }
}

// 1. demo USDC mint (owner is mint authority)
let mintAddress = process.env.DEMO_USDC_MINT as Address | undefined;
if (!mintAddress) {
  const mint = await generateKeyPairSigner();
  const space = getMintSize();
  const rent = await rpc.getMinimumBalanceForRentExemption(BigInt(space)).send();
  await send([
    getCreateAccountInstruction({ payer: owner, newAccount: mint, lamports: rent, space, programAddress: TOKEN_PROGRAM_ADDRESS }),
    getInitializeMintInstruction({ mint: mint.address, decimals: DECIMALS, mintAuthority: owner.address }),
  ], owner);
  mintAddress = mint.address;
  console.log(`created demo USDC mint ${mintAddress}`);
}

// 2. vault PDA
const { address: vaultPda } = await findVaultPda(PROGRAM_ID, owner.address);
const existing = await rpc.getAccountInfo(vaultPda as Address, { encoding: "base64" }).send();
if (!existing.value) {
  const ix: Ix = {
    programAddress: PROGRAM_ID as Address,
    accounts: [
      { address: vaultPda as Address, role: AccountRole.WRITABLE },
      { address: owner.address, role: AccountRole.WRITABLE_SIGNER, signer: owner },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: encodeInitVault(),
  };
  console.log(`init_vault → ${await send([ix], owner)}`);
} else {
  console.log(`vault ${vaultPda} already exists`);
}

// 3. token accounts: owner ATA (mint target), vault ATA, ops ATA
const [ownerAta] = await findAssociatedTokenPda({ mint: mintAddress, owner: owner.address, tokenProgram: TOKEN_PROGRAM_ADDRESS });
const [vaultAta] = await findAssociatedTokenPda({ mint: mintAddress, owner: vaultPda as Address, tokenProgram: TOKEN_PROGRAM_ADDRESS });
const [opsAta] = await findAssociatedTokenPda({ mint: mintAddress, owner: ops.address, tokenProgram: TOKEN_PROGRAM_ADDRESS });
await send([
  getCreateAssociatedTokenIdempotentInstruction({ payer: owner, ata: ownerAta, owner: owner.address, mint: mintAddress }),
  getCreateAssociatedTokenIdempotentInstruction({ payer: owner, ata: vaultAta, owner: vaultPda as Address, mint: mintAddress }),
  getCreateAssociatedTokenIdempotentInstruction({ payer: owner, ata: opsAta, owner: ops.address, mint: mintAddress }),
  getMintToInstruction({ mint: mintAddress, token: ownerAta, mintAuthority: owner, amount: VAULT_FUNDING }),
  getTransferInstruction({ source: ownerAta, destination: vaultAta, authority: owner, amount: VAULT_FUNDING }),
], owner);
console.log(`vault ${vaultPda} funded with ${VAULT_FUNDING / 10n ** BigInt(DECIMALS)} dUSDC`);

console.log("\nPaste into backend/.env:");
console.log(`CHAIN=solana`);
console.log(`REDLINE_PROGRAM_ID=${PROGRAM_ID}`);
console.log(`DEMO_USDC_MINT=${mintAddress}`);
console.log(`DEMO_OWNER_WALLET=${owner.address}`);
console.log(`DEMO_VAULT_PDA=${vaultPda}`);
console.log(`DEMO_OPS_DESTINATION=${ops.address}`);
console.log(`EXECUTOR_KEYPAIR_PATH=./executor.json`);
console.log(`DEMO_OWNER_KEYPAIR_PATH=./owner.json`);
