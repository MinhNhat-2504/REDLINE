import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { backendMessage, idleStatus, probeBackend, type BackendStatus } from "../lib/backend-status";
import { useLang, useT } from "../i18n/LanguageContext";

const VI: Record<string, string> = {
  "API connected": "Đã kết nối API",
  "Live Devnet data is loading.": "Đang tải dữ liệu Devnet trực tiếp.",
  "Try again": "Thử lại",
};

/**
 * One probe for the whole page.
 *
 * Every page used to run its own health check, which meant a cold start was
 * probed four or five times in parallel and each indicator reached its own
 * verdict at its own moment. Sharing one result also means one message, so the
 * dashboard cannot say LIVE in the header and OFFLINE in the sidebar.
 */
let shared: { status: BackendStatus; subscribers: Set<(s: BackendStatus) => void>; running: boolean } | null = null;

function ensureProbe() {
  if (!shared) shared = { status: idleStatus, subscribers: new Set(), running: false };
  const state = shared;
  if (state.running || state.status.phase === "online") return;
  state.running = true;
  void probeBackend(status => {
    state.status = status;
    for (const notify of state.subscribers) notify(status);
  }).finally(() => { state.running = false; });
}

export function useBackendStatus(): BackendStatus & { retry: () => void } {
  const [status, setStatus] = useState<BackendStatus>(() => shared?.status ?? idleStatus);
  useEffect(() => {
    if (!shared) shared = { status: idleStatus, subscribers: new Set(), running: false };
    shared.subscribers.add(setStatus);
    ensureProbe();
    return () => { shared?.subscribers.delete(setStatus); };
  }, []);
  const retry = useCallback(() => {
    if (shared) shared.status = idleStatus;
    setStatus(idleStatus);
    ensureProbe();
  }, []);
  return { ...status, retry };
}

/**
 * The banner a first-time visitor sees while the API wakes.
 *
 * It is deliberately not a spinner. A visitor who is told *why* they are
 * waiting, and shown the wait moving, will wait; one shown an unexplained
 * spinner — or worse, "OFFLINE" — concludes the demo is broken and leaves.
 * That conclusion was wrong, and it was the first thing the product said.
 */
export function BackendStatusBanner() {
  const status = useBackendStatus();
  const { lang } = useLang();
  const tr = useT(VI);
  const message = backendMessage(status, lang);
  // Keep the banner up for a beat after it connects, so the transition is
  // legible rather than a flash of text that vanishes.
  const [visible, setVisible] = useState(false);
  const settled = useRef(false);
  useEffect(() => {
    if (status.phase === "waking" || status.phase === "offline") { setVisible(true); settled.current = true; return; }
    if (status.phase === "online" && settled.current) {
      const t = setTimeout(() => setVisible(false), 2_500);
      return () => clearTimeout(t);
    }
  }, [status.phase]);

  if (!visible) return null;
  const offline = status.phase === "offline";
  return (
    <div className={`backend-banner${offline ? " is-offline" : ""}${status.phase === "online" ? " is-online" : ""}`} role="status" aria-live="polite">
      <span className="backend-banner-icon">
        {offline ? <WifiOff size={15} /> : <Loader2 size={15} className={status.phase === "online" ? "" : "spin"} />}
      </span>
      <span className="backend-banner-text">
        <strong>{status.phase === "online" ? tr("API connected") : message.label}</strong>
        <small>{status.phase === "online" ? tr("Live Devnet data is loading.") : message.detail}</small>
      </span>
      {status.phase !== "online" && (
        <span className="backend-banner-track" aria-hidden="true">
          <i style={{ width: `${Math.round(status.progress * 100)}%` }} />
        </span>
      )}
      {offline && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={status.retry}>{tr("Try again")}</button>
      )}
    </div>
  );
}
