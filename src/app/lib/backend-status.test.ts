import { beforeEach, describe, expect, it, vi } from "vitest";

// The bug this guards: a visitor opening the demo cold was shown OFFLINE while
// the API was starting normally. "Asleep" and "broken" are different states and
// must read differently, or the first screen a judge sees reports a failure
// that is not happening.

const health = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("./api", () => ({ checkHealth: health.fn }));

const { backendMessage, probeBackend, WAKE_BUDGET_MS } = await import("./backend-status");
type Status = Awaited<ReturnType<typeof probeBackend>>;

const OK = { ok: true, chain: "solana", programId: "p", executor: "e", clockSpeed: 1 };

// A controllable clock, so budget behaviour is asserted rather than waited for.
function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

beforeEach(() => { health.fn.mockReset(); vi.useFakeTimers(); });

async function run(probe: Promise<Status>): Promise<Status> {
  // Drain the 1.5s waits between rounds without real time passing.
  for (let i = 0; i < 200; i += 1) await vi.advanceTimersByTimeAsync(1_500);
  return probe;
}

describe("probeBackend", () => {
  it("reports online on the first answer, without ever claiming a problem", async () => {
    health.fn.mockResolvedValue(OK);
    const seen: string[] = [];
    const final = await probeBackend(s => seen.push(s.phase));
    expect(final.phase).toBe("online");
    expect(final.health).toEqual(OK);
    expect(seen).not.toContain("offline");
    expect(seen).not.toContain("waking");
  });

  it("says 'waking', not 'offline', while a cold service is starting", async () => {
    const c = clock();
    // Four failures, each burning ten seconds, then success at ~40s — which is
    // what a real Render cold start looked like when measured.
    health.fn.mockImplementation(async () => {
      c.advance(10_000);
      if (c.now() < 40_000) throw new Error("fetch failed");
      return OK;
    });
    const seen: string[] = [];
    const final = await run(probeBackend(s => seen.push(s.phase), c.now));
    expect(final.phase).toBe("online");
    expect(seen).toContain("waking");
    expect(seen).not.toContain("offline");
  });

  it("does not cry wolf in the first few seconds", async () => {
    const c = clock();
    health.fn.mockImplementation(async () => { c.advance(1_000); throw new Error("fetch failed"); });
    const seen: string[] = [];
    await run(probeBackend(s => seen.push(s.phase), c.now, 3_000));
    // Under the 4s threshold nothing should have been called "waking" yet.
    expect(seen.filter(p => p === "waking")).toHaveLength(0);
  });

  it("gives up and says offline once the budget is spent", async () => {
    const c = clock();
    health.fn.mockImplementation(async () => { c.advance(15_000); throw new Error("fetch failed"); });
    const final = await run(probeBackend(() => {}, c.now, 30_000));
    expect(final.phase).toBe("offline");
    expect(final.error).toContain("fetch failed");
  });

  it("waits long enough for a real cold start before giving up", async () => {
    // The old check gave up at ~38s, which was shorter than the ~40s wake
    // actually measured against the deployed API.
    expect(WAKE_BUDGET_MS).toBeGreaterThanOrEqual(60_000);
  });

  it("reports progress through the budget so a bar can move", async () => {
    const c = clock();
    health.fn.mockImplementation(async () => { c.advance(10_000); throw new Error("nope"); });
    const progress: number[] = [];
    await run(probeBackend(s => progress.push(s.progress), c.now, 40_000));
    expect(Math.max(...progress)).toBeGreaterThan(0);
    expect(Math.max(...progress)).toBeLessThanOrEqual(1);
  });
});

describe("backendMessage", () => {
  it("explains the wait instead of alarming about it", () => {
    const m = backendMessage({ phase: "waking", health: null, elapsedMs: 12_000, progress: 0.13, error: null });
    expect(m.label).toBe("WAKING");
    expect(m.detail).toContain("free tier sleeps");
    expect(m.detail).toContain("12s");
    expect(m.detail).not.toMatch(/unreachable|offline|error/i);
  });

  it("still says offline plainly when it really is", () => {
    const m = backendMessage({ phase: "offline", health: null, elapsedMs: 90_000, progress: 1, error: "fetch failed" });
    expect(m.label).toBe("OFFLINE");
    expect(m.detail).toContain("fetch failed");
  });

  it("says live when it is live", () => {
    expect(backendMessage({ phase: "online", health: null, elapsedMs: 300, progress: 0, error: null }).label).toBe("LIVE");
  });
});

describe("backendMessage in Vietnamese", () => {
  it("explains the wait without alarming", () => {
    const m = backendMessage({ phase: "waking", health: null, elapsedMs: 12_000, progress: 0.13, error: null }, "vi");
    expect(m.label).toBe("ĐANG KHỞI ĐỘNG");
    expect(m.detail).toContain("12s");
    expect(m.detail).not.toMatch(/offline|unreachable|error/i);
  });

  it("still says offline plainly, with the real error", () => {
    const m = backendMessage({ phase: "offline", health: null, elapsedMs: 90_000, progress: 1, error: "fetch failed" }, "vi");
    expect(m.label).toBe("MẤT KẾT NỐI");
    expect(m.detail).toContain("fetch failed");
  });
});
