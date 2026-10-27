import { address, estimateAndSetResourceLimitsFactory, estimateResourceLimitsFactory, getBase64EncodedWireTransaction, getSignatureFromTransaction, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners, signature, type Instruction } from "@solana/kit";
import type { AppClient } from "./client";
import { confirmReceipt, type TransactionReceipt, type TransactionStage } from "../lib/transaction-status";
import { PROGRAM_ID } from "./redline";
import { isSolanaError, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE } from "@solana/kit";
import { SettledTransactionError } from "../lib/transaction-status";

export async function checkTransaction(client: AppClient, receipt: TransactionReceipt) {
  await confirmReceipt(receipt,
    async () => (await client.rpc.getSignatureStatuses([signature(receipt.signature)], { searchTransactionHistory: true }).send({ abortSignal: AbortSignal.timeout(12_000) })).value[0],
    () => client.rpc.getBlockHeight({ commitment: "finalized" }).send({ abortSignal: AbortSignal.timeout(12_000) }),
  );
}

/** Persist the signed receipt BEFORE broadcasting; recovery never re-sends. */
export async function sendTrackedTransaction(
  client: AppClient, instructions: Instruction[],
  stage: (stage: TransactionStage) => void,
  remember: (receipt: TransactionReceipt) => void,
): Promise<TransactionReceipt> {
  const message = await client.planTransaction(instructions, { abortSignal: AbortSignal.timeout(12_000) });
  const { value: lifetime } = await client.rpc.getLatestBlockhash({ commitment: "confirmed" }).send({ abortSignal: AbortSignal.timeout(12_000) });
  // Replace the planner's provisional zero budget using the SDK simulator.
  const estimate = estimateResourceLimitsFactory({ rpc: client.rpc });
  const estimateAndSet = estimateAndSetResourceLimitsFactory(async (planned, options) => {
    const result = await estimate(planned, options);
    return { ...result, computeUnitLimit: Math.min(1_400_000, result.computeUnitLimit + Math.max(300, Math.ceil(result.computeUnitLimit * 0.1))) };
  });
  const prepared = await estimateAndSet(setTransactionMessageLifetimeUsingBlockhash(lifetime, message), { commitment: "confirmed", abortSignal: AbortSignal.timeout(12_000) });
  stage("wallet");
  const transaction = await signTransactionMessageWithSigners(prepared);
  const receipt = { signature: String(getSignatureFromTransaction(transaction)), lastValidBlockHeight: String(lifetime.lastValidBlockHeight) };
  remember(receipt); // If durable storage fails, do not broadcast.
  stage("sending");
  try {
    await client.rpc.sendTransaction(getBase64EncodedWireTransaction(transaction), { encoding: "base64", preflightCommitment: "confirmed" }).send({ abortSignal: AbortSignal.timeout(15_000) });
  } catch (error) {
    if (isSolanaError(error, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE)) {
      throw new SettledTransactionError("failed", "The transaction was refused. Review the details before trying again.");
    }
    throw error;
  }
  stage("confirming");
  await checkTransaction(client, receipt);
  stage("confirmed");
  return receipt;
}

export async function accountExists(client: AppClient, account: string): Promise<boolean> {
  const { value } = await client.rpc.getAccountInfo(address(account), { encoding: "base64", commitment: "confirmed" }).send({ abortSignal: AbortSignal.timeout(12_000) });
  return value?.owner === PROGRAM_ID;
}
