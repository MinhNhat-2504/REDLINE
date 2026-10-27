import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { readRecipients, writeRecipients } from "../lib/policy-draft";
import { isAddressLike } from "../solana/client";
export function RecipientBook({ owner, dests, names, select }: { owner: string; dests: string[]; names: string[]; select: (address: string, name: string) => void }) {
  const { lang } = useLang(); const vi = lang === "vi";
  const [contacts, setContacts] = useState(() => readRecipients(owner)); const [notice, setNotice] = useState("");
  if (!owner) return null;
  return <details className="p1-recipient-book"><summary>{vi ? "Người nhận đã lưu trên thiết bị" : "Recipients saved on this device"}</summary><p>{vi ? "Tên do bạn đặt, không xác minh danh tính. Kiểm tra địa chỉ đầy đủ trước khi ký." : "Names are your labels, not verified identities. Check the full address before signing."}</p><button type="button" className="simple-secondary" disabled={!dests.some((d, i) => isAddressLike(d.trim()) && names[i]?.trim())} onClick={() => {
    const merged = new Map(contacts.map(r => [r.address, r]));
    dests.forEach((d, i) => { if (isAddressLike(d.trim()) && names[i]?.trim()) merged.set(d.trim(), { address: d.trim(), name: names[i].trim() }); });
    try { const next = [...merged.values()].slice(-50); writeRecipients(owner, next); setContacts(next); setNotice(vi ? "Đã lưu trên trình duyệt này." : "Saved in this browser."); }
    catch { setNotice(vi ? "Không lưu được người nhận." : "Could not save recipients."); }
  }}>{vi ? "Lưu người nhận có tên và địa chỉ hợp lệ" : "Save named recipients with valid addresses"}</button>
  {contacts.map(r => <div className="p1-contact" key={r.address}><div><strong>{r.name}</strong><code>{r.address}</code></div><button type="button" className="simple-secondary" disabled={dests.includes(r.address) || dests.filter(Boolean).length >= 4} onClick={() => select(r.address, r.name)}>{vi ? "Chọn" : "Choose"}</button><button type="button" className="simple-secondary" aria-label={`${vi ? "Xóa" : "Delete"} ${r.name}`} onClick={() => { try { const next = contacts.filter(c => c.address !== r.address); writeRecipients(owner, next); setContacts(next); } catch { setNotice(vi ? "Không xóa được." : "Could not delete."); } }}>{vi ? "Xóa" : "Delete"}</button></div>)}<p role="status">{notice}</p></details>;
}
