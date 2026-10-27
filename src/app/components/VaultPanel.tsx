import { ErrorHelp } from "./ErrorHelp";
﻿import { useEffect, useRef, useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { ExternalLink, LoaderCircle, RefreshCw, Vault } from "lucide-react";
import { api, fmtUsdc } from "../lib/api";
import { paymentAsset } from "../lib/capabilities";
import { actionReceipt, clearActionReceipt, saveActionReceipt } from "../lib/action-receipt";
import { friendlyError } from "../lib/friendly-error";
import { tokenUnits, withdrawalProblem } from "../lib/token-amount";
import { SettledTransactionError, type TransactionStage } from "../lib/transaction-status";
import { useWalletResource } from "../lib/useWalletResource";
import { useSignedIn } from "../lib/useSignedIn";
import { grantScope } from "../lib/pending-grant";
import { withGrantLock } from "../lib/grant-operation";
import { explorerTransactionUrl, isAddressLike, type AppClient } from "../solana/client";
import { withdrawInstruction } from "../solana/redline";
import { checkTransaction, sendTrackedTransaction } from "../solana/transactions";
import { GRANT_PHASES, GRANT_VI } from "./GrantRecovery";
import { SolanaWalletControl } from "./SolanaWalletControl";
import { useT } from "../i18n/LanguageContext";

const VI: Record<string, string> = {
  ...GRANT_VI,
  "Test-token vault": "Quỹ token thử nghiệm",
  "dUSDC in the vault is separate from SOL in your wallet. SOL pays network fees.": "dUSDC trong quỹ khác với SOL trong ví. SOL dùng để trả phí mạng.",
  "Connect and sign in to see your vault.": "Kết nối ví và đăng nhập để xem quỹ.",
  "Create your first policy to initialise the vault.": "Tạo chính sách đầu tiên để khởi tạo quỹ.",
  "Open Spending limits": "Mở Hạn mức chi",
  "Add 1,000 test dUSDC": "Nạp 1.000 dUSDC thử nghiệm",
  "Refresh balance": "Tải lại số dư",
  "Withdraw amount in dUSDC": "Số dUSDC muốn rút",
  "Review withdrawal": "Xem lại yêu cầu rút",
  "Confirm withdrawal": "Xác nhận rút",
  "Cancel": "Hủy",
  "You will withdraw": "Bạn sẽ rút",
  "to your connected wallet": "về ví đang kết nối",
  "Network fees are paid in Devnet SOL.": "Phí mạng được thanh toán bằng SOL Devnet.",
  "Withdrawal confirmed.": "Đã xác nhận rút tiền.",
  "Test funds added.": "Đã nạp token thử nghiệm.",
  "Enter a valid positive amount.": "Nhập số tiền dương hợp lệ.",
  "Use at most six decimal places.": "Nhập tối đa sáu chữ số thập phân.",
  "Amount must be greater than zero.": "Số tiền phải lớn hơn 0.",
  "Amount exceeds the supported token limit.": "Số tiền vượt giới hạn token được hỗ trợ.",
  "Amount exceeds your available balance.": "Số tiền vượt số dư khả dụng.",
  "Refresh your balance before withdrawing.": "Tải lại số dư trước khi rút.",
  "Configure the Devnet dUSDC mint before withdrawing.": "Cần cấu hình mint dUSDC Devnet trước khi rút.",
  "A withdrawal is awaiting confirmation. Check its status before making another withdrawal.": "Một yêu cầu rút đang chờ xác nhận. Kiểm tra trạng thái trước khi tạo yêu cầu khác.",
  "Check withdrawal status": "Kiểm tra trạng thái rút",
  "Balance unavailable. Refresh before withdrawing; existing funds have not been changed by this error.": "Chưa tải được số dư. Tải lại trước khi rút; lỗi này không làm thay đổi tiền trong quỹ.",
  "The deadline passed without a verifiable result. Check Explorer and your refreshed balance. Removing this local request does not cancel it; a new withdrawal may transfer funds again.": "Đã qua hạn xác nhận nhưng chưa xác minh được kết quả. Kiểm tra Explorer và số dư mới nhất. Xóa yêu cầu trên thiết bị không hủy giao dịch; rút lần nữa có thể chuyển thêm tiền.",
  "I checked the previous transaction and want to review a separate withdrawal.": "Tôi đã kiểm tra giao dịch trước và muốn xem lại một yêu cầu rút riêng.",
  "Archive this expired request": "Lưu lại yêu cầu hết hạn",
  "The previous transaction remains in history. Review any new withdrawal separately.": "Giao dịch trước vẫn có trong lịch sử. Xem lại riêng trước khi rút lần nữa.",
};
const fetchVault = (owner: string) => api.vault(owner);

export function VaultPanel() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const owner = connected ? String(connected.account.address) : "";
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const signedIn = useSignedIn(owner);
  const [revision, setRevision] = useState(0);
  const resource = useWalletResource(owner, signedIn, fetchVault, revision);
  const view = resource.data;
  const [amount, setAmount] = useState("100");
  const [confirming, setConfirming] = useState(false);
  const [phase, setPhaseState] = useState<TransactionStage | "funding" | "checking" | null>(null);
  const setPhase = (value: TransactionStage | "funding" | "checking" | null) => { if (currentOwner.current === owner) setPhaseState(value); };
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [last, setLast] = useState<{ owner: string; signature: string } | null>(null);
  const [expired, setExpired] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const gate = useRef(false);
  useEffect(() => { setConfirming(false); setPhaseState(null); setError(""); setNotice(""); setLast(null); setExpired(false); setAcknowledged(false); }, [owner]);
  const receipt = actionReceipt(owner, "withdraw");
  const problem = !signedIn ? "Connect and sign in to see your vault."
    : !view?.exists ? "Create your first policy to initialise the vault."
    : resource.error || view.owner !== owner ? "Refresh your balance before withdrawing."
    : !isAddressLike(paymentAsset.mint) ? "Configure the Devnet dUSDC mint before withdrawing."
    : view.mint !== paymentAsset.mint ? "Configure the Devnet dUSDC mint before withdrawing."
    : receipt ? "A withdrawal is awaiting confirmation. Check its status before making another withdrawal."
    : withdrawalProblem(amount, view.balanceUnits);
  const assertOwner = () => { if (!owner || currentOwner.current !== owner) throw new Error("The connected wallet changed. Return to the original wallet to continue."); };

  async function withdraw() {
    if (gate.current || !signedIn || !connected?.signer || !receipt && (!confirming || problem)) return;
    gate.current = true; setPhase("checking"); setError(""); setNotice("");
    try {
      await withGrantLock(`${grantScope(owner)}:withdraw`, async () => {
        assertOwner();
        const saved = actionReceipt(owner, "withdraw");
        if (saved) {
          setPhase("confirming");
          await checkTransaction(client, saved);
          setLast({ owner, signature: saved.signature });
        } else {
          const fresh = await api.vault(owner); assertOwner();
          const issue = fresh.owner !== owner || fresh.mint !== paymentAsset.mint ? "Refresh your balance before withdrawing." : withdrawalProblem(amount, fresh.balanceUnits);
          if (issue) throw new Error(issue);
          const units = tokenUnits(amount);
          const sent = await sendTrackedTransaction(client, [await withdrawInstruction(owner, paymentAsset.mint, units)], setPhase, value => {
            assertOwner(); saveActionReceipt(owner, "withdraw", { ...value, amountUnits: units.toString() });
          });
          setLast({ owner, signature: sent.signature });
        }
        clearActionReceipt(owner, "withdraw");
        if (currentOwner.current === owner) { setConfirming(false); setNotice("Withdrawal confirmed."); }
      });
    } catch (cause) {
      // A recorded refusal is definitive. Unknown/expired outcomes remain saved for checking.
      if (cause instanceof SettledTransactionError && cause.outcome === "failed") clearActionReceipt(owner, "withdraw");
      if (cause instanceof SettledTransactionError && cause.outcome === "expired" && currentOwner.current === owner) setExpired(true);
      if (currentOwner.current === owner) setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setPhase(null); setRevision(value => value + 1); gate.current = false; }
  }

  async function refill() {
    if (gate.current || !signedIn || !view?.exists) return;
    gate.current = true; setPhase("funding"); setError(""); setNotice("");
    try { assertOwner(); const result = await api.fundVault(owner); if (currentOwner.current === owner) { setLast({ owner, signature: result.signature }); setNotice("Test funds added."); } }
    catch (cause) { if (currentOwner.current === owner) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setPhase(null); setRevision(value => value + 1); gate.current = false; }
  }

  return <section className="panel p0-vault" aria-labelledby="vault-title">
    <header className="ph"><h2 id="vault-title"><Vault size={18} />{tr("Test-token vault")}</h2><span className="test-badge">Devnet</span></header>
    <div className="pb"><p>{tr("dUSDC in the vault is separate from SOL in your wallet. SOL pays network fees.")}</p>
      {!signedIn ? <><p>{tr("Connect and sign in to see your vault.")}</p><SolanaWalletControl /></> : <>
        <div className="p0-vault-balance">{view?.balanceUnits != null ? fmtUsdc(view.balanceUnits) : "—"}<small> dUSDC</small></div>
        <button type="button" className="simple-secondary" disabled={Boolean(phase)} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} />{tr("Refresh balance")}</button>
        {resource.error && <p role="alert">{tr("Balance unavailable. Refresh before withdrawing; existing funds have not been changed by this error.")}</p>}
        {view && !view.exists && <p><a href="#/guardrails">{tr("Open Spending limits")}</a> · {tr("Create your first policy to initialise the vault.")}</p>}
        <div className="p0-vault-actions"><button type="button" className="simple-secondary" disabled={Boolean(phase) || !view?.exists || resource.error} onClick={() => void refill()}>{tr("Add 1,000 test dUSDC")}</button>
          <label>{tr("Withdraw amount in dUSDC")}<input inputMode="decimal" maxLength={32} value={amount} onChange={event => { setAmount(event.target.value); setConfirming(false); }} disabled={Boolean(phase) || Boolean(receipt)} aria-describedby="withdraw-reason" /></label>
          <button type="button" className="simple-primary" disabled={Boolean(problem) || Boolean(phase)} onClick={() => { setConfirming(true); setError(""); }}>{tr("Review withdrawal")}</button>
        </div>
        <p id="withdraw-reason" role="status">{tr(problem)}</p>
        {confirming && !receipt && <section className="p0-confirm" aria-label={tr("Confirm withdrawal")}><h3>{tr("Confirm withdrawal")}</h3><p>{tr("You will withdraw")} <strong>{amount} dUSDC</strong> {tr("to your connected wallet")}:</p><code>{owner}</code><p>{tr("Network fees are paid in Devnet SOL.")}</p><button type="button" className="simple-secondary" disabled={Boolean(phase)} onClick={() => setConfirming(false)}>{tr("Cancel")}</button><button type="button" className="simple-primary" disabled={Boolean(phase) || Boolean(problem)} onClick={() => void withdraw()}>{tr("Confirm withdrawal")}</button></section>}
        {receipt && <div className="p0-confirm"><strong>{fmtUsdc(receipt.amountUnits ?? "0")} dUSDC</strong><button type="button" className="simple-primary" disabled={Boolean(phase)} onClick={() => void withdraw()}>{tr("Check withdrawal status")}</button><a href={explorerTransactionUrl(receipt.signature)} target="_blank" rel="noreferrer">{tr("View transaction")}</a></div>}
        {receipt && expired && <div className="p0-confirm"><p>{tr("The deadline passed without a verifiable result. Check Explorer and your refreshed balance. Removing this local request does not cancel it; a new withdrawal may transfer funds again.")}</p><label className="p0-risk-accept"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /><span>{tr("I checked the previous transaction and want to review a separate withdrawal.")}</span></label><button type="button" className="simple-secondary" disabled={!acknowledged || Boolean(phase) || resource.error || !view} onClick={() => {
          saveActionReceipt(owner, `withdraw-history:${receipt.signature}`, receipt); clearActionReceipt(owner, "withdraw"); setExpired(false); setAcknowledged(false); setConfirming(false); setError(""); setNotice("The previous transaction remains in history. Review any new withdrawal separately."); setRevision(value => value + 1);
        }}>{tr("Archive this expired request")}</button></div>}
      </>}
      {phase && <p role="status" aria-live="polite"><LoaderCircle size={15} className="animate-spin" />{tr(GRANT_PHASES[phase])}</p>}
      {notice && <p role="status">{tr(notice)}</p>}
      {last?.owner === owner && <a href={explorerTransactionUrl(last.signature)} target="_blank" rel="noreferrer"><ExternalLink size={14} />{tr("View transaction")}</a>}
      {error && <ErrorHelp context={{ area: "vault", message: error, signature: receipt?.signature, transactionState: receipt ? "unknown" : undefined }} />}
      {error && <><p role="alert">{tr(friendlyError(new Error(error)))}</p><details><summary>{tr("Technical details")}</summary><code>{error}</code></details></>}
    </div>
  </section>;
}
