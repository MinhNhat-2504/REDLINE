import { useCallback, useEffect, useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { ArrowDownToLine, ExternalLink, LoaderCircle, RefreshCw, Vault } from "lucide-react";
import { toast } from "sonner";
import { api, fmtUsdc, short, type VaultView } from "../lib/api";
import type { AppClient } from "../solana/client";
import { explorerAddressUrl, explorerTransactionUrl } from "../solana/client";
import { withdrawInstruction } from "../solana/redline";
import { color, mono, sans } from "../theme";
import { CopyChip } from "./CopyChip";
import { VaultScene } from "./depth";
import { useT } from "../i18n/LanguageContext";

const M = color.primary, C = color.info, A = color.warn, R = color.danger;
const USDC_MINT = import.meta.env.VITE_DEMO_USDC_MINT ?? "";

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`; this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  "Vault refilled": "Đã nạp Vault",
  "1,000 dUSDC (devnet)": "1.000 dUSDC (devnet)",
  "Refill failed": "Nạp thất bại",
  "Withdrawal confirmed": "Đã xác nhận rút tiền",
  "Withdraw was rejected or failed.": "Yêu cầu rút tiền bị từ chối hoặc thất bại.",
  "Withdraw failed": "Rút thất bại",
  "Program vault · live from Devnet": "Vault chương trình · trực tiếp từ Devnet",
  "Connect a wallet to see its vault.": "Kết nối ví để xem vault của bạn.",
  "vault not initialised — sign a grant first": "vault chưa được khởi tạo — hãy ký một grant trước",
  "Refill 1,000 (devnet)": "Nạp 1.000 (devnet)",
  "Withdraw": "Rút",
  "Withdraw amount in dUSDC": "Số lượng dUSDC muốn rút",
  "last tx": "tx gần nhất",
};

// The owner's vault: live balance from the chain, Refill (demo faucet via the
// API) and Withdraw (owner signs `withdraw` in the wallet — no gates, the
// owner's key is the authority, which is the whole non-custodial point).
export function VaultPanel() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const owner = connected ? String(connected.account.address) : "";
  const [view, setView] = useState<VaultView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [lastSig, setLastSig] = useState("");
  const [amount, setAmount] = useState("100");

  const load = useCallback(async () => {
    if (!owner) { setView(null); return; }
    try { setView(await api.vault(owner)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [owner]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 15_000); return () => clearInterval(t); }, [load]);

  async function refill() {
    setBusy("refill"); setError("");
    try {
      const r = await api.fundVault(owner);
      setLastSig(r.signature);
      await load();
      toast.success(tr("Vault refilled"), { description: tr("1,000 dUSDC (devnet)") });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      toast.error(tr("Refill failed"), { description: message });
    } finally { setBusy(""); }
  }
  async function withdraw() {
    if (!connected?.signer || !view) return;
    setBusy("withdraw"); setError("");
    try {
      const units = BigInt(Math.round(Number(amount) * 1_000_000));
      const result = await client.sendTransaction([await withdrawInstruction(owner, USDC_MINT, units)]);
      setLastSig(String(result.context.signature));
      await load();
      toast.success(tr("Withdrawal confirmed"), { description: `${amount} dUSDC` });
    } catch (e) {
      const message = e instanceof Error ? e.message : tr("Withdraw was rejected or failed.");
      setError(message);
      toast.error(tr("Withdraw failed"), { description: message });
    } finally { setBusy(""); }
  }

  const balance = view?.balanceUnits ? fmtUsdc(view.balanceUnits) : "—";
  return (
    <div className="rounded-2xl p-6 relative overflow-hidden vault-panel px-block" style={{ background: color.surface, border: `1px solid ${M}18`, boxShadow: "0 18px 48px rgba(4, 2, 12, 0.55)" }}>
      <div className="absolute top-0 left-12 right-12 h-px" style={{ background: `linear-gradient(90deg, transparent, ${M}60, transparent)` }} />
      <VaultScene balanceUnits={owner ? view?.balanceUnits : null} busy={busy} exists={view?.exists} label={owner ? tr("Program vault · live from Devnet") : "CONNECT YOUR OWNER WALLET"} />
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${M}14`, border: `1px solid ${M}25` }}><Vault size={18} style={{ color: M }} /></div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-[12px] font-bold tracking-[0.18em] uppercase" style={{ ...mono, color: M }}>{tr("Program vault · live from Devnet")}</div>
          {!owner && <div className="text-sm mt-1" style={{ ...sans, color: color.textMuted }}>{tr("Connect a wallet to see its vault.")}</div>}
          {owner && (
            <>
              <div className="text-3xl font-bold tracking-tight mt-1" style={{ ...mono, color: color.text }}>{balance} <span className="text-base" style={{ color: color.textMuted }}>dUSDC</span></div>
              <div className="text-[12px] mt-1 flex gap-3 flex-wrap" style={{ ...mono, color: color.textDim }}>
                {view && <a href={explorerAddressUrl(view.vaultPda)} target="_blank" rel="noreferrer" style={{ color: C }}>vault {short(view.vaultPda)} <ExternalLink size={9} className="inline" /></a>}
                {view && <CopyChip value={view.vaultAta} label={`ata ${short(view.vaultAta)}`} title="Copy full token account address" toastLabel={short(view.vaultAta)} />}
                {view && !view.exists && <span style={{ color: A }}>{tr("vault not initialised — sign a grant first")}</span>}
              </div>
            </>
          )}
        </div>
        {owner && (
          <div className="flex items-center gap-4 flex-wrap">
            <Btn icon={RefreshCw} label={tr("Refill 1,000 (devnet)")} accent={M} busy={busy === "refill"} disabled={!!busy} onClick={refill} />
            <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: color.border }}>
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ""))} aria-label={tr("Withdraw amount in dUSDC")} className="w-24 px-3 py-2 rounded-xl text-xs text-right font-mono" style={{ ...mono, background: color.surfaceInset, border: `1px solid ${color.border}`, color: color.text }} />
              <Btn icon={ArrowDownToLine} label={tr("Withdraw")} accent={color.blocked} busy={busy === "withdraw"} disabled={!!busy || !view?.exists || !connected?.signer} onClick={withdraw} />
            </div>
          </div>
        )}
      </div>
      {lastSig && <a className="block mt-3 text-[12px]" style={{ ...mono, color: C }} href={explorerTransactionUrl(lastSig)} target="_blank" rel="noreferrer">{tr("last tx")} {short(lastSig, 6)} ↗</a>}
      {error && <p role="alert" className="mt-3 text-[13px]" style={{ ...mono, color: R }}>{error}</p>}
    </div>
  );
}

function Btn({ icon: Icon, label, accent, onClick, disabled, busy }: { icon: React.ElementType; label: string; accent: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40"
      style={{ ...sans, background: `${accent}12`, border: `1px solid ${accent}30`, color: accent }}>
      {busy ? <LoaderCircle size={11} className="animate-spin" /> : <Icon size={11} />}{label}
    </button>
  );
}
