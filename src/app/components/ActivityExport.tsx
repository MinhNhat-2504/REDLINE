import { useEffect, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { API_URL, isSignedIn, type Grant } from "../lib/api";
import { activityReport, reportCsv, type ReportMetadata } from "../lib/activity-report";
import type { ActivityItem } from "../lib/activity";
import { paymentAsset } from "../lib/capabilities";
import { PROGRAM_ID } from "../solana/redline";

export function ActivityExport({ owner, signed, items, grants, filters, verifiedAt, sourceEventCount, stale }: { owner: string; signed: boolean; items: ActivityItem[]; grants: Grant[]; filters: ReportMetadata["filters"]; verifiedAt: string | null; sourceEventCount: number; stale: boolean }) {
  const { lang } = useLang(); const vi = lang === "vi";
  const [review, setReview] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { setReview(false); setMessage(""); }, [owner, signed]);
  const blocked = !signed || stale || !verifiedAt || !items.length || items.some(i => i.row.redacted);
  const download = (format: "csv" | "json") => {
    if (blocked || !isSignedIn(owner)) { setReview(false); return; }
    try {
      const report = activityReport(items, grants, { owner, generatedAt: new Date().toISOString(), verifiedAt: verifiedAt!,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, network: paymentAsset.network, api: API_URL, program: PROGRAM_ID, mint: paymentAsset.mint,
        filters, sourceEventCount, sourceEventLimit: 1000 });
      const data = format === "json" ? JSON.stringify(report, null, 2) : reportCsv(report);
      const url = URL.createObjectURL(new Blob([data], { type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `redline-activity-${new Date().toISOString().replaceAll(":", "-")}.${format}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(vi ? `Đã tạo báo cáo ${report.rowCount} bản ghi.` : `Report created with ${report.rowCount} records.`); setReview(false);
    } catch { setMessage(vi ? "Không xuất được: cần dữ liệu đầy đủ thuộc ví này. Đăng nhập và làm mới lịch sử." : "Export unavailable: complete records for this wallet are required. Sign in and refresh history."); }
  };
  return <section className="p2-export"><button type="button" className="simple-secondary" disabled={blocked} aria-expanded={review} onClick={() => setReview(v => !v)}>{vi ? "Xuất báo cáo" : "Export report"}</button>
    {blocked && <small>{!signed ? (vi ? "Đăng nhập để xuất lịch sử của ví." : "Sign in to export your wallet history.") : stale ? (vi ? "Làm mới dữ liệu trước khi xuất." : "Refresh data before exporting.") : (vi ? "Cần bản ghi đầy đủ khớp bộ lọc." : "Complete records matching the filters are required.")}</small>}
    {review && !blocked && <div className="p2-export-review"><h3>{vi ? "Xem lại phạm vi báo cáo" : "Review report scope"}</h3><p>{items.length} {vi ? "bản ghi khớp bộ lọc, kể cả phần chưa bấm Xem thêm." : "matching records, including those beyond Show more."} {vi ? "Giới hạn ở tối đa 1.000 sự kiện gần nhất đã tải; không phải toàn bộ lịch sử." : "Limited to up to 1,000 recently loaded events; this is not the entire history."}</p><p>{vi ? "Ví" : "Wallet"}: <code>{owner}</code></p><p>{vi ? "Dữ liệu tải lúc" : "Data loaded at"}: {new Date(verifiedAt!).toLocaleString(vi ? "vi-VN" : "en-GB")}</p><p>{vi ? "Báo cáo gồm địa chỉ người nhận và chữ ký giao dịch. CSV dùng cho bảng tính; JSON giữ dữ liệu số tiền dưới dạng đơn vị gốc để xử lý chính xác." : "The report includes recipient addresses and transaction signatures. CSV is for spreadsheets; JSON preserves amounts as base-unit strings for exact processing."}</p><div className="p1-actions"><button type="button" className="simple-primary" onClick={() => download("csv")}>CSV</button><button type="button" className="simple-secondary" onClick={() => download("json")}>JSON</button><button type="button" className="simple-secondary" onClick={() => setReview(false)}>{vi ? "Hủy" : "Cancel"}</button></div></div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
