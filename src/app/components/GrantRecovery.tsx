import { ErrorHelp } from "./ErrorHelp";
import { useEffect, useRef, useState } from "react";
import { useClient } from "@solana/react";
import { useConnectedWallet, useSignMessage } from "@solana/kit-plugin-wallet/react";
import { ArrowRight, ExternalLink, LoaderCircle } from "lucide-react";
import { api, isSignedIn } from "../lib/api";
import { continueGrantOperation, withGrantLock, type GrantPhase, type PendingGrant } from "../lib/grant-operation";
import { clearPendingGrant, grantScope, PENDING_GRANT_EVENT, readPendingGrant, savePendingGrant } from "../lib/pending-grant";
import { signIn } from "../lib/signin";
import { tokenUnits } from "../lib/token-amount";
import { friendlyError, ERROR_VI, displayDate } from "../lib/friendly-error";
import { clearActionReceipt, saveActionReceipt } from "../lib/action-receipt";
import { accountExists, checkTransaction, sendTrackedTransaction } from "../solana/transactions";
import { createGrantInstruction, fromHex, initVaultInstruction, policyHashHex } from "../solana/redline";
import { explorerTransactionUrl, type AppClient } from "../solana/client";
import { useLang, useT } from "../i18n/LanguageContext";

export const GRANT_PHASES: Record<GrantPhase, string> = {
  signin: "Verify ownership in your wallet…", checking: "Checking the policy…", vault: "Checking the vault…",
  funding: "Checking test funds…", wallet: "Confirm the request in your wallet…", sending: "Sending the signed transaction…",
  confirming: "Waiting for network confirmation…", confirmed: "Transaction confirmed.", registering: "Syncing the confirmed policy…",
};
export const GRANT_VI: Record<string, string> = {
  ...ERROR_VI,
  "Recipient addresses": "Địa chỉ người nhận",
  "Policy expiry": "Thời điểm hết hạn",
  "Discarding this unsigned policy does not cancel an earlier vault transaction.": "Bỏ chính sách chưa ký không hủy giao dịch khởi tạo quỹ đã gửi trước đó.",
  "Verify ownership in your wallet…": "Xác minh quyền sở hữu trong ví…",
  "Checking the policy…": "Đang kiểm tra chính sách…",
  "Checking the vault…": "Đang kiểm tra quỹ…",
  "Checking test funds…": "Đang kiểm tra token thử nghiệm…",
  "Confirm the request in your wallet…": "Xác nhận yêu cầu trong ví…",
  "Sending the signed transaction…": "Đang gửi giao dịch đã ký…",
  "Waiting for network confirmation…": "Đang chờ xác nhận từ mạng…",
  "Transaction confirmed.": "Giao dịch đã được xác nhận.",
  "Syncing the confirmed policy…": "Đang đồng bộ chính sách đã xác nhận…",
  "Unfinished policy setup": "Thiết lập chính sách chưa hoàn tất",
  "Your previous operation is saved for this wallet and network. Continue it instead of creating another policy.": "Thao tác trước đã được lưu theo ví và mạng này. Tiếp tục thao tác đó để tránh tạo thêm chính sách.",
  "Check status and continue": "Kiểm tra trạng thái và tiếp tục",
  "View transaction": "Xem giao dịch",
  "Discard unsigned setup": "Bỏ thiết lập chưa ký",
  "Technical details": "Chi tiết kỹ thuật",
  "The connected wallet changed. Return to the original wallet to continue.": "Ví đã thay đổi. Quay lại ví ban đầu để tiếp tục.",
  "The wallet request was cancelled. Your form is kept; review it and try again.": "Đã hủy yêu cầu trong ví. Biểu mẫu vẫn được giữ; xem lại rồi thử tiếp.",
  "The connection was interrupted. Check the saved transaction status before trying again.": "Kết nối bị gián đoạn. Kiểm tra trạng thái giao dịch đã lưu trước khi thử lại.",
  "Confirmation is taking longer than expected. Check status; do not submit again.": "Xác nhận lâu hơn dự kiến. Kiểm tra trạng thái; không gửi lại giao dịch.",
  "The vault balance is unavailable. Refresh before continuing.": "Chưa tải được số dư quỹ. Tải lại trước khi tiếp tục.",
  "Allow local storage to save recovery information before signing.": "Cho phép lưu trên thiết bị để giữ thông tin khôi phục trước khi ký.",
};

export function useGrantOperation(onCreated?: (id: string) => void) {
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const signMessage = useSignMessage(client);
  const owner = connected ? String(connected.account.address) : "";
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const [pending, setPending] = useState<PendingGrant | null>(() => readPendingGrant(owner));
  const [phase, setPhaseState] = useState<GrantPhase | null>(null);
  const [error, setErrorState] = useState("");
  const setPhase = (value: GrantPhase | null) => { if (ownerRef.current === owner) setPhaseState(value); };
  const setError = (value: string) => { if (ownerRef.current === owner) setErrorState(value); };
  useEffect(() => {
    const sync = () => setPending(readPendingGrant(owner));
    sync(); setErrorState(""); setPhaseState(null);
    window.addEventListener(PENDING_GRANT_EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(PENDING_GRANT_EVENT, sync); window.removeEventListener("storage", sync); };
  }, [owner]);
  const assertOwner = () => { if (!owner || ownerRef.current !== owner) throw new Error("The connected wallet changed. Return to the original wallet to continue."); };
  const resume = async (initial?: PendingGrant) => {
    assertOwner();
    const operation = initial ?? readPendingGrant(owner);
    if (!operation || operation.scope !== grantScope(owner)) return;
    try {
      await withGrantLock(operation.scope, async () => {
        setError(""); setPhase("signin");
        try {
          if (!isSignedIn(owner)) await signIn(message => signMessage.dispatchAsync(message), owner);
          assertOwner();
          const id = await continueGrantOperation(operation, {
            assertOwner, save: pending => { savePendingGrant(pending); if (!pending.vaultReceipt) clearActionReceipt(owner, "init-vault"); }, phase: setPhase,
            exists: account => accountExists(client, account), confirm: receipt => checkTransaction(client, receipt),
            initVault: async remember => sendTrackedTransaction(client, [await initVaultInstruction(owner)], setPhase, receipt => { assertOwner(); saveActionReceipt(owner, "init-vault", receipt); remember(receipt); }),
            balance: async () => (await api.vault(owner)).balanceUnits,
            fund: () => api.fundVault(owner),
            create: async (saved, remember) => {
              const p = saved.registration.policy;
              const { instruction, grantPda } = await createGrantInstruction({ owner, executor: saved.executor,
                agentId: fromHex(saved.registration.agentId!), policyHashHex: await policyHashHex(p),
                spendCapUnits: tokenUnits(String(p.spendCapUsdc)), maxTransactions: p.maxTransactions,
                expiresAt: saved.expiresAt, cooldownSeconds: p.cooldownMinutes * 60,
                allowedMints: p.allowedMints, allowedDestinations: p.allowedDestinations,
              });
              if (grantPda !== saved.registration.grantPda) throw new Error("The saved policy address does not match this setup.");
              return sendTrackedTransaction(client, [instruction], setPhase, receipt => { assertOwner(); remember(receipt); });
            },
            register: registration => api.createGrant(registration),
          });
          clearPendingGrant(owner); clearActionReceipt(owner, "init-vault"); onCreated?.(id);
        } finally { setPhase(null); }
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  return { owner, connected, pending: pending?.registration.ownerWallet === owner ? pending : null, phase, error, setError, setPhase, resume, assertOwner };
}

export function GrantRecovery({ onCreated }: { onCreated: (id: string) => void }) {
  const tr = useT(GRANT_VI);
  const { lang } = useLang();
  const operation = useGrantOperation(onCreated);
  if (!operation.pending) return null;
  const receipt = operation.pending.grantReceipt ?? operation.pending.vaultReceipt;
  return <section className="p0-recovery" aria-label={tr("Unfinished policy setup")}>
    <h2>{tr("Unfinished policy setup")}</h2><p>{tr("Your previous operation is saved for this wallet and network. Continue it instead of creating another policy.")}</p>
    <p><strong>{operation.pending.registration.policy.agentName} · {operation.pending.registration.policy.spendCapUsdc} dUSDC</strong> · {tr("Policy expiry")}: {displayDate(operation.pending.expiresAt * 1000, lang)}</p>
    <details><summary>{tr("Recipient addresses")}</summary>{operation.pending.registration.policy.allowedDestinations.map(destination => <code key={destination}>{destination}</code>)}</details>
    <button type="button" className="simple-primary" disabled={Boolean(operation.phase)} onClick={() => void operation.resume()}>{operation.phase ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}{tr(operation.phase ? GRANT_PHASES[operation.phase] : "Check status and continue")}</button>
    {receipt && <a href={explorerTransactionUrl(receipt.signature)} target="_blank" rel="noreferrer"><ExternalLink size={15} />{tr("View transaction")}</a>}
    {!operation.pending.grantReceipt && <><button type="button" className="simple-secondary" disabled={Boolean(operation.phase)} onClick={() => clearPendingGrant(operation.owner)}>{tr("Discard unsigned setup")}</button>{operation.pending.vaultReceipt && <p>{tr("Discarding this unsigned policy does not cancel an earlier vault transaction.")}</p>}</>}
    {operation.error && <p role="alert">{tr(friendlyError(new Error(operation.error)))}</p>}
    {operation.error && <ErrorHelp context={{ area: "policy", message: operation.error, signature: receipt?.signature, transactionState: receipt ? "unknown" : undefined }} />}
    {operation.error && <details><summary>{tr("Technical details")}</summary><code>{operation.error}</code></details>}
  </section>;
}
