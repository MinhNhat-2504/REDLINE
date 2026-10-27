import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { deleteDraft, POLICY_TEMPLATES, readDraft, writeDraft, validDraft, type PolicyDraft } from "../lib/policy-draft";

export function PolicyDraftTools({ owner, value, apply, acknowledged = false }: { owner: string; value: PolicyDraft; apply: (value: PolicyDraft) => void; acknowledged?: boolean }) {
  const { lang } = useLang();
  const t = (vi: string, en: string) => lang === "vi" ? vi : en;
  const [saved, setSaved] = useState(() => readDraft(owner));
  const [paused, setPaused] = useState(Boolean(saved) && !acknowledged);
  const [message, setMessage] = useState("");
  const snapshot = JSON.stringify(value);
  const initial = useRef(acknowledged ? "" : snapshot);
  useEffect(() => {
    if (!owner || paused || snapshot === initial.current) return;
    if (!validDraft(JSON.parse(snapshot))) { setMessage(t("Hoàn tất các hạn mức hợp lệ để lưu nháp.", "Complete valid limits to save the draft.")); return; }
    try { writeDraft(owner, JSON.parse(snapshot)); setMessage(t("Đã lưu nháp trên thiết bị này.", "Draft saved on this device.")); }
    catch { setMessage(t("Không lưu được nháp. Kiểm tra quyền lưu trữ trình duyệt.", "Draft could not be saved. Check browser storage permissions.")); }
  }, [owner, snapshot, paused, lang]);
  return <section className="p1-draft-tools">
    {saved && paused && <div className="p1-draft-prompt"><strong>{t("Bạn có một bản nháp trên thiết bị này", "A draft is saved on this device")}</strong><p>{t("Chỉ khôi phục khi bạn chọn. Bạn vẫn cần xem lại, đánh giá và ký.", "Restore it explicitly, then review, assess and sign again.")}</p><div className="p1-actions"><button type="button" className="simple-primary" onClick={() => { apply(saved); setPaused(false); setSaved(null); }}>{t("Khôi phục nháp", "Restore draft")}</button><button type="button" className="simple-secondary" onClick={() => { try { deleteDraft(owner); setSaved(null); setPaused(false); } catch { setMessage(t("Không xóa được nháp.", "Could not delete draft.")); } }}>{t("Xóa nháp cũ", "Delete saved draft")}</button></div></div>}
    <details><summary>{t("Bắt đầu từ mẫu", "Start from a template")}</summary><p>{t("Mẫu chỉ điền hạn mức, không thêm người nhận hoặc cấp quyền.", "Templates fill limits only; they do not add recipients or grant access.")}</p><div className="p1-actions">{POLICY_TEMPLATES.map(template => <button type="button" key={template.id} className="simple-secondary" onClick={() => apply({ ...value, ...template })}>{template.id === "trial" ? t("Chạy thử · 50 dUSDC / 5 lệnh", "Trial · 50 dUSDC / 5 transfers") : t("Hàng ngày · 500 dUSDC / 50 lệnh", "Daily · 500 dUSDC / 50 transfers")}</button>)}</div><p>{t("Thời hạn 24 giờ. Có thể tự chỉnh ở các bước tiếp theo.", "24-hour duration. Customize in the following steps.")}</p></details>
    <p className="help">{t("Hoặc tự cấu hình bên dưới.", "Or configure the fields below yourself.")} {owner ? t("Nháp tự lưu theo ví và mạng trên trình duyệt này. Không đồng bộ thiết bị.", "Drafts auto-save per wallet and network in this browser. No device sync.") : t("Kết nối ví để lưu nháp riêng cho ví của bạn.", "Connect a wallet to save its draft.")}</p>
    <div className="p1-actions">{owner && !paused && <button type="button" className="simple-secondary" onClick={() => { try { deleteDraft(owner); initial.current = snapshot; setMessage(t("Đã xóa nháp. Chỉnh sửa tiếp sẽ lưu bản mới.", "Draft deleted. Further edits will save a new draft.")); } catch { setMessage(t("Không xóa được nháp.", "Could not delete draft.")); } }}>{t("Xóa nháp", "Delete draft")}</button>}<small role="status">{message}</small></div>
  </section>;
}
