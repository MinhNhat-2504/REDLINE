import { useEffect, useMemo, useState } from "react";
import { address } from "@solana/kit";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useSignMessage,
  useWallets,
  useWalletStatus,
} from "@solana/kit-plugin-wallet/react";
import { useClient, useRequest } from "@solana/react";
import { ChevronDown, KeyRound, LoaderCircle, LogOut, PlugZap, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { AppClient } from "../solana/client";
import { loadSession } from "../lib/api";
import { sessionFor, signIn, signOut } from "../lib/signin";
import { color } from "../theme";
import { CopyChip } from "./CopyChip";
import { useT } from "../i18n/LanguageContext";

const ACCENT = color.primary;

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`, this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  "syncing…": "đang đồng bộ…",
  "balance unavailable": "không có số dư",

  "Wallet connected": "Đã kết nối ví",
  "Couldn't connect wallet": "Không kết nối được ví",
  "Connection was rejected or unavailable.": "Kết nối bị từ chối hoặc không khả dụng.",

  "Prove you hold this wallet. Signs a message only — no transfer, no funds moved.":
    "Xác minh bạn sở hữu ví này. Chỉ ký một message — không chuyển tiền, không có giao dịch nào.",
  "Check your wallet…": "Kiểm tra ví của bạn…",
  "Sign in": "Đăng nhập",
  "Signed in": "Đã đăng nhập",
  "Verified as": "Đã xác minh là",
  "Sign-in failed": "Đăng nhập thất bại",
  "Sign-in was rejected.": "Đăng nhập bị từ chối.",

  "Copy full wallet address": "Copy toàn bộ địa chỉ ví",
  "Disconnect Solana wallet": "Ngắt kết nối ví Solana",
  "Disconnected": "Đã ngắt kết nối",

  "Connecting": "Đang kết nối",
  "Connect Solana": "Connect Solana",
  "Solana Wallet Standard · Devnet": "Solana Wallet Standard · Devnet",
  "No compatible wallet detected. Install Phantom, Solflare, or another Wallet Standard wallet.":
    "Không tìm thấy ví tương thích. Hãy cài Phantom, Solflare, hoặc một ví khác hỗ trợ Wallet Standard.",
  "Connecting to": "Đang kết nối tới",
  "Connect": "Kết nối",
  "Wallet connection was rejected or unavailable.": "Kết nối ví bị từ chối hoặc không khả dụng.",
};

function WalletBalance({ owner }: { owner: string }) {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const source = useMemo(() => client.rpc.getBalance(address(owner)), [client, owner]);
  const { data, status } = useRequest(source);
  const sol = data ? Number(data.value) / 1_000_000_000 : null;

  return (
    <span className="hidden xl:inline text-[12px]" style={{ color: color.textMuted }}>
      {status === "fetching" ? tr("syncing…") : sol === null ? tr("balance unavailable") : `${sol.toFixed(3)} SOL`}
    </span>
  );
}

export function SolanaWalletControl() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const wallets = useWallets(client);
  const status = useWalletStatus(client);
  const connected = useConnectedWallet(client);
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);
  const signMessage = useSignMessage(client);
  const [open, setOpen] = useState(false);
  // Mirrors the stored session so the button re-renders when it changes;
  // localStorage on its own does not notify React.
  const [sessionWallet, setSessionWallet] = useState<string | null>(() => loadSession()?.wallet ?? null);
  const [signingIn, setSigningIn] = useState(false);
  const [signinError, setSigninError] = useState("");

  // Resolves the "Connecting to <wallet>…" toast fired on click, in place —
  // sonner replaces a toast by id rather than stacking a second one.
  useEffect(() => {
    if (connected) {
      const owner = String(connected.account.address);
      toast.success(tr("Wallet connected"), { id: "wallet-connect", description: `${owner.slice(0, 4)}…${owner.slice(-4)}` });
    }
  }, [connected]);
  useEffect(() => {
    if (connect.error) {
      toast.error(tr("Couldn't connect wallet"), { id: "wallet-connect", description: tr("Connection was rejected or unavailable.") });
    }
  }, [connect.error]);

  if (connected) {
    const owner = String(connected.account.address);
    const short = `${owner.slice(0, 4)}…${owner.slice(-4)}`;
    const signedIn = !!sessionFor(owner) && sessionWallet === owner;
    return (
      <div className="relative flex items-center gap-2 whitespace-nowrap shrink-0">
        <WalletBalance owner={owner} />
        {!signedIn && (
          <button
            type="button"
            onClick={async () => {
              setSigninError("");
              setSigningIn(true);
              try {
                const s = await signIn(m => signMessage.dispatchAsync(m), owner);
                setSessionWallet(s.wallet);
                toast.success(tr("Signed in"), { description: `${tr("Verified as")} ${short}` });
              } catch (e) {
                const message = e instanceof Error ? e.message : tr("Sign-in was rejected.");
                setSigninError(message);
                toast.error(tr("Sign-in failed"), { description: message });
              } finally {
                setSigningIn(false);
              }
            }}
            disabled={signingIn}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all disabled:opacity-60"
            style={{ background: "#38bdf814", border: "1px solid #38bdf845", color: color.info, whiteSpace: "nowrap", flexShrink: 0, lineHeight: 1 }}
            title={tr("Prove you hold this wallet. Signs a message only — no transfer, no funds moved.")}
          >
            {signingIn ? <LoaderCircle size={12} className="animate-spin" /> : <KeyRound size={12} />}
            <span className="whitespace-nowrap leading-none">{signingIn ? tr("Check your wallet…") : tr("Sign in")}</span>
          </button>
        )}
        {signinError && <span role="alert" className="hidden lg:inline text-[12px] whitespace-nowrap shrink-0" style={{ color: color.danger }}>{signinError}</span>}
        <div
          className="flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
          style={{ background: `${ACCENT}0e`, border: `1px solid ${ACCENT}35`, color: ACCENT, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          <Wallet size={13} className="shrink-0" />
          <CopyChip
            value={owner}
            label={short}
            title={tr("Copy full wallet address")}
            toastLabel={short}
          />
          {signedIn && <KeyRound size={11} className="shrink-0" style={{ color: color.info }} />}
          <span className="w-1.5 h-1.5 rounded-full glow-pulse-dot shrink-0" style={{ background: ACCENT }} />
          <button
            type="button"
            onClick={() => { signOut(); setSessionWallet(null); disconnect.dispatch(); toast(tr("Disconnected"), { description: short }); }}
            className="p-1 rounded-md transition-colors hover:bg-black/[0.06] shrink-0"
            title={tr("Disconnect Solana wallet")}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    );
  }

  const pending = status === "pending" || status === "connecting" || connect.isRunning;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        disabled={pending}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 hover:shadow-[0_0_22px_rgba(37,99,235,.28)]${!pending && !open ? " glow-pulse-ring" : ""}`}
        style={{ background: color.surfaceSubtle, border: `1px solid ${color.border}`, color: color.textSecondary }}
      >
        {pending ? <LoaderCircle size={13} className="animate-spin" /> : <PlugZap size={13} />}
        <span>{pending ? tr("Connecting") : tr("Connect Solana")}</span>
        <ChevronDown size={11} />
      </button>

      {open && !pending && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-xl p-2 z-50 shadow-2xl"
          style={{ background: color.surface, border: `1px solid ${color.border}` }}
        >
          <div className="px-2 py-1.5 text-[12px] uppercase tracking-[0.14em]" style={{ color: color.textMuted }}>
            {tr("Solana Wallet Standard · Devnet")}
          </div>
          {wallets.length === 0 ? (
            <div className="px-2 py-3 text-xs" style={{ color: color.textSecondary }}>
              {tr("No compatible wallet detected. Install Phantom, Solflare, or another Wallet Standard wallet.")}
            </div>
          ) : (
            wallets.map(wallet => (
              <button
                type="button"
                key={wallet.name}
                onClick={() => {
                  connect.dispatch(wallet);
                  setOpen(false);
                  toast.loading(`${tr("Connecting to")} ${wallet.name}…`, { id: "wallet-connect", duration: 4000 });
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors hover:bg-white/[0.05]"
                style={{ color: color.text }}
              >
                <span>{wallet.name}</span>
                <span style={{ color: ACCENT }}>{tr("Connect")}</span>
              </button>
            ))
          )}
          {Boolean(connect.error) && (
            <div className="px-2 py-2 text-[12px]" role="alert" style={{ color: color.danger }}>
              {tr("Wallet connection was rejected or unavailable.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
