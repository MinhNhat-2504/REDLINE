// Turn a burst of "something changed" signals into one reload.
//
// The live feed emits an event per step of a proposal — intent, precheck,
// transaction, chain decision — so a scripted run of four proposals is twenty
// events in a few seconds. Reloading on each one started twenty overlapping
// fetches whose answers came back in whatever order the network chose, and
// the panel repainted with each: counters ran backwards, badges flipped, rows
// jumped. The data was never wrong for long. It was just never still.
//
// Two rules fix that:
//   - wait for a short quiet spell before loading, so a burst is one load;
//   - never run two loads at once — a signal that arrives mid-load queues
//     exactly one more, which is enough to pick up whatever it announced.

export interface Coalesced {
  /** Something changed; reload soon. Safe to call as often as events arrive. */
  request(): void;
  /** Stop: drops any pending reload. A load already in flight still finishes. */
  cancel(): void;
}

export function coalesce(task: () => Promise<unknown>, quietMs = 350): Coalesced {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let again = false;
  let cancelled = false;

  const run = async () => {
    timer = null;
    if (cancelled) return;
    running = true;
    try { await task(); } catch { /* the task reports its own errors */ }
    running = false;
    if (again && !cancelled) { again = false; schedule(); }
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(), quietMs);
  };

  return {
    request() {
      if (cancelled) return;
      if (running) { again = true; return; }
      schedule();
    },
    cancel() {
      cancelled = true;
      if (timer) { clearTimeout(timer); timer = null; }
    },
  };
}
