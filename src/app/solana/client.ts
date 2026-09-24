import { address, createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";

export const SOLANA_CLUSTER = "devnet" as const;
export const SOLANA_CHAIN = "solana:devnet" as const;
export const SOLANA_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL?.trim() || "https://api.devnet.solana.com";

export const solanaClient = createClient()
  .use(walletSigner({ chain: SOLANA_CHAIN }))
  .use(solanaRpc({ rpcUrl: SOLANA_RPC_URL }));

export type AppClient = Awaited<typeof solanaClient>;

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${encodeURIComponent(address)}?cluster=${SOLANA_CLUSTER}`;
}

export function explorerTransactionUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${SOLANA_CLUSTER}`;
}

// Decode the full public key before asking the wallet to sign. This proves the
// text is a canonical 32-byte Solana address; account existence is checked by
// the relevant RPC/program operation.
export function isAddressLike(value: string): boolean {
  try { address(value); return true; }
  catch { return false; }
}
