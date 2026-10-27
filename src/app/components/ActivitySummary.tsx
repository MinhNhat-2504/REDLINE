import { useLang } from "../i18n/LanguageContext";
import { activitySummary } from "../lib/task-summary";
import type { ActivityItem } from "../lib/activity";
import { fmtUsdc } from "../lib/api";
import { paymentAsset } from "../lib/capabilities";
export function ActivitySummary({ items }: { items: ActivityItem[] }) {
  const { lang } = useLang(); const vi = lang === "vi"; const summary = activitySummary(items);
  const paid = summary.amounts.find(a => a.mint === paymentAsset.mint);
  return <section className="ux-activity-summary" aria-label={vi ? "Tóm tắt kết quả" : "Results summary"}><h2>{vi ? "Kết quả đang xem" : "Current results"}</h2><div className="ux-result-counts">{[
    [vi ? "Đã chuyển" : "Confirmed", summary.confirmed], [vi ? "Bị chặn" : "Blocked", summary.blocked], [vi ? "Lỗi" : "Failed", summary.rejected], [vi ? "Chưa rõ" : "Unconfirmed", summary.pending],
  ].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>{paid && <p>{vi ? "Tiền chuyển đã xác nhận:" : "Confirmed transferred:"} <b>{fmtUsdc(paid.units)} dUSDC</b></p>}{summary.amountsIncomplete > 0 && <p>{vi ? "Tổng tiền chưa đầy đủ: một số bản ghi thiếu dữ liệu." : "Partial total: some records lack amount data."}</p>}<small>{vi ? "Theo bộ lọc · Lịch sử đã tải" : "Filtered · Loaded history"}</small></section>;
}
