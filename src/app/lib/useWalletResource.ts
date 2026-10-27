import { useEffect, useState } from "react";

/** Independent cards retain explicitly stale data, never data from a previous wallet. */
export function useWalletResource<T>(owner: string, enabled: boolean, load: (owner: string) => Promise<T>, revision: number) {
  const [state, setState] = useState<{ owner: string; data: T | null; error: boolean; loading: boolean }>({ owner: "", data: null, error: false, loading: false });
  useEffect(() => {
    if (!enabled || !owner) return;
    let alive = true, inflight = false;
    const read = async () => {
      if (inflight) return;
      inflight = true;
      setState(before => ({ owner, data: before.owner === owner ? before.data : null, error: before.owner === owner && before.error, loading: true }));
      try {
        const data = await load(owner);
        if (alive) setState({ owner, data, error: false, loading: false });
      } catch {
        if (alive) setState(before => ({ owner, data: before.owner === owner ? before.data : null, error: true, loading: false }));
      } finally { inflight = false; }
    };
    void read();
    const timer = setInterval(() => void read(), 15_000);
    return () => { alive = false; clearInterval(timer); };
  }, [owner, enabled, load, revision]);
  return enabled && state.owner === owner ? state : { owner, data: null, error: false, loading: enabled };
}
