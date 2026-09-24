import { api, loadSession, storeSession, type WalletSession } from "./api";

// Wallet sign-in: the server issues a challenge naming this wallet and a
// one-time nonce, the wallet signs those exact bytes, and the server hands
// back a session. Nothing signed here can move funds — the message says so in
// the text the wallet displays.
//
// The API's shared key proves only that a caller read it out of the bundle.
// A session proves which wallet is calling, which is what ownership checks
// need (see backend/src/auth.ts requireGrantOwner).

/** Signs raw bytes with the connected wallet — `useSignMessage(client).dispatch`. */
export type SignMessage = (message: Uint8Array) => Promise<Uint8Array>;

/** The stored session, if it is for this wallet and has not expired. */
export function sessionFor(wallet: string | null | undefined): WalletSession | null {
  const session = loadSession();
  return session && wallet && session.wallet === wallet ? session : null;
}

// Signatures are 64 bytes, so spreading into fromCharCode is safe here; a
// larger buffer would need chunking to stay under the argument limit.
export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export async function signIn(signMessage: SignMessage, wallet: string): Promise<WalletSession> {
  const { nonce, message } = await api.authNonce(wallet);
  const signature = await signMessage(new TextEncoder().encode(message));
  const session = await api.authVerify({ wallet, nonce, signature: toBase64(signature) });
  storeSession(session);
  return session;
}

export function signOut(): void {
  storeSession(null);
}
