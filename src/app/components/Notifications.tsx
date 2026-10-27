import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useClient } from "@solana/react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { api } from "../lib/api";
import { appNotifications, readNotifications, saveReadNotifications } from "../lib/notifications";
import { readPendingGrant, PENDING_GRANT_EVENT } from "../lib/pending-grant";
import { useSignedIn } from "../lib/useSignedIn";
import { useWalletResource } from "../lib/useWalletResource";
import { useLang } from "../i18n/LanguageContext";
import type { AppClient } from "../solana/client";
const load = async () => { const [grants, runs] = await Promise.all([api.grants(), api.runs()]); return { grants, runs: runs.runs, at: Date.now() }; };
export function Notifications() {
  const client = useClient<AppClient>(); const wallet = useConnectedWallet(client);
  const owner = wallet ? String(wallet.account.address) : "";
  return <ScopedNotifications key={owner} owner={owner} />;
}
function ScopedNotifications({ owner }: { owner: string }) {
  const { lang } = useLang(); const vi = lang === "vi"; const signed = useSignedIn(owner);
  const [revision, setRevision] = useState(0); const [now, setNow] = useState(Date.now);
  const resource = useWalletResource(owner, signed, load, revision);
  const [read, setRead] = useState(() => readNotifications(owner));
  const [pending, setPending] = useState(() => readPendingGrant(owner));
  const [error, setError] = useState("");
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const changed = () => { setRead(readNotifications(owner)); setPending(readPendingGrant(owner)); };
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node) && root.current) root.current.open = false; };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && root.current?.open) { root.current.open = false; root.current.querySelector("summary")?.focus(); } };
    window.addEventListener(PENDING_GRANT_EVENT, changed); window.addEventListener("storage", changed);
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", key);
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => { window.removeEventListener(PENDING_GRANT_EVENT, changed); window.removeEventListener("storage", changed); document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); clearInterval(timer); };
  }, [owner]);
  const items = signed ? appNotifications(owner, resource.data?.grants ?? [], resource.data?.runs ?? [], pending, now) : [];
  const unread = items.filter(i => !read.includes(i.id)).length;
  const mark = (ids: string[]) => { try { const next = [...new Set([...read, ...ids])]; saveReadNotifications(owner, next); setRead(next); setError(""); } catch { setError(vi ? "Không lưu được trạng thái đã đọc trên thiết bị." : "Could not save read status on this device."); } };
  const labels = { expiry: vi ? "Chính sách hết hạn trong 6 giờ tới" : "Policy expires within 6 hours", budget: vi ? "Đã dùng ít nhất 80% ngân sách" : "At least 80% of budget used", failed: vi ? "Lượt chạy gần nhất bị lỗi" : "Latest run failed", expired: vi ? "Chính sách hoặc thời gian thuê đã hết hạn" : "Policy or rental has expired", exhausted: vi ? "Đã hết ngân sách hoặc số lệnh được cấp" : "Budget or transfer count reached", pending: vi ? "Thiết lập chưa hoàn tất: kiểm tra thao tác đã lưu" : "Unfinished setup: check the saved operation" };
  return <details className="p2-notifications" ref={root}><summary aria-label={`${vi ? "Thông báo" : "Notifications"}${unread ? ` (${unread})` : ""}`}><Bell size={16} />{unread > 0 && <span className="p2-unread-count">{unread > 99 ? "99+" : unread}</span>}</summary><section className="p2-notification-panel" aria-label={vi ? "Thông báo trong ứng dụng" : "In-app notifications"}><h2>{vi ? "Thông báo" : "Notifications"}</h2>
    {!signed ? <p>{vi ? "Kết nối và đăng nhập để xem thông báo của ví." : "Connect and sign in to see this wallet's notifications."}</p> : <><p>{vi ? "Thông báo và trạng thái đã đọc chỉ trong ứng dụng/trình duyệt này." : "Notifications and read status stay in this app/browser."}</p>{resource.data && <small>{vi ? "Dữ liệu tải lúc" : "Data loaded at"} {new Date(resource.data.at).toLocaleTimeString(vi ? "vi-VN" : "en-GB")}</small>}
    {resource.error && <p role="alert">{vi ? "Chưa làm mới được. Thông báo có thể đã cũ." : "Refresh failed. Notifications may be stale."}</p>}
    <div className="p1-actions"><button type="button" className="simple-secondary" onClick={() => setRevision(n => n + 1)}>{vi ? "Làm mới" : "Refresh"}</button><button type="button" className="simple-secondary" disabled={!unread} onClick={() => mark(items.map(i => i.id))}>{vi ? "Đánh dấu tất cả đã đọc" : "Mark all read"}</button></div>
    {!resource.data && resource.loading && <p role="status">{vi ? "Đang tải…" : "Loading…"}</p>}
    {!items.length && resource.data && <p>{vi ? "Không có thông báo trong dữ liệu đã tải." : "No notifications in loaded data."}</p>}
    <ul>{items.map(item => <li key={item.id} className={read.includes(item.id) ? "is-read" : "is-unread"}><a href={item.href} onClick={() => { if (root.current) root.current.open = false; mark([item.id]); }}><strong>{item.agent}</strong><span>{labels[item.kind]}</span></a>{!read.includes(item.id) && <button type="button" className="simple-secondary" onClick={() => mark([item.id])}>{vi ? "Đã đọc" : "Mark read"}</button>}</li>)}</ul></>}
    {error && <p role="status">{error}</p>}
  </section></details>;
}
