import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";
import { api, subscribeFeed, type FeedEvent, fmtUsdc, short } from "../lib/api";
import { explorerTransactionUrl } from "../solana/client";
import { color, mono, panel, term } from "../theme";
import { useT } from "../i18n/LanguageContext";

const M = term.success, C = term.info, A = term.warn, R = term.danger;

const VI: Record<string, string> = {
  "live feed": "live feed",
  "Start the backend (cd backend && npm run dev) to see live events.": "Khởi động backend (cd backend && npm run dev) để xem sự kiện trực tiếp.",
  "Waiting for events — create a grant and start an agent.": "Đang chờ sự kiện — hãy tạo một grant và chạy agent.",
};

// Replaces the simulated runtime feed. Loads the audit tail, then appends
// server-sent events as they happen. Every line with a signature links to
// the explorer — the UI never shows a number the chain can't back.
function describe(e: FeedEvent): { color: string; text: string } {
  const p = e.payload as Record<string, string | number | boolean | null | undefined>;
  switch (e.eventType) {
    case "grant.created": return { color: M, text: `grant created · cap ${fmtUsdc(String((p.limits as unknown as { spendCapUnits: string })?.spendCapUnits ?? 0))} USDC · ${short(String(p.grantPda ?? ""))}` };
    case "run.started": return { color: C, text: `agent runtime started · ${p.mode}` };
    case "run.ended": return { color: term.dim, text: `agent runtime ended · ${p.reason}` };
    case "intent.created": return { color: C, text: `intent #${p.nonce} · transfer ${fmtUsdc(String(p.amountUnits ?? 0))} USDC → ${short(String(p.destination ?? ""))}` };
    case "decision.precheck": return p.allow ? { color: term.dim, text: `precheck · all gates passed` } : { color: A, text: `precheck DENY · ${p.reasonCode} — ${p.message}` };
    case "tx.confirmed": return { color: M, text: `on-chain ALLOW · spent ${fmtUsdc(String((p.counters as unknown as { spentUnits: string })?.spentUnits ?? 0))} USDC · tx ${p.transactionCount ?? ""}` };
    case "tx.rejected": return { color: R, text: `on-chain REJECT · ${p.reasonCode} · nothing moved` };
    case "chain.policy_decision": return { color: M, text: `indexer · PolicyDecision event · nonce ${p.nonce} · spent ${fmtUsdc(String(p.spentUnits ?? 0))}` };
    case "chain.grant_revoked": return { color: R, text: `indexer · GrantRevoked event` };
    case "grant.revoked": return { color: R, text: `owner revoked grant` };
    case "chain.tx_failed": return { color: R, text: `indexer · failed tx · ${p.variant ?? p.code}` };
    default: return { color: term.dim, text: e.eventType };
  }
}

export function LiveFeed({ grantId = "*", limit = 12 }: { grantId?: string; limit?: number }) {
  const tr = useT(VI);
  const [rows, setRows] = useState<FeedEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");

  useEffect(() => {
    let cancelled = false;
    api.audit(grantId === "*" ? undefined : grantId)
      .then(a => { if (!cancelled) { setRows(a.slice(-limit).map(r => ({ id: r.id, at: r.createdAt, eventType: r.eventType, actorType: r.actorType, payload: r.payload, chainSignature: r.chainSignature }))); setStatus("live"); } })
      .catch(() => setStatus("offline"));
    // Same reconnect overlap as the audit table: drop an event already shown
    // rather than printing it twice.
    const off = subscribeFeed(grantId, e => setRows(prev => (prev.some(r => r.id === e.id) ? prev : [...prev, e].slice(-limit))));
    return () => { cancelled = true; off(); };
  }, [grantId, limit]);

  return (
    <div className="rounded-2xl overflow-hidden px-block" style={panel()}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: color.border, background: color.surfaceSubtle }}>
        <div className="flex gap-1.5">{[R, A, M].map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />)}</div>
        <Terminal size={11} style={{ color: M }} />
        <span className="text-[13px]" style={{ ...mono, color: color.textMuted }}>runtime · {status === "live" ? tr("live feed") : status}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: status === "live" ? M : status === "offline" ? R : A, animation: status === "live" ? "redline-pulse 2s infinite" : "none" }} />
          <span className="text-[12px] font-bold" style={{ ...mono, color: status === "live" ? M : status === "offline" ? R : A }}>{status === "live" ? "LIVE" : status === "offline" ? "OFFLINE" : "…"}</span>
        </div>
      </div>
      <div className="p-4 space-y-2 min-h-[180px]" style={{ background: term.bg }}>
        {rows.length === 0 && <div className="text-[13px]" style={{ ...mono, color: term.dim }}>{status === "offline" ? tr("Start the backend (cd backend && npm run dev) to see live events.") : tr("Waiting for events — create a grant and start an agent.")}</div>}
        {rows.map(e => {
          const d = describe(e);
          return (
            <div key={e.id} className="flex gap-3 text-[13px]" style={mono}>
              <span style={{ color: term.faint, minWidth: 60 }}>{new Date(e.at).toLocaleTimeString("en-US", { hour12: false })}</span>
              <span style={{ color: d.color }} className="flex-1">{d.text}</span>
              {e.chainSignature && !e.chainSignature.startsWith("MOCK") && (
                <a href={explorerTransactionUrl(e.chainSignature)} target="_blank" rel="noreferrer" style={{ color: C }} title={e.chainSignature}>{short(e.chainSignature, 4)} ↗</a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
