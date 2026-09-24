import { coalesce } from "../lib/coalesce";
import { useCallback, useEffect, useState } from "react";
import { Key, ExternalLink, Activity, ShieldCheck, ShieldOff } from "lucide-react";
import { api, subscribeFeed, fmtUsdc, short, type Grant } from "../lib/api";
import { explorerTransactionUrl } from "../solana/client";
import { color, mono, sans } from "../theme";
import { useT } from "../i18n/LanguageContext";

const M = color.primary, C = color.info, A = color.warn, R = color.danger;

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`; this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  "Live Grants": "Grant Đang Hoạt Động Trực Tiếp",
  "Connect the backend to see on-chain grants here.": "Kết nối backend để xem các grant on-chain tại đây.",
  "active": "hoạt động",
  "revoked": "đã revoke",
  "Total spend across all grants": "Tổng chi tiêu trên tất cả grant",
  "View on Explorer": "Xem trên Explorer",
  "Go to Guardrails →": "Vào Guardrails →",
};

// Live summary of all grants from the REDLINE API — shows real on-chain
// data so the Dashboard isn't purely mock. Refreshes via SSE.
export function DashboardLiveGrants({ onNavigate }: { onNavigate?: () => void }) {
  const tr = useT(VI);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await api.grants();
      setGrants(list);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "API offline");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  // Same burst the grants panel sees: collapse it into one reload.
  useEffect(() => {
    const reload = coalesce(load);
    const off = subscribeFeed("*", () => reload.request());
    return () => { off(); reload.cancel(); };
  }, [load]);

  const active = grants.filter(g => !g.revoked);
  const revoked = grants.filter(g => g.revoked);
  const totalSpent = grants.reduce((s, g) => s + Number(g.spentUnits), 0);
  const totalCap = grants.reduce((s, g) => s + Number(g.policyVersion.spendCapUnits), 0);
  const pct = totalCap > 0 ? Math.min(100, (totalSpent / totalCap) * 100) : 0;

  if (error && grants.length === 0) {
    return (
      <div className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: color.surface, border: `1px solid ${color.border}` }}>
        <div className="p-2 rounded-xl" style={{ background: `${A}14`, border: `1px solid ${A}25` }}>
          <Activity size={13} style={{ color: A }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold" style={{ ...sans, color: color.text }}>{tr("Live Grants")}</div>
          <div className="text-[13px] mt-0.5" style={{ ...sans, color: color.textDim }}>{tr("Connect the backend to see on-chain grants here.")}</div>
        </div>
      </div>
    );
  }

  if (grants.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden relative px-block"
      style={{ background: color.surface, border: `1px solid ${M}18`, boxShadow: "0 18px 48px rgba(4, 2, 12, 0.55)" }}>
      <div className="absolute top-0 left-8 right-8 h-px" style={{ background: `linear-gradient(90deg, transparent, ${M}50, transparent)` }} />

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: color.border }}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${M}14`, border: `1px solid ${M}20` }}>
            <Key size={12} style={{ color: M }} />
          </div>
          <span className="text-sm font-semibold" style={{ ...sans, color: color.text }}>{tr("Live Grants")}</span>
          <span className="text-[12px] font-bold tracking-widest" style={{ ...mono, color: M }}>ON-CHAIN</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ ...mono, background: `${M}14`, color: M, border: `1px solid ${M}25` }}>
            {active.length} {tr("active")}
          </span>
          {revoked.length > 0 && (
            <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ ...mono, background: `${R}14`, color: R, border: `1px solid ${R}25` }}>
              {revoked.length} {tr("revoked")}
            </span>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px]" style={{ ...sans, color: color.textSecondary }}>{tr("Total spend across all grants")}</span>
          <span className="text-[13px] font-semibold" style={{ ...mono, color: A }}>{fmtUsdc(totalSpent)} / {fmtUsdc(totalCap)} USDC</span>
        </div>
        <div className="relative rounded-full overflow-hidden" style={{ background: color.surfaceInset, height: 6 }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct > 85 ? `linear-gradient(90deg, ${R}80, ${R})` : pct > 60 ? `linear-gradient(90deg, ${A}80, ${A})` : `linear-gradient(90deg, ${M}, #22d3ee)`,
              boxShadow: pct > 85 ? `0 0 12px ${R}90` : pct > 60 ? `0 0 12px ${A}90` : `0 0 12px ${M}80`,
            }}
          />
        </div>
      </div>

      {/* Grant rows */}
      {grants.slice(0, 3).map(g => {
        const accent = g.revoked ? R : M;
        const cap = Number(g.policyVersion.spendCapUnits);
        const spent = Number(g.spentUnits);
        const rowPct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
        return (
          <div key={g.id} className="px-5 py-3 border-t flex items-center gap-3 hover:bg-white/[0.018] transition-colors ledger-row" style={{ borderColor: color.border }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}>
              {g.revoked ? <ShieldOff size={11} style={{ color: accent }} /> : <ShieldCheck size={11} style={{ color: accent }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ ...sans, color: color.text }}>{g.agentVersion.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px]" style={{ ...mono, color: color.textDim }}>{fmtUsdc(spent)}/{fmtUsdc(cap)} USDC</span>
                <span className="text-[12px]" style={{ ...mono, color: color.textDim }}>tx {g.transactionCount}/{g.policyVersion.maxTransactions}</span>
              </div>
            </div>
            <div className="w-16">
              <div className="relative rounded-full overflow-hidden" style={{ background: color.surfaceInset, height: 2 }}>
                <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${rowPct}%`, background: accent }} />
              </div>
            </div>
            {g.createSignature && !g.createSignature.startsWith("MOCK") && (
              <a href={explorerTransactionUrl(g.createSignature)} target="_blank" rel="noreferrer" title={tr("View on Explorer")}>
                <ExternalLink size={10} style={{ color: C }} />
              </a>
            )}
          </div>
        );
      })}

      {/* Footer */}
      {onNavigate && (
        <button type="button" onClick={onNavigate}
          className="w-full px-5 py-3 text-center text-[13px] font-semibold border-t transition-all hover:bg-white/[0.03]"
          style={{ ...sans, color: C, borderColor: color.border }}>
          {tr("Go to Guardrails →")}
        </button>
      )}
    </div>
  );
}
