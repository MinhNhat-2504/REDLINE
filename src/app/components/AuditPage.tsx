import { useCallback, useEffect, useState } from "react";
import {
  ScrollText, ExternalLink, Filter, RefreshCw, Search,
  ShieldCheck, ShieldOff, Zap, Play, AlertTriangle,
  CheckCircle2, XCircle, Eye, FileText, Activity,
  ChevronDown,
} from "lucide-react";
import { api, subscribeFeed, fmtUsdc, short, type AuditRow, type Grant, type FeedEvent } from "../lib/api";
import { explorerTransactionUrl } from "../solana/client";
import { color, mono, sans } from "../theme";
import { useT } from "../i18n/LanguageContext";

const M = color.primary, C = color.info, A = color.warn, R = color.danger;

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`; this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  "Verifiable Audit Trail": "Nhật Ký Kiểm Toán Có Thể Xác Minh",
  "Log": "Log",
  "Every intent, decision, and on-chain signature — verifiable on Solana Explorer.":
    "Mọi intent, quyết định và chữ ký on-chain — đều có thể xác minh trên Solana Explorer.",
  "Two writers fill this table. The runtime records what it submitted; the indexer decodes the program's own logs and writes its own row — for these transactions and anyone else's. Rows marked ":
    "Hai bên ghi vào bảng này. Runtime ghi lại những gì nó đã gửi; indexer giải mã log của chính chương trình và ghi dòng riêng của nó — cho giao dịch của bạn và của bất kỳ ai khác. Các dòng đánh dấu ",
  " came from the second, so a decision carrying ": " đến từ indexer, nên một quyết định mang biểu tượng ",
  " is one where both accounts agree. Nothing here rests on this server being believed.":
    " là quyết định mà cả hai bản ghi đều khớp nhau. Không có gì ở đây phụ thuộc vào việc tin tưởng server này.",
  "Total Events": "Tổng Số Sự Kiện",
  "Every row this system has written.": "Mọi dòng mà hệ thống này đã ghi.",
  "On-chain Sigs": "Chữ Ký On-chain",
  "Rows carrying a real Devnet signature you can open.": "Các dòng mang chữ ký Devnet thật mà bạn có thể mở ra xem.",
  "Corroborated": "Được Đối Chiếu",
  "Decisions where the server's record and the program's own logs agree — read back independently, not taken on trust.":
    "Các quyết định mà bản ghi của server và log của chính chương trình khớp nhau — được đọc lại độc lập, không dựa trên niềm tin.",
  "TX Rejected": "Giao Dịch Bị Từ Chối",
  "Transfers the program refused. Nothing moved on any of them.": "Các giao dịch bị chương trình từ chối. Không có giao dịch nào trong số đó được thực hiện.",
  "Search events, signatures, reason codes...": "Tìm sự kiện, chữ ký, mã lý do...",
  "Grant …": "Grant …",
  "All Grants": "Tất Cả Grant",
  "Refresh": "Làm Mới",
  "Showing": "Đang hiển thị",
  "events": "sự kiện",
  "matching": "khớp với",
  "Backend Unreachable": "Không Kết Nối Được Backend",
  "Start the backend with": "Khởi động backend bằng lệnh",
  "Time": "Thời Gian",
  "Event": "Sự Kiện",
  "Details": "Chi Tiết",
  "Source": "Nguồn",
  "Signature": "Chữ Ký",
  "No audit events yet": "Chưa có sự kiện kiểm toán nào",
  "Create a grant and start an agent to see events appear here in real time.":
    "Tạo một grant và chạy agent để thấy sự kiện xuất hiện tại đây theo thời gian thực.",
  "Decoded from the program's own logs by the indexer — not from anything this server remembered.":
    "Được indexer giải mã trực tiếp từ log của chương trình — không phải từ bất cứ điều gì server này tự ghi nhớ.",
  "Recorded by the ": "Được ghi lại bởi ",
  "owner's action": "hành động của chủ sở hữu",
  " as it happened.": " ngay khi nó xảy ra.",
  "chain log": "chain log",
  "The server's record of this transaction and the program's own logs agree. Two independent writers, one signature.":
    "Bản ghi của server cho giao dịch này khớp với log của chính chương trình. Hai bên ghi độc lập, cùng một chữ ký.",
  "This audit trail is append-only. Every event with a chain signature can be independently verified on":
    "Nhật ký kiểm toán này chỉ có thể được thêm vào, không thể sửa. Mọi sự kiện có chữ ký on-chain đều có thể được xác minh độc lập trên",
  "The indexer reads program logs directly — dashboard numbers come from the chain, not the server.":
    "Indexer đọc trực tiếp log của chương trình — số liệu trên dashboard đến từ chuỗi, không phải từ server.",
};
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: color.surface,
  boxShadow: "0 18px 48px rgba(4, 2, 12, 0.55)",
  border: `1px solid ${color.border}`,
  ...extra,
});

/* Event type → color + icon mapping */
function eventMeta(eventType: string): { color: string; icon: React.ElementType; label: string } {
  switch (eventType) {
    case "grant.created": return { color: M, icon: ShieldCheck, label: "Grant Created" };
    case "grant.revoked": return { color: R, icon: ShieldOff, label: "Grant Revoked" };
    case "run.started": return { color: C, icon: Play, label: "Run Started" };
    case "run.ended": return { color: color.textMuted, icon: XCircle, label: "Run Ended" };
    case "intent.created": return { color: C, icon: Zap, label: "Intent Created" };
    case "decision.precheck":return { color: A, icon: Eye, label: "Precheck" };
    case "tx.confirmed": return { color: M, icon: CheckCircle2, label: "TX Confirmed" };
    case "tx.rejected": return { color: R, icon: XCircle, label: "TX Rejected" };
    case "chain.policy_decision": return { color: M, icon: Activity, label: "Policy Decision" };
    case "chain.grant_revoked": return { color: R, icon: ShieldOff, label: "Chain Revoked" };
    case "chain.grant_created": return { color: M, icon: ShieldCheck, label: "Chain Grant" };
    case "chain.tx_failed": return { color: R, icon: AlertTriangle, label: "Chain TX Failed" };
    case "agent.published": return { color: C, icon: FileText, label: "Agent Published" };
    default: return { color: color.textMuted, icon: Activity, label: eventType };
  }
}

/* Describe payload for human readability */
function describePayload(row: AuditRow): string {
  const p = row.payload as Record<string, unknown>;
  switch (row.eventType) {
    case "grant.created": {
      const limits = p.limits as Record<string, unknown> | undefined;
      if (limits) return `cap ${fmtUsdc(String(limits.spendCapUnits ?? 0))} USDC · ${limits.maxTransactions} tx · grant ${short(String(p.grantPda ?? ""))}`;
      return `grant ${short(String(p.grantPda ?? ""))}`;
    }
    case "grant.revoked": return `owner revoked grant`;
    case "run.started": return `mode: ${p.mode ?? "unknown"}`;
    case "run.ended": return `reason: ${p.reason ?? "completed"}`;
    case "intent.created": return `#${p.nonce} · ${fmtUsdc(String(p.amountUnits ?? 0))} USDC → ${short(String(p.destination ?? ""))}`;
    case "decision.precheck": return p.allow ? "all gates passed" : `DENY: ${p.reasonCode} — ${p.message}`;
    case "tx.confirmed": {
      const counters = p.counters as Record<string, unknown> | undefined;
      return `spent ${fmtUsdc(String(counters?.spentUnits ?? 0))} USDC · tx #${p.transactionCount ?? ""}`;
    }
    case "tx.rejected": return `${p.reasonCode} · nothing moved`;
    case "chain.policy_decision": return `nonce ${p.nonce} · spent ${fmtUsdc(String(p.spentUnits ?? 0))} USDC`;
    case "chain.grant_revoked": return "grant revoked on-chain";
    case "chain.tx_failed": return `${p.variant ?? p.code ?? "unknown error"}`;
    case "chain.grant_created": return `grant ${short(String(p.grantPda ?? ""))} · owner ${short(String(p.owner ?? ""))}`;
    case "agent.published": return `agent ${String(p.name ?? "")} ${String(p.version ?? "")} · ${short(String(p.agentHash ?? ""))}`;
    default: {
      const s = JSON.stringify(p);
      return s.replace(/[a-zA-Z0-9]{32,64}/g, match => short(match)).slice(0, 120);
    }
  }
}

export function AuditPage() {
  const tr = useT(VI);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const auditRows = await api.audit(selectedGrant || undefined);
      setRows(auditRows);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }, [selectedGrant]);

  /* Load grants for filter dropdown */
  useEffect(() => {
    api.grants().then(setGrants).catch(() => { /* grants filter unavailable */ });
  }, []);

  /* Load audit rows + subscribe to SSE */
  useEffect(() => {
    setLoading(true);
    void load();
    const grantFilter = selectedGrant || "*";
    const off = subscribeFeed(grantFilter, (e: FeedEvent) => {
      const newRow: AuditRow = {
        id: e.id,
        createdAt: e.at,
        actorType: e.actorType,
        eventType: e.eventType,
        subjectType: "",
        subjectId: "",
        chainSignature: e.chainSignature ?? null,
        payload: e.payload,
      };
      // Dedupe by id. The initial load and the stream overlap, and the stream
      // reconnects whenever the host sleeps — on a page whose whole point is
      // that the record can be trusted, one event shown twice is the worst
      // possible cosmetic bug.
      setRows(prev => (prev.some(r => r.id === newRow.id) ? prev : [...prev, newRow]));
    });
    return () => off();
  }, [load, selectedGrant]);

  /* Filter rows by search */
  const filtered = rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.eventType.toLowerCase().includes(s) ||
      r.actorType.toLowerCase().includes(s) ||
      (r.chainSignature?.toLowerCase().includes(s) ?? false) ||
      describePayload(r).toLowerCase().includes(s)
    );
  });
  // How much of what is on screen the API masked because it is not ours.
  const redactedCount = filtered.filter(r => r.redacted).length;

  /* Stats */
  const totalEvents = rows.length;
  const onchainEvents = rows.filter(r => r.chainSignature && !r.chainSignature.startsWith("MOCK")).length;
  const rejects = rows.filter(r => r.eventType === "tx.rejected" || r.eventType === "chain.tx_failed").length;

  // Two independent writers land in this table. The runtime records what it
  // submitted and what came back; the indexer decodes the program's own logs
  // and writes its own row, for our transactions and anyone else's. When both
  // exist for one signature the decision is corroborated — the server's account
  // of it agrees with the chain's, and neither had to be taken on trust.
  //
  // The distinction is the event name, not the actor. The indexer prefixes its
  // events with "chain."; everything else on the same signature is this side's
  // account of it, whether the executor wrote it after submitting or the API
  // wrote it when the owner's wallet did.
  const corroboration = new Map<string, { chain: boolean; server: boolean }>();
  for (const r of rows) {
    const sig = r.chainSignature;
    if (!sig || sig.startsWith("MOCK")) continue;
    const seen = corroboration.get(sig) ?? { chain: false, server: false };
    if (r.eventType.startsWith("chain.")) seen.chain = true;
    else seen.server = true;
    corroboration.set(sig, seen);
  }
  const corroborated = [...corroboration.values()].filter(v => v.chain && v.server).length;

  return (
    <div className="route-page page-audit space-y-8">
      {/* Header */}
      <div className="route-local-heading">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${M}14`, border: `1px solid ${M}20` }}><ScrollText size={12} style={{ color: M }} /></div>
          <span className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ ...mono, color: M }}>{tr("Verifiable Audit Trail")}</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ ...sans, color: color.text }}>Audit <span style={{ color: M }}>{tr("Log")}</span></h1>
        <p className="text-sm mt-1" style={{ ...sans, color: color.textDim }}>{tr("Every intent, decision, and on-chain signature — verifiable on Solana Explorer.")}</p>
        <p className="text-xs mt-2 max-w-3xl" style={{ ...sans, color: color.textDim, lineHeight: 1.7 }}>
          {tr("Two writers fill this table. The runtime records what it submitted; the indexer decodes the program's own logs and writes its own row — for these transactions and anyone else's. Rows marked ")}<span style={{ ...mono, color: C }}>chain log</span>{tr(" came from the second, so a decision carrying ")}<ShieldCheck size={11} style={{ color: M, display: "inline", verticalAlign: "-1px" }} />{tr(" is one where both accounts agree. Nothing here rests on this server being believed.")}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: tr("Total Events"), value: totalEvents.toLocaleString(), color: M, icon: Activity, hint: tr("Every row this system has written.") },
          { label: tr("On-chain Sigs"), value: onchainEvents.toLocaleString(), color: C, icon: ExternalLink, hint: tr("Rows carrying a real Devnet signature you can open.") },
          { label: tr("Corroborated"), value: corroborated.toLocaleString(), color: corroborated > 0 ? M : color.textMuted, icon: ShieldCheck, hint: tr("Decisions where the server's record and the program's own logs agree — read back independently, not taken on trust.") },
          { label: tr("TX Rejected"), value: rejects.toLocaleString(), color: rejects > 0 ? R : color.textMuted, icon: XCircle, hint: tr("Transfers the program refused. Nothing moved on any of them.") },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={`audit-stat-${i}`} title={s.hint} className="rounded-2xl p-5 relative overflow-hidden group px-block px-lift"
              style={{ ...glass(), boxShadow: "0 18px 48px rgba(4, 2, 12, 0.55)" }}>
              <div className="absolute top-0 left-6 right-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${s.color}50, transparent)` }} />
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: `${s.color}14`, border: `1px solid ${s.color}20` }}>
                  <Icon size={11} style={{ color: s.color }} />
                </div>
                <span className="text-[13px]" style={{ ...sans, color: color.textSecondary }}>{s.label}</span>
              </div>
              <div className="text-xl font-bold" style={{ ...mono, color: color.text }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: color.textDim }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("Search events, signatures, reason codes...")}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-xs outline-none transition-all"
            style={{ ...sans, background: color.surface, border: `1px solid ${color.border}`, color: color.text, caretColor: M }}
            onFocus={e => { e.target.style.borderColor = `${M}35`; e.target.style.boxShadow = `0 0 0 3px ${M}10`; }}
            onBlur={e => { e.target.style.borderColor = color.border; e.target.style.boxShadow = "none"; }} />
        </div>

        {/* Grant filter dropdown */}
        <div className="relative">
          <button type="button" onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all shrink-0 min-w-[180px]"
            style={{ ...sans, background: selectedGrant ? `${C}12` : color.surface, border: `1px solid ${selectedGrant ? C + "35" : color.border}`, color: selectedGrant ? C : color.textDim }}>
            <Filter size={13} />
            {selectedGrant ? `${tr("Grant …")}${selectedGrant.slice(-6)}` : tr("All Grants")}
            <ChevronDown size={12} className="ml-auto" style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
              style={{ ...glass(), boxShadow: "0 18px 48px rgba(4, 2, 12, 0.55)" }}>
              <button type="button" onClick={() => { setSelectedGrant(""); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/[0.04] transition-colors"
                style={{ ...sans, color: !selectedGrant ? M : color.textSecondary, background: !selectedGrant ? `${M}08` : "transparent" }}>
                {tr("All Grants")}
              </button>
              {grants.map(g => (
                <button type="button" key={g.id} onClick={() => { setSelectedGrant(g.id); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/[0.04] transition-colors border-t"
                  style={{ ...sans, color: selectedGrant === g.id ? M : color.textSecondary, background: selectedGrant === g.id ? `${M}08` : "transparent", borderColor: color.border }}>
                  <div className="flex items-center justify-between">
                    <span>{g.agentVersion.name} <span style={{ color: color.textDim }}>{g.agentVersion.version}</span></span>
                    <span style={{ ...mono, color: g.revoked ? R : C, fontSize: 11.5 }}>{g.revoked ? "REVOKED" : "ACTIVE"}</span>
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ ...mono, color: color.textDim }}>grant {short(g.grantPda)} · {short(g.id)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button type="button" onClick={() => { setLoading(true); void load(); }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold shrink-0 transition-all hover:bg-white/[0.04]"
          style={{ ...sans, background: color.surface, border: `1px solid ${color.border}`, color: color.textDim }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />{tr("Refresh")}
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ ...sans, color: color.textDim }}>
          {tr("Showing")} <span style={{ color: color.text }}>{filtered.length}</span> {tr("events")}
          {search && <span> {tr("matching")} &quot;{search}&quot;</span>}
          {selectedGrant && <span> · grant {short(selectedGrant)}</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: error ? R : M, animation: error ? "none" : "redline-pulse 2s infinite" }} />
          <span className="text-[12px] font-bold" style={{ ...mono, color: error ? R : M }}>{error ? "OFFLINE" : "LIVE"}</span>
        </div>
      </div>

      {/* Redaction notice. The API masks identity for anyone who is not the
          owner of the events, so the page has to say that rather than present
          a partial record as the whole one. */}
      {redactedCount > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-4" style={{ background: `${A}09`, border: `1px solid ${A}20` }}>
          <div className="p-2 rounded-xl shrink-0" style={{ background: `${A}14`, border: `1px solid ${A}25` }}><Eye size={14} style={{ color: A }} /></div>
          <div className="flex-1">
            <div className="text-xs font-semibold" style={{ ...sans, color: color.text }}>{tr("Redacted view")}</div>
            <div className="text-[13px] mt-0.5" style={{ ...sans, color: color.textMuted }}>
              {redactedCount === filtered.length
                ? tr("Wallets, vaults and destinations are masked by the API because these events are not yours. The reason codes, amounts and on-chain signatures are complete — that is what makes the record checkable. Sign in with the owning wallet to see the rest.")
                : tr("Some of these events belong to other wallets and are masked by the API. Your own are shown in full.")}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: `${R}09`, border: `1px solid ${R}20` }}>
          <div className="p-2 rounded-xl" style={{ background: `${R}14`, border: `1px solid ${R}25` }}><AlertTriangle size={14} style={{ color: R }} /></div>
          <div className="flex-1">
            <div className="text-xs font-semibold" style={{ ...sans, color: color.text }}>{tr("Backend Unreachable")}</div>
            <div className="text-[13px] mt-0.5" style={{ ...sans, color: color.textMuted }}>{error}. {tr("Start the backend with")} <code style={{ ...mono, color: C }}>cd backend && npm run dev</code></div>
          </div>
        </div>
      )}

      {/* Audit table */}
      <div className="audit-ledger rounded-2xl overflow-hidden px-block" style={{ ...glass() }}>
        {/* Table header */}
        <div className="grid items-center px-5 py-3 border-b audit-ledger-head"
          style={{ gridTemplateColumns: "90px 130px 1fr 120px 90px", borderColor: color.border, background: color.surfaceSubtle }}>
          <span className="text-[12px] font-bold tracking-widest uppercase" style={{ ...mono, color: color.textDim }}>{tr("Time")}</span>
          <span className="text-[12px] font-bold tracking-widest uppercase" style={{ ...mono, color: color.textDim }}>{tr("Event")}</span>
          <span className="text-[12px] font-bold tracking-widest uppercase" style={{ ...mono, color: color.textDim }}>{tr("Details")}</span>
          <span className="text-[12px] font-bold tracking-widest uppercase" style={{ ...mono, color: color.textDim }}>{tr("Source")}</span>
          <span className="text-[12px] font-bold tracking-widest uppercase text-right" style={{ ...mono, color: color.textDim }}>{tr("Signature")}</span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && !loading && !error && (
          <div className="px-5 py-12 text-center">
            <ScrollText size={24} style={{ color: color.border, margin: "0 auto 12px" }} />
            <div className="text-sm font-semibold mb-1" style={{ ...sans, color: color.textDim }}>{tr("No audit events yet")}</div>
            <div className="text-xs" style={{ ...sans, color: color.textDim }}>{tr("Create a grant and start an agent to see events appear here in real time.")}</div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && filtered.length === 0 && (
          <div className="px-5 py-8 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={`skel-${i}`} className="h-5 rounded-lg animate-pulse" style={{ background: color.surfaceSubtle, width: `${70 + Math.random() * 30}%` }} />
            ))}
          </div>
        )}

        {/* Audit rows */}
        {filtered.map((row, idx) => {
          const meta = eventMeta(row.eventType);
          const Icon = meta.icon;
          const desc = describePayload(row);
          const hasSig = row.chainSignature && !row.chainSignature.startsWith("MOCK");
          const isReject = row.eventType === "tx.rejected" || row.eventType === "chain.tx_failed";
          const isConfirm = row.eventType === "tx.confirmed" || row.eventType === "chain.policy_decision";
          const fromIndexer = row.eventType.startsWith("chain.");
          const pair = row.chainSignature ? corroboration.get(row.chainSignature) : undefined;
          const agreed = Boolean(pair?.chain && pair.server);
          return (
            <div key={row.id}
              className="grid items-center px-5 py-3 border-b hover:bg-white/[0.018] transition-colors group ledger-row"
              style={{
                gridTemplateColumns: "90px 130px 1fr 120px 90px",
                borderColor: color.border,
                background: isReject ? "rgba(239,68,68,0.03)" : isConfirm ? "rgba(0,255,196,0.02)" : "transparent",
                animation: idx === filtered.length - 1 ? "fadeIn 0.3s ease-out" : undefined,
              }}>
              {/* Time */}
              <span className="text-[13px]" style={{ ...mono, color: "rgba(148,163,184,0.5)" }}>
                {new Date(row.createdAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>

              {/* Event badge */}
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-md" style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}20` }}>
                  <Icon size={10} style={{ color: meta.color }} />
                </div>
                <span className="text-[12px] font-semibold truncate" style={{ ...mono, color: meta.color }}>{meta.label}</span>
              </div>

              {/* Description */}
              <span className="text-[13px] truncate pr-3" style={{ ...sans, color: color.textSecondary }} title={desc}>{desc}</span>

              {/* Source — who wrote this row, and whether the other writer agrees */}
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[12px] px-2 py-0.5 rounded-md truncate w-fit"
                  title={fromIndexer
                    ? tr("Decoded from the program's own logs by the indexer — not from anything this server remembered.")
                    : `${tr("Recorded by the ")}${row.actorType === "owner" ? tr("owner's action") : row.actorType}${tr(" as it happened.")}`}
                  style={{
                    ...mono,
                    background: fromIndexer ? `${C}12` : color.border,
                    color: fromIndexer ? C : color.textDim,
                    border: `1px solid ${fromIndexer ? `${C}25` : color.border}`,
                  }}>
                  {fromIndexer ? tr("chain log") : row.actorType}
                </span>
                {agreed && (
                  <span title={tr("The server's record of this transaction and the program's own logs agree. Two independent writers, one signature.")}>
                    <ShieldCheck size={11} style={{ color: M }} />
                  </span>
                )}
              </div>

              {/* Signature */}
              <div className="text-right">
                {hasSig ? (
                  <a href={explorerTransactionUrl(row.chainSignature!)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold transition-colors"
                    style={{ ...mono, color: C }}
                    onMouseEnter={e => (e.currentTarget.style.color = M)}
                    onMouseLeave={e => (e.currentTarget.style.color = C)}>
                    {short(row.chainSignature!, 3)}
                    <ExternalLink size={9} />
                  </a>
                ) : (
                  <span className="text-[12px]" style={{ ...mono, color: color.border }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="rounded-xl p-3 flex gap-2.5" style={{ background: `${C}0a`, border: `1px solid ${C}18` }}>
        <ScrollText size={12} style={{ color: C, marginTop: 1, flexShrink: 0 }} />
        <p className="text-[13px]" style={{ ...sans, color: color.textSecondary, lineHeight: 1.6 }}>
          {tr("This audit trail is append-only. Every event with a chain signature can be independently verified on")}{" "}
          <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noreferrer" style={{ color: C }}>Solana Explorer (Devnet)</a>.
          {" "}{tr("The indexer reads program logs directly — dashboard numbers come from the chain, not the server.")}
        </p>
      </div>
    </div>
  );
}
