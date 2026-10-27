import { ErrorHelp } from "./ErrorHelp";
﻿import { useEffect, useRef, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { AgentPolicyInput, RiskAssessment } from "../lib/risk-engine";
import { api, isSignedIn, type Health } from "../lib/api";
import { paymentAsset, paymentScope, MAX_RECIPIENTS } from "../lib/capabilities";
import { withGrantLock, type PendingGrant } from "../lib/grant-operation";
import { grantScope, readPendingGrant, savePendingGrant } from "../lib/pending-grant";
import { signIn } from "../lib/signin";
import { actionReceipt } from "../lib/action-receipt";
import { useClient } from "@solana/react";
import { useSignMessage } from "@solana/kit-plugin-wallet/react";
import { findGrantPda, findVaultPda, randomAgentId, toHex, PROGRAM_ID } from "../solana/redline";
import { isAddressLike, type AppClient } from "../solana/client";
import { friendlyError } from "../lib/friendly-error";
import { GRANT_PHASES, GRANT_VI, useGrantOperation } from "./GrantRecovery";
import { useT } from "../i18n/LanguageContext";

const VI: Record<string, string> = {
  "Network fees use Devnet SOL.": "Phí mạng dùng SOL Devnet.",
  "Sign the policy. A new vault needs an extra transaction; sign-in may ask for a message signature. An empty vault receives test funds.": "Ký quyền; quỹ mới cần thêm một giao dịch khởi tạo. Đăng nhập có thể cần ký tin nhắn. Quỹ trống được nạp token thử.",
  "Signing does not start the agent.": "Ký xong chưa chạy agent.",
  ...GRANT_VI,
  "Review the permission you will sign": "Xem lại quyền bạn sẽ ký",
  "Total budget for the entire policy": "Tổng ngân sách cho toàn bộ chính sách",
  "A single payment can use the remaining budget. This is not a per-payment limit.": "Một thanh toán có thể dùng hết ngân sách còn lại. Đây không phải hạn mức riêng cho mỗi lệnh.",
  "Recipient addresses": "Địa chỉ người nhận",
  "Transfers": "Số lệnh chuyển",
  "Duration": "Thời hạn",
  "hours": "giờ",
  "Cooldown": "Khoảng cách giữa các lệnh",
  "minutes": "phút",
  "Wallet requests": "Yêu cầu xác nhận trong ví",
  "You will sign the policy transaction. A new vault needs one extra transaction; sign-in may also ask you to sign a message. Test funds are added only when needed.": "Bạn sẽ ký giao dịch cấp quyền. Nếu chưa có quỹ, cần ký thêm một giao dịch khởi tạo; đăng nhập có thể yêu cầu ký tin nhắn. Token thử nghiệm chỉ được nạp khi cần.",
  "The test attempts up to three payments within your signed limits. Creating a policy does not start it.": "Lượt thử yêu cầu tối đa ba thanh toán theo hạn mức đã ký. Tạo chính sách không tự chạy agent.",
  "Sign and create policy": "Ký và tạo chính sách",
  "Connect the owner wallet to sign.": "Kết nối ví chủ sở hữu để ký.",
  "Review the risk assessment before signing.": "Xem kết quả đánh giá rủi ro trước khi ký.",
  "This policy is blocked. Reduce its risk and assess it again.": "Chính sách bị chặn. Giảm rủi ro và đánh giá lại.",
  "Add valid recipient addresses before signing.": "Nhập địa chỉ người nhận hợp lệ trước khi ký.",
  "Accept the reviewed risk to continue.": "Xác nhận đã xem xét rủi ro để tiếp tục.",
  "This build supports the configured Devnet dUSDC mint only.": "Bản này chỉ hỗ trợ mint dUSDC Devnet đã cấu hình.",
  "The payment mint is not configured. Ask the operator to configure Devnet dUSDC.": "Chưa cấu hình mint thanh toán. Người vận hành cần cấu hình dUSDC Devnet.",
  "Connect to the backend before signing.": "Kết nối máy chủ trước khi ký.",
  "The backend network or program differs from this app. Check Devnet configuration before signing.": "Mạng hoặc program của máy chủ khác với ứng dụng. Kiểm tra cấu hình Devnet trước khi ký.",
  "Finish the saved operation above before creating another policy.": "Hoàn tất thao tác đã lưu bên trên trước khi tạo chính sách khác.",
  "I have read the risk findings and accept them for this policy.": "Tôi đã đọc các cảnh báo và chấp nhận rủi ro cho chính sách này.",
  "The rental term changed. Review the updated duration and run the risk assessment again.": "Thời gian thuê đã thay đổi. Xem lại thời hạn mới và đánh giá rủi ro lần nữa.",
  "Your policy changed during the check. Review and assess it again.": "Chính sách đã thay đổi trong khi kiểm tra. Xem lại và đánh giá lại.",
  "Retry connection": "Thử kết nối lại",
};

export function GrantSignButton({ policy, assessment, destinations, destinationsInvalid, agentVersionId, hireId, onCreated, onDurationChange, agentLabel, recipientLabels = {} }: {
  policy: AgentPolicyInput; assessment: RiskAssessment | null; destinations: string[]; destinationsInvalid: boolean;
  agentVersionId: string | null; hireId: string | null; onCreated?: (id: string) => void; onDurationChange?: (hours: number) => void; agentLabel?: string; recipientLabels?: Record<string, string>;
}) {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const signMessage = useSignMessage(client);
  const operation = useGrantOperation(onCreated);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const guard = useRef(false);
  const fingerprint = JSON.stringify({ policy, destinations, agentVersionId, hireId, assessment });
  const latest = useRef(fingerprint); latest.current = fingerprint;
  useEffect(() => { setAccepted(false); operation.setError(""); }, [fingerprint]);
  useEffect(() => {
    let live = true; setHealth(null); setHealthError(false);
    api.health().then(value => { if (live) setHealth(value); }).catch(() => { if (live) setHealthError(true); });
    return () => { live = false; };
  }, [retry]);
  const supported = policy.tokens.length === 1 && policy.tokens[0] === paymentAsset.policySymbol;
  const reason = !operation.connected?.signer ? "Connect the owner wallet to sign."
    : !isAddressLike(paymentAsset.mint) ? "The payment mint is not configured. Ask the operator to configure Devnet dUSDC."
    : !supported ? "This build supports the configured Devnet dUSDC mint only."
    : !health || health.chain !== "solana" ? "Connect to the backend before signing."
    : health.programId !== PROGRAM_ID || health.cluster && health.cluster !== "devnet" ? "The backend network or program differs from this app. Check Devnet configuration before signing."
    : operation.pending ? "Finish the saved operation above before creating another policy."
    : !assessment ? "Review the risk assessment before signing."
    : assessment.decision === "BLOCK" ? "This policy is blocked. Reduce its risk and assess it again."
    : destinationsInvalid || destinations.length === 0 || destinations.length > MAX_RECIPIENTS || destinations.some(d => !isAddressLike(d)) ? "Add valid recipient addresses before signing."
    : assessment.decision === "REVIEW" && !accepted ? "Accept the reviewed risk to continue." : "";
  const busy = preparing || Boolean(operation.phase);

  async function sign() {
    if (guard.current || reason || !health || !assessment) return;
    guard.current = true; setPreparing(true); operation.setError("");
    let prepared: PendingGrant | undefined;
    try {
      await withGrantLock(grantScope(operation.owner), async () => {
        if (readPendingGrant(operation.owner)) throw new Error("Finish the saved operation above before creating another policy.");
        operation.setPhase("signin");
        if (!isSignedIn(operation.owner)) await signIn(message => signMessage.dispatchAsync(message), operation.owner);
        operation.assertOwner(); operation.setPhase("checking");
        const scope = paymentScope();
        const version = agentVersionId ?? (await api.publishAgent({ name: policy.agentName, version: "v0.1.0", strategy: policy.strategy, modelRef: "openai:gpt-5.4-mini", codeRef: "git:redline-runtime@main" })).agent.id;
        const result = await api.preflightGrant({ ownerWallet: operation.owner, agentVersionId: version, hireId: hireId ?? undefined, policy: { ...policy, ...scope, allowedDestinations: destinations } });
        operation.assertOwner();
        if (fingerprint !== latest.current) throw new Error("Your policy changed during the check. Review and assess it again.");
        if (result.durationHours !== policy.durationHours) {
          onDurationChange?.(result.durationHours);
          throw new Error("The rental term changed. Review the updated duration and run the risk assessment again.");
        }
        if (result.risk.decision === "BLOCK" || result.risk.acknowledgementRequired && !accepted) throw new Error("This policy is blocked. Reduce its risk and assess it again.");
        const agentId = randomAgentId();
        const next: PendingGrant = { version: 1, scope: grantScope(operation.owner), executor: result.executor, vaultReceipt: actionReceipt(operation.owner, "init-vault") ?? undefined,
          expiresAt: result.expiresAt ?? Math.floor(Date.now() / 1000) + policy.durationHours * 3600,
          registration: { ownerWallet: operation.owner, createSignature: "", vaultPda: String(await findVaultPda(operation.owner)),
            grantPda: String(await findGrantPda(operation.owner, agentId)), agentId: toHex(agentId), agentVersionId: version,
            policy: { ...policy, ...scope, allowedDestinations: [...destinations] }, riskAcknowledged: assessment.decision === "REVIEW" && accepted,
            hireId: result.hireId ?? hireId ?? undefined,
          },
        };
        savePendingGrant(next); prepared = next;
      });
      if (prepared) await operation.resume(prepared);
    } catch (error) { operation.setError(error instanceof Error ? error.message : String(error)); }
    finally { operation.setPhase(null); setPreparing(false); guard.current = false; }
  }

  return <div className="p0-sign-panel">
    <section className="p0-authority" aria-label={tr("Review the permission you will sign")}>
      <h3>{tr("Review the permission you will sign")}</h3><strong>{agentLabel ?? policy.agentName}</strong>
      <dl><div><dt>{tr("Total budget for the entire policy")}</dt><dd>{policy.spendCapUsdc} {paymentAsset.label}</dd></div><div><dt>{tr("Transfers")}</dt><dd>{policy.maxTransactions}</dd></div><div><dt>{tr("Duration")}</dt><dd>{policy.durationHours} {tr("hours")}</dd></div><div><dt>{tr("Cooldown")}</dt><dd>{policy.cooldownMinutes} {tr("minutes")}</dd></div></dl>
      <p>{tr("A single payment can use the remaining budget. This is not a per-payment limit.")}</p>
      <strong>{tr("Recipient addresses")}</strong><ul>{destinations.map(destination => <li key={destination}>{recipientLabels[destination] && <b>{recipientLabels[destination]}<br /></b>}<code>{destination}</code></li>)}</ul>
      <h4>{tr("Wallet requests")}</h4><p>{tr("Sign the policy. A new vault needs an extra transaction; sign-in may ask for a message signature. An empty vault receives test funds.")}</p>
      <p>{tr("Network fees use Devnet SOL.")}</p>
      <p>{tr("Signing does not start the agent.")}</p>
    </section>
    {assessment?.decision === "REVIEW" && <label className="p0-risk-accept"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy} /><span>{tr("I have read the risk findings and accept them for this policy.")}</span></label>}
    <button type="button" className="simple-primary" disabled={Boolean(reason) || busy} onClick={() => void sign()} aria-describedby="policy-sign-reason">{busy && <LoaderCircle size={16} className="animate-spin" />}{tr(operation.phase ? GRANT_PHASES[operation.phase] : "Sign and create policy")}</button>
    <p id="policy-sign-reason" role="status">{tr(reason)}</p>
    {healthError && <button type="button" className="simple-secondary" onClick={() => setRetry(value => value + 1)}>{tr("Retry connection")}</button>}
    {operation.error && <p role="alert">{tr(friendlyError(new Error(operation.error)))}</p>}
    {operation.error && <ErrorHelp context={{ area: "policy", message: operation.error, signature: (operation.pending?.grantReceipt ?? operation.pending?.vaultReceipt)?.signature, transactionState: (operation.pending?.grantReceipt ?? operation.pending?.vaultReceipt) ? "unknown" : undefined }} />}
    {operation.error && <details><summary>{tr("Technical details")}</summary><code>{operation.error}</code></details>}
  </div>;
}
