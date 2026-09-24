import { checkHealth, type Health } from "./api";

// Telling "asleep" apart from "broken".
//
// The API runs on a free Render service, which spins down after about fifteen
// minutes of no traffic and takes the better part of a minute to come back. The
// old health check gave up after roughly 38 seconds and every status indicator
// then said OFFLINE — so anyone opening the demo cold, which is exactly what a
// first-time visitor does, was shown a dashboard reporting that the backend was
// dead while it was in fact starting normally.
//
// That is not a cosmetic problem: it is the product telling the truth about
// something that is not true, on the one screen that forms a first impression.
//
// So the states are separated. `waking` is a real state with its own message
// and its own patience; `offline` is reserved for a backend that has had long
// enough and still is not answering.

export type BackendPhase = "checking" | "waking" | "online" | "offline";

/** A cold Render service is usually back inside this; past it, something is wrong. */
export const WAKE_BUDGET_MS = 90_000;
/** How long a single probe waits before assuming this one is not the one. */
const PROBE_TIMEOUT_MS = 15_000;
/** After this long with no answer, stop calling it "checking" and say what is happening. */
const WAKING_AFTER_MS = 4_000;

export interface BackendStatus {
  phase: BackendPhase;
  health: Health | null;
  /** How long the current attempt has been running, for a progress reading. */
  elapsedMs: number;
  /** 0..1 through the wake budget, so a bar can move instead of a spinner sitting still. */
  progress: number;
  error: string | null;
}

export const idleStatus: BackendStatus = { phase: "checking", health: null, elapsedMs: 0, progress: 0, error: null };

/**
 * Probe the API until it answers or the wake budget runs out.
 *
 * `onPhase` fires as the status changes so a caller can re-render without
 * waiting for the whole thing to settle — which is the point: a visitor should
 * see "waking the server" within a few seconds, not a frozen spinner for a
 * minute followed by a verdict.
 */
export async function probeBackend(
  onUpdate: (status: BackendStatus) => void,
  now: () => number = () => Date.now(),
  budgetMs: number = WAKE_BUDGET_MS,
): Promise<BackendStatus> {
  const started = now();
  let lastError: unknown = null;

  const emit = (phase: BackendPhase, health: Health | null, error: string | null): BackendStatus => {
    const elapsedMs = now() - started;
    const status: BackendStatus = {
      phase, health, elapsedMs,
      progress: Math.min(1, elapsedMs / budgetMs),
      error,
    };
    onUpdate(status);
    return status;
  };

  emit("checking", null, null);
  while (now() - started < budgetMs) {
    try {
      // One probe per round; checkHealth's own retry is disabled here because
      // this loop owns the pacing and the reporting.
      const health = await checkHealth(1, 0, PROBE_TIMEOUT_MS);
      return emit("online", health, null);
    } catch (error) {
      lastError = error;
      // Only claim the server is waking once a normal response would have
      // arrived. Saying it immediately would be guessing.
      emit(now() - started >= WAKING_AFTER_MS ? "waking" : "checking", null, null);
      if (now() - started >= budgetMs) break;
      await new Promise(resolve => setTimeout(resolve, 1_500));
    }
  }
  return emit("offline", null, lastError instanceof Error ? lastError.message : "API unreachable");
}

/** What to tell the reader, phase by phase. */
export function backendMessage(status: BackendStatus, lang: "en" | "vi" = "en"): { label: string; detail: string } {
  if (lang === "vi") {
    switch (status.phase) {
      case "online":
        return { label: "TRỰC TIẾP", detail: "Đã kết nối API Devnet." };
      case "waking":
        return {
          label: "ĐANG KHỞI ĐỘNG",
          detail: `Đang khởi động API — gói miễn phí ngủ sau mười lăm phút không hoạt động. Thường mất dưới một phút (${Math.round(status.elapsedMs / 1000)}s).`,
        };
      case "offline":
        return { label: "MẤT KẾT NỐI", detail: status.error ? `API không phản hồi: ${status.error}` : "API không phản hồi." };
      default:
        return { label: "ĐANG KIỂM TRA", detail: "Đang liên hệ API…" };
    }
  }
  switch (status.phase) {
    case "online":
      return { label: "LIVE", detail: "Connected to the Devnet API." };
    case "waking":
      return {
        label: "WAKING",
        // The honest version. A visitor who knows why they are waiting will
        // wait; one who is shown "offline" leaves.
        detail: `Starting the API — the free tier sleeps after fifteen minutes idle. This usually takes under a minute (${Math.round(status.elapsedMs / 1000)}s).`,
      };
    case "offline":
      return { label: "OFFLINE", detail: status.error ? `The API did not answer: ${status.error}` : "The API did not answer." };
    default:
      return { label: "CHECKING", detail: "Contacting the API…" };
  }
}
