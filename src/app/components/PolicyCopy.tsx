import { useCallback, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { api, isSignedIn, short } from "../lib/api";
import { copyPolicy } from "../lib/policy-copy";
import { readRecipients, type PolicyDraft } from "../lib/policy-draft";
import { useSignedIn } from "../lib/useSignedIn";
import { useWalletResource } from "../lib/useWalletResource";

export function PolicyCopy({ source, owner, apply }: { source: string; owner: string; apply: (draft: PolicyDraft) => void }) {
  const { lang } = useLang(); const vi = lang === "vi";
  const signed = useSignedIn(owner);
  const [revision, setRevision] = useState(0); const [applied, setApplied] = useState(false);
  const loader = useCallback(() => api.grant(encodeURIComponent(source)), [source]);
  const resource = useWalletResource(owner, signed, loader, revision);
  const copied = resource.data ? copyPolicy(resource.data, owner, readRecipients(owner)) : null;
  const errors = {
    owner: vi ? "Chỉ sao chép chính sách thuộc ví đang đăng nhập." : "Only policies owned by the signed-in wallet can be copied.",
    asset: vi ? "Tài sản của chính sách cũ không được bản này hỗ trợ. Hãy tự cấu hình chính sách mới." : "This policy's asset is unsupported by this build. Configure a new policy manually.",
    scope: vi ? "Không đọc được danh sách người nhận đầy đủ, hợp lệ. Hãy tự nhập lại." : "The complete valid recipient list is unavailable. Enter recipients manually.",
    limits: vi ? "Hạn mức cũ nằm ngoài phạm vi biểu mẫu này. Hãy tự cấu hình; ứng dụng không tự nới hoặc làm tròn ngân sách." : "The old limits cannot be represented in this form. Configure manually; the app will not round or expand the budget.",
  };
  return <section className="p2-copy"><h3>{vi ? "Tạo mới từ chính sách cũ" : "Create from an existing policy"}</h3><p>{vi ? "Đây là quyền mới, cần đánh giá và ký mới. Chính sách cũ vẫn có hiệu lực cho đến khi hết hạn hoặc được thu hồi." : "This creates separate authority and requires a new assessment and signature. The old policy remains effective until it expires or is revoked."}</p>
    {!signed && <p role="status">{vi ? "Kết nối và đăng nhập đúng ví chủ sở hữu để tải cấu hình cũ." : "Connect and sign in with the owner wallet to load the old configuration."}</p>}
    {resource.loading && !resource.data && signed && <p role="status">{vi ? "Đang tải chính sách gốc…" : "Loading source policy…"}</p>}
    {resource.error && <p role="alert">{vi ? "Chưa xác minh được chính sách gốc." : "Source policy could not be verified."} <button type="button" className="simple-secondary" onClick={() => setRevision(n => n + 1)}>{vi ? "Thử lại" : "Retry"}</button></p>}
    {copied && "problem" in copied && <p role="alert">{errors[copied.problem]}</p>}
    {copied && "draft" in copied && <><p><strong>{resource.data?.agentVersion.name}</strong> · {short(source)} · {copied.draft.cap} dUSDC · {copied.draft.txn} {vi ? "lệnh" : "transfers"}</p><p>{vi ? `Thời hạn đề xuất ${copied.draft.dur} giờ từ lần ký mới (làm tròn lên theo giờ). Bạn có thể chỉnh lại; thời gian thuê sẽ được kiểm tra lại.` : `Proposed duration: ${copied.draft.dur} hours from the new signature (rounded up to whole hours). Adjust it as needed; rental eligibility will be checked again.`}</p><p>{vi ? "Điền cấu hình sẽ thay nội dung biểu mẫu và bản nháp hiện tại của ví này. Không sao chép chữ ký hoặc bộ đếm đã dùng." : "Filling the form replaces this wallet's current form and draft. Signatures and used counters are not copied."}</p><button type="button" className="simple-primary" disabled={applied || resource.error || resource.loading} onClick={() => { if (!isSignedIn(owner) || resource.error) return; apply(copied.draft); setApplied(true); }}>{vi ? "Điền vào biểu mẫu mới" : "Fill new policy form"}</button></>}
    {applied && <p role="status">{vi ? "Đã điền. Kiểm tra người nhận, hạn mức và thời hạn trước khi đánh giá lại." : "Form filled. Check recipients, limits and duration, then assess again."}</p>}
  </section>;
}
