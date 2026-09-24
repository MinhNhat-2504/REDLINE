import { createHash } from "node:crypto";
import { getAddMemoInstruction } from "@solana-program/memo";
import {
  appendTransactionMessageInstruction,
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
} from "@solana/kit";

const HTTP_RPC = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const WS_RPC = process.env.SOLANA_DEVNET_WS_URL || "wss://api.devnet.solana.com";

const policy = {
  agentName: "REDLINE Devnet Proof",
  strategy: "Bounded proof-only policy with no delegated fund movement",
  tokens: ["SOL", "USDC"],
  spendCapUsdc: 500,
  maxTransactions: 25,
  durationHours: 12,
  cooldownMinutes: 10,
};

const canonical = JSON.stringify({ ...policy, tokens: [...policy.tokens].sort() });
const digest = createHash("sha256").update(canonical).digest("hex");
const memo = `REDLINE_POLICY_V1:${digest}`;

const rpc = createSolanaRpc(devnet(HTTP_RPC));
const signer = await generateKeyPairSigner();

async function waitForConfirmation(signature) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { value } = await rpc.getSignatureStatuses([signature], { searchTransactionHistory: true }).send();
    const status = value[0];
    if (status?.err) throw new Error(`Airdrop transaction failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
    await new Promise(resolve => setTimeout(resolve, 750));
  }
  throw new Error("Timed out while confirming the Devnet airdrop.");
}

async function createProof() {
  const airdropSignature = await rpc
    .requestAirdrop(signer.address, lamports(10_000_000n), { commitment: "confirmed" })
    .send({ abortSignal: AbortSignal.timeout(30_000) });
  await waitForConfirmation(airdropSignature);

  const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const instruction = getAddMemoInstruction({ memo });
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    message => setTransactionMessageFeePayerSigner(signer, message),
    message => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    message => appendTransactionMessageInstruction(instruction, message),
  );
  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
  const signature = getSignatureFromTransaction(signedTransaction);
  const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(WS_RPC));
  const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

  await sendAndConfirm(signedTransaction, {
    abortSignal: AbortSignal.timeout(60_000),
    commitment: "confirmed",
  });

  console.log(JSON.stringify({
    cluster: "devnet",
    digest,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    feePayer: signer.address,
    memo,
    signature,
  }, null, 2));
}

try {
  await createProof();
} catch (error) {
  const statusCode = error?.context?.statusCode;
  const reason = statusCode === 429
    ? "The public Devnet faucet is rate-limited. Retry later or set SOLANA_DEVNET_RPC_URL and SOLANA_DEVNET_WS_URL to a funded provider."
    : error instanceof Error ? error.message : "Unknown Devnet error.";
  console.error(`REDLINE proof not created: ${reason}`);
  process.exitCode = 1;
}
