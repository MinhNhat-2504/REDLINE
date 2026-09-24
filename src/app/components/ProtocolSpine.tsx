import { useCallback, useEffect, useState } from "react";
import { Activity, Check, ShieldCheck } from "lucide-react";
import { api, short, type ProtocolOverview } from "../lib/api";
import { color, mono, panel, sans } from "../theme";
import { useT } from "../i18n/LanguageContext";
import { GateChain } from "./depth";

// English is the source language here too, same as the rest of the app —
// every string below is written in English and wrapped as `tr("...")`.
const VI: Record<string, string> = {
  "Active grant": "Grant đang hoạt động",
  "Owner has not revoked access": "Chủ sở hữu chưa thu hồi quyền truy cập",
  "Time window": "Khung thời gian",
  "Grant has not expired": "Grant chưa hết hạn",
  "Fresh intent": "Yêu cầu mới",
  "Nonce cannot be replayed": "Nonce không thể bị dùng lại",
  "Allowed asset": "Tài sản được phép",
  "Mint is inside the signed scope": "Mint nằm trong phạm vi đã ký",
  "Allowed recipient": "Người nhận được phép",
  "Destination is allowlisted": "Địa chỉ đích nằm trong allowlist",
  "Budget envelope": "Ngân sách cho phép",
  "Spend and transaction caps hold": "Hạn mức chi tiêu và số giao dịch vẫn còn hiệu lực",
  "Execution pace": "Nhịp độ thực thi",
  "Cooldown has elapsed": "Đã hết thời gian nghỉ",

  "Live policy backbone": "Xương sống policy trực tiếp",
  "Every transaction crosses seven hard limits.": "Mọi giao dịch đều đi qua bảy ranh giới cứng.",
  "The agent proposes. The program evaluates the signed envelope in order. One failed gate stops the transfer atomically.":
    "Agent đề xuất. Chương trình đánh giá ranh giới đã ký theo thứ tự. Một gate thất bại sẽ dừng lệnh chuyển ngay lập tức.",
  "Preview mode": "Chế độ xem trước",
  "connecting": "đang kết nối",
  "syncing": "đang đồng bộ",

  "Seven-gate transaction pipeline": "Quy trình giao dịch bảy cổng kiểm tra",
  "Policy gates": "Các gate policy",
  "PROPOSAL": "ĐỀ XUẤT",
  "GATE PASSED": "QUA CỔNG",
  "GATE REFUSED · NOTHING MOVES": "BỊ CHẶN · KHÔNG GÌ DI CHUYỂN",
  "LOOP · 24 S · TWO PROPOSALS": "VÒNG LẶP · 24 S · HAI ĐỀ XUẤT",

  "Scope": "Phạm vi",
  "Connected wallet": "Ví đã kết nối",
  "Protocol": "Giao thức",
  "Active grants": "Grant Đang Hoạt Động",
  "Allowed": "Được phép",
  "Blocked": "Bị chặn",
};

const FALLBACK_GATES: ProtocolOverview["gates"] = [
  [1, "Active grant", "Owner has not revoked access"],
  [2, "Time window", "Grant has not expired"],
  [3, "Fresh intent", "Nonce cannot be replayed"],
  [4, "Allowed asset", "Mint is inside the signed scope"],
  [5, "Allowed recipient", "Destination is allowlisted"],
  [6, "Budget envelope", "Spend and transaction caps hold"],
  [7, "Execution pace", "Cooldown has elapsed"],
].map(([id, label, detail]) => ({ id: Number(id), key: String(id), label: String(label), detail: String(detail), reasonCodes: [], rejected: 0 }));

export function ProtocolSpine({ owner }: { owner?: string }) {
  const tr = useT(VI);
  const [data, setData] = useState<ProtocolOverview | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.protocolOverview(owner));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [owner]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const gates = data?.gates ?? FALLBACK_GATES;
  // Until the API answers these are unknown, not zero. A zero here would claim
  // the protocol has allowed and blocked nothing — on the page whose whole job
  // is to show that it has, and on a host that sleeps, so an unanswered first
  // load is routine rather than rare. Everything else in this product drops a
  // number it cannot source; so does this.
  const allowed = data ? String(data.activity.allowed) : "—";
  const rejected = data ? String(data.activity.rejected) : "—";

  return (
    <section className="relative overflow-hidden rounded-[28px] p-5 lg:p-7 redline-spine" style={panel()} aria-label={tr("Seven-gate transaction pipeline")}>
      <div className="absolute inset-0 redline-spine-grid" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.22em]" style={{ ...mono, color: color.primary }}>
              <Activity size={12} /> {tr("Live policy backbone")}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight" style={{ ...sans, color: color.text }}>{tr("Every transaction crosses seven hard limits.")}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5" style={{ ...sans, color: color.textMuted }}>
              {tr("The agent proposes. The program evaluates the signed envelope in order. One failed gate stops the transfer atomically.")}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full px-3 py-1.5" style={{ background: color.surfaceSubtle, border: `1px solid ${color.border}` }}>
            <span className={`h-1.5 w-1.5 rounded-full ${offline ? "" : "redline-live-dot"}`} style={{ background: offline ? color.warn : color.primary }} />
            <span className="text-[12px] uppercase tracking-[0.16em]" style={{ ...mono, color: offline ? color.warn : color.textSecondary }}>
              {offline ? tr("Preview mode") : `${data?.network.cluster ?? tr("connecting")} · ${data ? short(data.network.programId, 5) : tr("syncing")}`}
            </span>
          </div>
        </div>

        <GateChain gates={gates} tr={tr} />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { label: tr("Scope"), value: data?.scope === "wallet" ? tr("Connected wallet") : tr("Protocol"), icon: ShieldCheck },
            { label: tr("Active grants"), value: String(data?.activity.activeGrants ?? "—"), icon: Activity },
            { label: tr("Allowed"), value: allowed, icon: Check },
            { label: tr("Blocked"), value: rejected, icon: ShieldCheck },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: color.surfaceSubtle, border: `1px solid ${color.border}` }}>
                <Icon size={13} style={{ color: color.primary }} />
                <div>
                  <div className="text-[12px] uppercase tracking-[0.12em]" style={{ ...sans, color: color.textDim }}>{item.label}</div>
                  <div className="mt-0.5 text-[13px] font-semibold" style={{ ...mono, color: color.text }}>{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
