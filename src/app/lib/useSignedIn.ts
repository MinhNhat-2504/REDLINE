import { useEffect, useState } from "react";
import { isSignedIn, SESSION_EVENT } from "./api";

/**
 * React view of `isSignedIn(wallet)`.
 *
 * The session lives in localStorage, which React cannot subscribe to. Signing
 * in happens in the header, so a page that read the flag once at render time
 * would keep offering "sign in first" until something else re-rendered it.
 * This listens to the in-window session event (same tab), `storage` (other
 * tabs) and focus, and re-checks periodically so an expiry is noticed too.
 */
export function useSignedIn(wallet: string | null | undefined): boolean {
  const [signedIn, setSignedIn] = useState(() => isSignedIn(wallet));
  useEffect(() => {
    const sync = () => setSignedIn(isSignedIn(wallet));
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const timer = setInterval(sync, 5_000);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      clearInterval(timer);
    };
  }, [wallet]);
  return signedIn;
}
