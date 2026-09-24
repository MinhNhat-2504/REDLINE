import { beforeEach, describe, expect, it, vi } from "vitest";
import { coalesce } from "./coalesce";

// The bug this guards: the grants panel reloaded once per feed event, and a
// scripted run emits about twenty. The reloads overlapped, answered out of
// order, and the panel flickered between snapshots.

beforeEach(() => { vi.useFakeTimers(); });

describe("coalesce", () => {
  it("turns a burst of signals into one load", async () => {
    const task = vi.fn(async () => {});
    const c = coalesce(task, 300);
    for (let i = 0; i < 20; i += 1) c.request();
    await vi.advanceTimersByTimeAsync(300);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("waits for the burst to go quiet rather than firing at its start", async () => {
    const task = vi.fn(async () => {});
    const c = coalesce(task, 300);
    c.request();
    await vi.advanceTimersByTimeAsync(200);
    c.request(); // still arriving — the clock restarts
    await vi.advanceTimersByTimeAsync(200);
    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("never runs two loads at once", async () => {
    let inFlight = 0, peak = 0;
    const task = vi.fn(async () => {
      inFlight += 1; peak = Math.max(peak, inFlight);
      await new Promise(r => setTimeout(r, 1_000));
      inFlight -= 1;
    });
    const c = coalesce(task, 100);
    c.request();
    await vi.advanceTimersByTimeAsync(100);      // load 1 starts
    for (let i = 0; i < 10; i += 1) c.request(); // signals during the load
    await vi.advanceTimersByTimeAsync(5_000);
    expect(peak).toBe(1);
  });

  it("queues exactly one follow-up for signals that arrive mid-load", async () => {
    // Whatever those signals announced happened after the load began, so one
    // more load is needed to see it — and one is enough for all of them.
    const task = vi.fn(async () => { await new Promise(r => setTimeout(r, 1_000)); });
    const c = coalesce(task, 100);
    c.request();
    await vi.advanceTimersByTimeAsync(100);
    for (let i = 0; i < 10; i += 1) c.request();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("keeps going after a load throws", async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error("429")).mockResolvedValue(undefined);
    const c = coalesce(task, 100);
    c.request();
    await vi.advanceTimersByTimeAsync(100);
    c.request();
    await vi.advanceTimersByTimeAsync(100);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("drops a pending load when cancelled, so an unmounted panel stays quiet", async () => {
    const task = vi.fn(async () => {});
    const c = coalesce(task, 300);
    c.request();
    c.cancel();
    await vi.advanceTimersByTimeAsync(1_000);
    c.request();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(task).not.toHaveBeenCalled();
  });
});
