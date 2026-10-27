import { ActivitySummary } from "./ActivitySummary";
import { ActivityExport } from "./ActivityExport";
import { ErrorHelp } from "./ErrorHelp";
import { useState } from "react";
import { useClient } from "@solana/react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useLang, useT } from "../i18n/LanguageContext";
import { api, fmtUsdc, short } from "../lib/api";
import { activityItems, type ActivityItem } from "../lib/activity";
import { paymentAsset } from "../lib/capabilities";
import { useSignedIn } from "../lib/useSignedIn";
import { useWalletResource } from "../lib/useWalletResource";
import { explorerTransactionUrl, type AppClient } from "../solana/client";

const loadPrivate = async (owner: string) => {
  const [rows, grants] = await Promise.all([api.recentAudit(true), api.grants()]);
  return { rows, grants: grants.filter(g => g.owner.wallet === owner), verifiedAt: new Date().toISOString() };
};
const loadPublic = async () => ({ rows: await api.recentAudit(false), grants: [], verifiedAt: new Date().toISOString() });
const COMPACT_VI: Record<string, string> = {
  "Recent history": "Lịch sử gần đây",
  "Refresh": "Làm mới",
  "Filters & export": "Bộ lọc & xuất báo cáo",
  "Details": "Chi tiết",
};
export function ActivityPage() {
  const { lang } = useLang(); const vi = lang === "vi";
  const ct = useT(COMPACT_VI);
  const client = useClient<AppClient>(); const connected = useConnectedWallet(client);
  const owner = connected ? String(connected.account.address) : "";
  const signed = useSignedIn(owner);
  const [revision, setRevision] = useState(0);
  const resource = useWalletResource(signed ? owner : "public", true, signed ? loadPrivate : loadPublic, revision);
  const params = new URLSearchParams(location.hash.split("?")[1]);
  const [grant, setGrant] = useState(params.get("grant") ?? "");
  const [run, setRun] = useState(params.get("run") ?? "");
  const [agent, setAgent] = useState(params.get("agent") ?? ""); const [outcome, setOutcome] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(5);
  const grants = resource.data?.grants ?? [];
  const items = activityItems(resource.data?.rows ?? []).filter(item => {
    const g = grants.find(g => g.id === item.grantId);
    const date = new Date(item.row.createdAt);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return (!grant || item.grantId === grant) && (!run || item.runId === run) && (!agent || g?.agentVersion.id === agent) &&
      (outcome === "all" || outcome === item.outcome) && (!from || day >= from) && (!to || day <= to) &&
      `${item.row.eventType} ${item.row.chainSignature ?? ""} ${item.destination ?? ""} ${item.reason ?? ""}`.toLowerCase().includes(search.toLowerCase());
  });
  const groups = new Map<string, ActivityItem[]>();
  items.slice(0, limit).forEach(item => { const key = item.runId ?? "unlinked"; groups.set(key, [...(groups.get(key) ?? []), item]); });
  const label = (item: ActivityItem) => {
    if (item.outcome === "confirmed") return vi ? "Đã chuyển" : "Payment confirmed";
    if (item.outcome === "blocked") return item.reason === "SPEND_CAP_EXCEEDED" ? (vi ? "Bị chặn: vượt ngân sách" : "Blocked: over budget") : (vi ? "Yêu cầu bị chặn" : "Request blocked");
    if (item.outcome === "rejected") return vi ? "Giao dịch lỗi" : "Transaction failed";
    if (item.outcome === "pending") return vi ? "Chưa có xác nhận" : "Unconfirmed";
    return ({ "run.started": vi ? "Bắt đầu lượt chạy" : "Run started", "run.ended": item.row.payload.status === "failed" ? (vi ? "Lượt chạy bị lỗi" : "Run failed") : item.row.payload.reason === "script complete" ? (vi ? "Đã chạy xong kịch bản" : "Script finished") : (vi ? "Đã dừng lượt chạy" : "Run stopped"), "run.retry": vi ? "Lượt chạy đang thử lại" : "Run retrying", "grant.created": vi ? "Đã tạo chính sách" : "Policy created", "grant.revoked": vi ? "Đã thu hồi quyền" : "Permission revoked", "vault.funded": vi ? "Đã nạp quỹ" : "Vault funded", "auth.signed_in": vi ? "Đã đăng nhập" : "Signed in" } as Record<string, string>)[item.row.eventType] ?? item.row.eventType;
  };
  return <div className="p1-activity">
    <header className="compact-activity-header"><details className="compact-history-scope"><summary>{ct("Recent history")}</summary><p>{signed ? (vi ? "Tối đa 1.000 sự kiện gần nhất của ví này. Lọc theo ngày trên thiết bị." : "Up to 1,000 recent events for this wallet. Dates use your device timezone.") : (vi ? "Bản công khai đã ẩn danh. Đăng nhập để xem lịch sử của ví." : "Redacted public view. Sign in for your wallet history.")}</p></details><button className="simple-secondary" onClick={() => setRevision(n => n + 1)}>{ct("Refresh")}</button></header>
    {resource.data && <ActivitySummary items={items} />}
    <details className="compact-activity-tools"><summary>{ct("Filters & export")} <span>{[grant, run, agent, from, to, search, outcome !== "all" ? outcome : ""].filter(Boolean).length || ""}</span></summary>
    <ActivityExport owner={owner} signed={signed} items={items} grants={grants} filters={{ grant, run, agent, outcome, from, to, search }} verifiedAt={resource.data?.verifiedAt ?? null} sourceEventCount={resource.data?.rows.length ?? 0} stale={resource.error || !resource.data} />
    <div className="p1-filters"><label>{vi ? "Tìm kiếm" : "Search"}<input value={search} onChange={e => setSearch(e.target.value)} placeholder={vi ? "Chữ ký, địa chỉ, mã lý do" : "Signature, address, reason code"} /></label><label>Agent<select value={agent} onChange={e => setAgent(e.target.value)}><option value="">{vi ? "Tất cả agent" : "All agents"}</option>{[...new Map(grants.map(g => [g.agentVersion.id, g.agentVersion])).values()].map(a => <option key={a.id} value={a.id}>{a.name} {a.version}</option>)}</select></label><label>{vi ? "Kết quả" : "Outcome"}<select value={outcome} onChange={e => setOutcome(e.target.value)}>{[["all", vi ? "Tất cả" : "All"], ["confirmed", vi ? "Đã chuyển" : "Confirmed"], ["blocked", vi ? "Bị chặn trước giao dịch" : "Precheck blocked"], ["rejected", vi ? "Giao dịch lỗi" : "Transaction failed"], ["pending", vi ? "Chưa xác nhận" : "Unconfirmed"], ["info", vi ? "Thao tác khác" : "Other actions"]].map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label><label>{vi ? "Từ ngày" : "From"}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>{vi ? "Đến ngày" : "To"}<input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label></div>
    </details>
    {(grant || run || agent || from || to || search || outcome !== "all") && <button className="simple-secondary" onClick={() => { setGrant(""); setRun(""); setAgent(""); setFrom(""); setTo(""); setSearch(""); setOutcome("all"); }}>{vi ? "Xóa bộ lọc" : "Clear filters"}</button>}
    {resource.error && <p role="alert">{vi ? "Không làm mới được. Các bản ghi đang hiển thị có thể đã cũ." : "Refresh failed. Displayed records may be stale."}</p>}
    {resource.loading && !resource.data && <p role="status">{vi ? "Đang tải lịch sử…" : "Loading history…"}</p>}
    {!items.length && resource.data && <p>{vi ? "Không có hoạt động khớp bộ lọc trong dữ liệu đã tải." : "No matching activity in loaded records."}</p>}
    {[...groups].map(([id, entries]) => <section className="p1-run-group" key={id}><h3>{id === "unlinked" ? (vi ? "Hoạt động khác" : "Other activity") : grants.find(g => g.id === entries[0].grantId)?.agentVersion.name ?? `${vi ? "Lượt chạy" : "Run"} ${short(id, 6)}`}</h3>{entries.map(item => {
      const g = grants.find(g => g.id === item.grantId);
      return <article className={`p1-activity-row is-${item.outcome}`} key={item.row.id}><div><strong>{label(item)}</strong><p>{g && id === "unlinked" ? `${g.agentVersion.name} - ` : ""}<time dateTime={item.row.createdAt}>{new Date(item.row.createdAt).toLocaleString(vi ? "vi-VN" : "en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></p>{item.amountUnits && /^\d+$/.test(item.amountUnits) && <p>{item.mint && item.mint === paymentAsset.mint ? `${fmtUsdc(item.amountUnits)} dUSDC` : `${item.amountUnits} ${vi ? "đơn vị gốc" : "base units"}`}{item.outcome !== "confirmed" && ` · ${vi ? "số tiền yêu cầu" : "requested"}`}</p>}</div><details className="compact-row-details"><summary>{ct("Details")}</summary>{item.destination && <code>{item.destination}</code>}{["blocked", "rejected", "pending"].includes(item.outcome) && <ErrorHelp context={{ area: "activity", code: item.reason ?? undefined, outcome: item.outcome as "blocked" | "rejected" | "pending", signature: item.row.chainSignature, grantId: g?.id }} />}<details><summary>{vi ? "Bằng chứng kỹ thuật" : "Technical evidence"}</summary><p>{item.row.eventType}</p>{item.reason && item.reason !== "OK" && <p>{item.reason}</p>}<code>{item.row.chainSignature}</code>{item.row.chainSignature && <a href={explorerTransactionUrl(item.row.chainSignature)} target="_blank" rel="noreferrer">{vi ? "Xem giao dịch trên Explorer" : "View transaction on Explorer"}</a>}<pre>{JSON.stringify(item.row.payload, null, 2)}</pre></details></details></article>;
    })}</section>)}
    {items.length > limit && <button className="simple-secondary" onClick={() => setLimit(n => n + 50)}>{vi ? "Xem thêm" : "Show more"}</button>}
  </div>;
}
