import "../src/env.js";
import { AccountRole, type Address, type AccountMeta, type AccountSignerMeta, type Instruction } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS, ASSOCIATED_TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import { SolanaChain } from "../src/chain/solana.js";
import { encodeWithdraw, findVaultPda } from "../src/chain/anchor.js";

// One-off: withdraw 1 dUSDC with the demo owner key to prove the `withdraw`
// account order used by the browser matches the program.
const chain = await SolanaChain.create({
  rpcUrl: process.env.SOLANA_RPC_URL!, wsUrl: process.env.SOLANA_WS_URL!, programId: process.env.REDLINE_PROGRAM_ID!,
  executorKeypairPath: process.env.EXECUTOR_KEYPAIR_PATH!, ownerKeypairPath: process.env.DEMO_OWNER_KEYPAIR_PATH!,
});
const owner = chain.ownerSigner;
const mint = process.env.DEMO_USDC_MINT! as Address;
const { address: vault } = await findVaultPda(chain.programId, owner.address);
const [vaultAta] = await findAssociatedTokenPda({ mint, owner: vault as Address, tokenProgram: TOKEN_PROGRAM_ADDRESS });
const [ownerAta] = await findAssociatedTokenPda({ mint, owner: owner.address, tokenProgram: TOKEN_PROGRAM_ADDRESS });
const before = await chain.tokenBalance(vaultAta);
const ix: Instruction<string, readonly (AccountMeta | AccountSignerMeta)[]> = {
  programAddress: chain.programId as Address,
  accounts: [
    { address: vault as Address, role: AccountRole.READONLY },
    { address: owner.address, role: AccountRole.WRITABLE_SIGNER, signer: owner },
    { address: mint, role: AccountRole.READONLY },
    { address: vaultAta, role: AccountRole.WRITABLE },
    { address: ownerAta, role: AccountRole.WRITABLE },
    { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
  ],
  data: encodeWithdraw(1_000_000n),
};
// @ts-expect-error private for a reason; this is a diagnostic script
const r = await chain.send([ix], owner);
const after = await chain.tokenBalance(vaultAta);
console.log(JSON.stringify({ signature: r.signature, err: r.err, vaultBefore: before, vaultAfter: after, logs: r.logs.filter((l: string) => /Error|Instruction:/.test(l)) }, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2));
process.exit(0);
