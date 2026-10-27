import { ErrorHelp } from "./ErrorHelp";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectedWallet, useSignMessage } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { ChevronRight, ExternalLink, Key, LoaderCircle, Play, ShieldOff, Zap } from "lucide-react";
import { api, fmtUsdc, grantExpiresAt, short, subscribeFeed, type Grant, type IntentRow } from "../lib/api";
import { coalesce } from "../lib/coalesce";
import { isSettled, mergeGrants } from "../lib/grant-merge";
import { sessionFor, signIn } from "../lib/signin";
import type { AppClient } from "../solana/client";
import { explorerTransactionUrl } from "../solana/client";
import { revokeGrantInstruction } from "../solana/redline";
import { color, mono, sans } from "../theme";
import { CopyChip } from "./CopyChip";
import { EmergencyStop } from "./EmergencyStop";
import { useT } from "../i18n/LanguageContext";
import { playSound } from "../lib/soundscape";
import { policyState } from "../lib/onboarding";
import { useSignedIn } from "../lib/useSignedIn";
import { actionReceipt, clearActionReceipt, saveActionReceipt } from "../lib/action-receipt";
import { accountExists, checkTransaction, sendTrackedTransaction } from "../solana/transactions";
import { friendlyError } from "../lib/friendly-error";
import { GRANT_VI } from "./GrantRecovery";
import { SettledTransactionError } from "../lib/transaction-status";

const M = color.primary, C = color.info, A = color.warn, R = color.danger;

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`; this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  ...GRANT_VI,
  "Create new from this policy": "T\u1ea1o m\u1edbi t\u1eeb ch\u00ednh s\u00e1ch n\u00e0y",
  "Ready to run": "Sẵn sàng chạy",
  "Needs attention": "Cần xử lý",
  "Budget or transfer limit reached": "Đã hết ngân sách hoặc số lệnh",
  "Confirm revocation": "Xác nhận thu hồi quyền",
  "This ends the agent's permission after network confirmation. It does not withdraw funds. To grant access again, create a new policy.": "Quyền của agent kết thúc sau khi mạng xác nhận. Tiền không bị rút khỏi quỹ. Muốn cấp quyền lại, cần tạo chính sách mới.",
  "Cancel": "Hủy",
  "Yes, revoke this policy": "Thu hồi chính sách này",
  "The test attempts up to three payments. Your signed limits still apply. Network fees may apply.": "Lượt thử yêu cầu tối đa ba thanh toán. Hạn mức đã ký vẫn được áp dụng. Có thể phát sinh phí mạng.",
  "Stop this run": "Dừng lượt chạy này",
  "Stopping the run keeps its spending permission. Revoke access to end that permission.": "Dừng lượt chạy vẫn giữ quyền chi. Thu hồi quyền nếu bạn muốn kết thúc quyền đó.",
  "Connect and sign in to manage your policies.": "Kết nối ví và đăng nhập để quản lý chính sách.",
  "Refresh policies": "Tải lại chính sách",
  "The policy has expired. Create a new one to run again.": "Chính sách đã hết hạn. Tạo chính sách mới để chạy tiếp.",
  "The budget or transfer limit is used up. Create a new policy.": "Đã dùng hết ngân sách hoặc số lệnh. Tạo chính sách mới.",
  "A run is already active. Follow it in Activity.": "Một lượt chạy đang hoạt động. Theo dõi trong Hoạt động.",
  "Check the connection before starting a run.": "Kiểm tra kết nối trước khi chạy.",
  "Your vault needs funds before starting a run. Open Vault and refresh the balance.": "Quỹ cần có tiền trước khi chạy. Mở Quỹ và tải lại số dư.",
  "Grants": "Chính sách của bạn",
  "Your policies": "Chính sách của bạn",
  "No policies yet": "Chưa có chính sách",
  "Create a policy to choose an agent, a budget and approved recipients.": "Tạo chính sách để chọn agent, ngân sách và người nhận được phép.",
  "Create your first policy": "Tạo chính sách đầu tiên",
  "Start agent": "Chạy agent",
  "Revoke access": "Thu hồi quyền",
  "Test an over-budget payment": "Thử thanh toán vượt ngân sách",
  "This sends a test transaction that should be refused by the policy. Network fees may apply.": "Gửi giao dịch thử nghiệm dự kiến bị chính sách từ chối. Có thể phát sinh phí mạng.",
  "Test tools": "Công cụ thử nghiệm",
  "ACTIVE": "CÓ HIỆU LỰC",
  "AGENT RUNNING": "AGENT ĐANG CHẠY",
  "EXPIRED": "HẾT HẠN",
  "REVOKED": "ĐÃ THU HỒI",
  "Loading policies…": "Đang tải chính sách…",
  "Technical details": "Chi tiết kỹ thuật",
  "transfers": "lệnh chuyển",
  "active": "hoạt động",
  "api offline": "api mất kết nối",
  "No grants yet — create one in the wizard below.": "Chưa có grant nào — tạo một grant ở wizard bên dưới.",
  "Agent running…": "Agent đang chạy…",
  "Start agent (scripted)": "Start agent (scripted)",
  "Stress Test & Revoke:": "Kiểm Tra Chịu Tải & Revoke:",
  "Force": "Force",
  "USDC (over cap)": "USDC (vượt hạn mức)",
  "Revoke": "Revoke",
  "Read-only · Connect owner wallet to manage": "Chỉ xem · Kết nối ví chủ sở hữu để quản lý",
  "Hide": "Ẩn",
  "Show": "Xem",
  "every proposal this agent made": "mọi đề xuất mà agent này đã đưa ra",
  "loading…": "đang tải…",
  "No proposals yet — start the agent, or force one over the cap.": "Chưa có đề xuất nào — hãy chạy agent, hoặc buộc gửi một đề xuất vượt hạn mức.",
  "moved": "đã chuyển",
  "passed precheck": "qua precheck",
  "pending": "đang chờ",
  "refused": "bị từ chối",
  "expired": "đã hết hạn",
  "m left": " phút nữa",
  "h left": " giờ nữa",
  "d left": " ngày nữa",
  "rented": "đã thuê",
};

// Real grants from the API with the three demo controls:
//   Start agent  → POST /runs (scripted: 3 compliant transfers + 1 over cap)
//   Force over-cap → POST /intents with (remaining + 1) units and proveOnChain: the server predicts
//                    gate 6 will refuse it, sends it anyway, and the PROGRAM refuses it — so the row
//                    carries a failed Solana transaction you can open, not just the server's word
//   Revoke → owner signs revoke_grant in the wallet, API records the signature
export function GrantsPanel({ refreshKey = 0, onCreate, focusId = "" }: { refreshKey?: number; onCreate?: () => void; focusId?: string }) {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const owner = connected ? String(connected.account.address) : "";
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const signedIn = useSignedIn(owner);
  const signMessage = useSignMessage(client);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmRevoke, setConfirmRevoke] = useState("");
  const actionGate = useRef(false);
  const lastFocus = useRef("");
  const [chain, setChain] = useState<"mock" | "solana" | "">("");
  const [openGrant, setOpenGrant] = useState("");
  const [intents, setIntents] = useState<Record<string, IntentRow[]>>({});

  // What is on screen, readable from inside `load` without making it depend
  // on state (which would re-subscribe the feed on every refresh).
  const grantsRef = useRef<Grant[]>([]);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (ownerRef.current !== owner) return;
    const seq = ++loadSeq.current;
    if (!owner || !signedIn) { grantsRef.current = []; setGrants([]); setLoading(false); return; }
    try {
      const list = (await api.grants()).filter(g => g.owner.wallet === owner);
      const known = new Map(grantsRef.current.map(g => [g.id, g]));
      // Each detail read costs the API an RPC call. A revoked grant's chain
      // state cannot change again, so once it is known it is not re-read —
      // that alone removes most of the traffic a busy run used to generate.
      const withChain = await Promise.all(list.map(g => {
        const before = known.get(g.id);
        return before && isSettled(before) ? g : api.grant(g.id).catch(() => g);
      }));
      // A newer load started while this one was waiting; its answer wins, and
      // painting this one would show the past.
      if (seq !== loadSeq.current || ownerRef.current !== owner) return;
      const merged = mergeGrants(grantsRef.current, withChain);
      grantsRef.current = merged;
      setGrants(merged);
      setError("");
    } catch (e) {
      if (seq === loadSeq.current) setError(e instanceof Error ? e.message : "API unreachable");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [owner, signedIn]);

  useEffect(() => { setOpenGrant(""); setIntents({}); setConfirmRevoke(""); setError(""); }, [owner]);
  useEffect(() => {
    if (!focusId || lastFocus.current === focusId) return;
    const row = document.getElementById(`policy-${focusId}`);
    if (row) { row.focus({ preventScroll: true }); row.scrollIntoView({ block: "center", behavior: "instant" }); lastFocus.current = focusId; }
  }, [focusId, grants]);

  useEffect(() => { void load(); api.health().then(h => setChain(h.chain)).catch(() => setChain("")); }, [load, refreshKey]);
  // The feed refreshes the grant rows; the open history has to follow it, or a
  // panel left open while the agent runs keeps showing the proposals that
  // existed when it was opened and silently omits every one since.
  const loadIntents = useCallback(async (grantId: string) => {
    try {
      const rows = await api.intents(grantId);
      setIntents(prev => ({ ...prev, [grantId]: rows }));
    } catch {
      // An empty list is the honest thing to show; the panel says so in words.
      setIntents(prev => ({ ...prev, [grantId]: prev[grantId] ?? [] }));
    }
  }, []);

  // One proposal is about five feed events, and reloading on each made the
  // panel repaint with whichever of five overlapping answers landed last. The
  // events now only ask for a reload; bursts collapse into one.
  const openGrantRef = useRef(openGrant);
  useEffect(() => { openGrantRef.current = openGrant; }, [openGrant]);
  useEffect(() => {
    const reload = coalesce(async () => {
      await load();
      if (openGrantRef.current) await loadIntents(openGrantRef.current);
    });
    const off = subscribeFeed("*", () => reload.request());
    return () => { off(); reload.cancel(); };
  }, [load, loadIntents]);

  // Starting a run or forcing an intent makes the executor spend from this
  // grant's vault, so the API asks for a session proving the caller owns it.
  // Get one on demand rather than sending the user off to find a button.
  async function withSession(owner: string) {
    if (sessionFor(owner)) return;
    await signIn(m => signMessage.dispatchAsync(m), owner);
  }

  async function run(label: string, fn: () => Promise<unknown>, owner?: string) {
    if (actionGate.current) return;
    actionGate.current = true;
    setBusy(label); setError("");
    try {
      if (owner) await withSession(owner);
      await fn();
      await load();
      playSound("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      playSound("error");
    } finally { setBusy(""); actionGate.current = false; }
  }

  async function revoke(g: Grant) {
    const owner = connected ? String(connected.account.address) : "";
    if (chain === "solana" && owner === g.owner.wallet && connected?.signer) {
      const key = `revoke:${g.id}`;
      let receipt = actionReceipt(owner, key);
      try {
        if (receipt) await checkTransaction(client, receipt);
        else {
          receipt = await sendTrackedTransaction(client, [await revokeGrantInstruction(owner, g.grantPda)], () => {}, value => {
            if (ownerRef.current !== owner) throw new Error("The connected wallet changed. Return to the original wallet to continue.");
            saveActionReceipt(owner, key, value);
          });
        }
      } catch (error) {
        if (error instanceof SettledTransactionError && error.outcome === "failed") clearActionReceipt(owner, key);
        throw error;
      }
      await api.revoke(g.id, receipt.signature);
      clearActionReceipt(owner, key);
    } else {
      await api.revoke(g.id); // mock, or headless demo owner on the server
    }
    setConfirmRevoke("");
  }

  const activeRun = (g: Grant) => g.runs?.find(r => r.status === "running");

  // Per-grant proposal history. The API has always returned this; nothing in
  // the dashboard ever asked for it, so a grant showed aggregate counters and
  // the reason behind any single decision lived only in a flat feed.
  async function toggleIntents(grantId: string) {
    if (openGrant === grantId) { setOpenGrant(""); return; }
    setOpenGrant(grantId);
    // Always refetch on open: a cached list from an earlier session of this
    // page would be missing everything the agent did since.
    await loadIntents(grantId);
  }

  return (
    <div className="grants-panel rounded-2xl overflow-hidden px-block" style={{ background: color.surface, border: `1px solid ${color.border}` }}>
      <div className="grants-header px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: color.border }}>
        <h2 className="text-sm font-semibold" style={{ ...sans, color: color.text, margin: 0 }}>{tr("Your policies")}</h2>
        <div className="grants-header-actions flex items-center gap-3">
          {/* Revoking everything belongs next to the count of what is running,
              not buried per row: it is the one control someone reaches for
              without wanting to read the page first. */}
          <EmergencyStop grants={grants} chain={chain} onDone={load} />
          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ ...mono, background: `${M}14`, color: M, border: `1px solid ${M}25` }}>
            {grants.filter(g => g.owner.wallet === owner && signedIn && !g.revoked && g.onchain?.active !== false && grantExpiresAt(g) > Date.now()).length} {tr("active")}
          </span>
        </div>
      </div>
      {!signedIn && <p className="simple-loading">{tr("Connect and sign in to manage your policies.")}</p>}
      {error && <div className="px-5 py-2 text-[13px]" role="alert" style={{ color: R }}>{tr(friendlyError(new Error(error)))}<button type="button" className="simple-secondary" onClick={() => void load()}>{tr("Refresh policies")}</button><details><summary>{tr("Technical details")}</summary>{error}</details></div>}
      {loading && <p className="simple-loading" role="status">{tr("Loading policies…")}</p>}
      {error && <ErrorHelp context={{ area: "run", message: error }} />}
      {!loading && grants.length === 0 && !error && <div className="simple-empty"><Key size={26}/><h3>{tr("No policies yet")}</h3><p>{tr("Create a policy to choose an agent, a budget and approved recipients.")}</p>{onCreate && <button type="button" className="simple-secondary" onClick={onCreate}>{tr("Create your first policy")}<ChevronRight size={15} /></button>}</div>}
      {grants.filter(g => g.owner.wallet === owner && signedIn).map(g => {
        const oc = g.onchain;
        const cap = Number(g.policyVersion.spendCapUnits);
        const spent = Number(oc?.spentUnits ?? g.spentUnits);
        const pct = cap ? Math.min(100, (spent / cap) * 100) : 0;
        const revoked = g.revoked || oc?.active === false;
        const running = activeRun(g);
        const state = policyState(g);
        const exhausted = state === "exhausted";
        // Gate 2 is EXPIRED, and until now nothing on this page said when that
        // would happen. An agent that stops because its window closed looks
        // exactly like an agent that broke.
        const expiresAt = new Date(oc ? oc.expiresAt * 1000 : grantExpiresAt(g));
        const msLeft = expiresAt.getTime() - Date.now();
        const expired = msLeft <= 0;
        const expiry = expired ? tr("expired")
          : msLeft < 3_600_000 ? `${Math.max(1, Math.round(msLeft / 60_000))}${tr("m left")}`
          : msLeft < 86_400_000 ? `${Math.round(msLeft / 3_600_000)}${tr("h left")}`
          : `${Math.round(msLeft / 86_400_000)}${tr("d left")}`;
        const expirySoon = !expired && msLeft < 3_600_000;
        const accent = revoked || expired ? R : running ? M : C;
        const dest = (JSON.parse(g.policyVersion.allowedDests) as string[])[0];
        const mint = (JSON.parse(g.policyVersion.allowedMints) as string[])[0];
        const ownerWallet = connected ? String(connected.account.address) : "";
        const isOwner = ownerWallet === g.owner.wallet;
        return (
          <div key={g.id} id={`policy-${g.id}`} tabIndex={-1} className="px-5 py-4 border-b space-y-3 ledger-row" style={{ borderColor: color.border }}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0" style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}>
                  <Key size={13} style={{ color: accent }} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-xs font-semibold leading-normal" style={{ ...sans, color: color.text }}>
                    {g.agentVersion.name} <span style={{ color: color.textDim }}>{g.agentVersion.version}</span>
                  </div>
                  <details className="grant-technical"><summary>{tr("Technical details")}</summary><div className="text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1 leading-normal" style={{ ...mono, color: C }}>
                    <CopyChip value={g.grantPda} label={`grant ${short(g.grantPda)}`} title="Copy full grant address" toastLabel={short(g.grantPda)} />
                    <span style={{ color: color.textDim }} title={g.policyVersion.policyHash}>policy {g.policyVersion.policyHash.slice(0, 8)}…</span>
                    {g.createSignature && !g.createSignature.startsWith("MOCK") && (
                      <a href={explorerTransactionUrl(g.createSignature)} target="_blank" rel="noreferrer" style={{ color: C }}>
                        explorer <ExternalLink size={9} className="inline ml-0.5" />
                      </a>
                    )}
                    <span>nonce {oc?.nextNonce ?? g.nextNonce}</span>
                  </div></details>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0" style={{ borderColor: color.border }}>
                <div className="text-left lg:text-right space-y-0.5 min-w-0">
                  <div className="text-[13px] font-semibold leading-normal" style={{ ...mono, color: A }}>
                    {fmtUsdc(spent)} / {fmtUsdc(cap)} USDC
                  </div>
                  <div className="text-[12px] leading-normal" style={{ ...mono, color: color.textDim }}>
                    {oc?.transactionCount ?? g.transactionCount}/{g.policyVersion.maxTransactions} {tr("transfers")} ·{" "}
                    <span title={`Gate 2 refuses every transfer after ${expiresAt.toLocaleString()}`} style={{ color: expired ? R : expirySoon ? A : color.textDim }}>
                      {expiry}
                    </span>
                    {g.hire && (
                      <> · <span title={`Runs under a marketplace rental ending ${new Date(g.hire.endsAt).toLocaleString()}`} style={{ color: C }}>{tr("rented")}</span></>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold shrink-0" style={{ ...mono, background: `${accent}12`, color: accent, border: `1px solid ${accent}25` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent, animation: running ? "redline-pulse 2s infinite" : "none" }} />
                  {tr(revoked ? "REVOKED" : expired ? "EXPIRED" : running ? "AGENT RUNNING" : exhausted ? "Budget or transfer limit reached" : state === "attention" ? "Needs attention" : "Ready to run")}
                </span>
              </div>
            </div>
            <div className="px-meter relative overflow-hidden" style={{ background: color.surfaceInset, height: 8 }}>
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct > 85
                    ? `linear-gradient(90deg, ${R}80, ${R})`
                    : pct > 60
                      ? `linear-gradient(90deg, ${A}80, ${A})`
                      : `linear-gradient(90deg, ${M}, #22d3ee)`,
                  boxShadow: pct > 85 ? `0 0 12px ${R}90` : pct > 60 ? `0 0 12px ${A}90` : `0 0 12px ${M}80`,
                }}
              />
            </div>
            {!revoked && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {isOwner ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Btn icon={Play} label={running ? tr("Agent running…") : tr("Start agent")} accent={M} disabled={!!running || !!busy || expired || exhausted || !!error || !chain} busy={busy === `run-${g.id}`} onClick={() => run(`run-${g.id}`, async () => {
                        const vault = await api.vault(owner);
                        if (vault.owner !== owner || vault.balanceUnits === null || BigInt(vault.balanceUnits) <= 0n) throw new Error("Your vault needs funds before starting a run. Open Vault and refresh the balance.");
                        if (ownerRef.current !== owner) throw new Error("The connected wallet changed. Return to the original wallet to continue.");
                        return api.startRun(g.id);
                      }, g.owner.wallet)} />
                      <Btn icon={ShieldOff} label={tr("Revoke access")} accent={color.blocked} disabled={!!busy} busy={busy === `revoke-${g.id}`} onClick={() => setConfirmRevoke(g.id)} />
                      {running && <Btn icon={Play} label={tr("Stop this run")} accent={C} disabled={!!busy} busy={busy === `stop-${g.id}`} onClick={() => run(`stop-${g.id}`, () => api.stopRun(running.id), g.owner.wallet)} />}
                    </div>
                    {/* Isolated Destructive / Danger Actions Zone */}
                    <details className="grant-test-tools"><summary>{tr("Test tools")}</summary>
                      <p>{tr("This sends a test transaction that should be refused by the policy. Network fees may apply.")}</p>
                      {/* Gate 6 is `spent + amount > cap`, so exactly `cap` on a
                          fresh grant is *inside* the cap: the old button sent
                          `cap` and, before the agent had spent anything, made a
                          real transfer of the whole budget. One unit past what
                          is left is the smallest amount the program must refuse. */}
                      <Btn icon={Zap} label={tr("Test an over-budget payment")} accent={color.blocked} disabled={!!busy || expired} busy={busy === `force-${g.id}`}
                        onClick={() => run(`force-${g.id}`, () => api.submitIntent({ grantId: g.id, mint, amountUnits: String(Math.max(cap - spent, 0) + 1), destination: dest, reason: "Manual over-cap attempt from dashboard", proveOnChain: true }), g.owner.wallet)} />
                    </details>
                  </>
                ) : (
                  <div className="text-[12px] py-1.5" style={{ ...mono, color: color.textMuted }}>{tr("Read-only · Connect owner wallet to manage")}</div>
                )}
              </div>
            )}
            {!revoked && (expired || exhausted || running || error || !chain) && <p className="help" role="status">{tr(expired ? "The policy has expired. Create a new one to run again." : exhausted ? "The budget or transfer limit is used up. Create a new policy." : running ? "A run is already active. Follow it in Activity." : error || !chain ? "Check the connection before starting a run." : "The test attempts up to three payments. Your signed limits still apply. Network fees may apply.")}</p>}
            {isOwner && <a className="simple-secondary p2-copy-link" href={`#/guardrails?copy=${encodeURIComponent(g.id)}`}>{tr("Create new from this policy")}</a>}
            {running && <p className="help">{tr("Stopping the run keeps its spending permission. Revoke access to end that permission.")}</p>}
            {confirmRevoke === g.id && <section className="p0-confirm" aria-label={tr("Confirm revocation")}><h3>{tr("Confirm revocation")} · {g.agentVersion.name}</h3><code>{g.grantPda}</code><p>{tr("This ends the agent's permission after network confirmation. It does not withdraw funds. To grant access again, create a new policy.")}</p><button type="button" className="simple-secondary" disabled={!!busy} onClick={() => setConfirmRevoke("")}>{tr("Cancel")}</button><button type="button" className="simple-primary" disabled={!!busy} onClick={() => void run(`revoke-${g.id}`, () => revoke(g), owner)}>{tr("Yes, revoke this policy")}</button></section>}

            <button type="button" onClick={() => void toggleIntents(g.id)} aria-expanded={openGrant === g.id}
              className="flex items-center gap-1.5 text-[12px] pt-0.5" style={{ ...mono, color: color.textDim }}>
              <ChevronRight size={11} style={{ transform: openGrant === g.id ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
              {openGrant === g.id ? tr("Hide") : tr("Show")} {tr("every proposal this agent made")}
            </button>

            {openGrant === g.id && (
              <div className="rounded-xl overflow-hidden" style={{ background: color.surfaceSubtle, border: `1px solid ${color.border}` }}>
                {!intents[g.id] ? (
                  <div className="px-3 py-3 text-[12px] flex items-center gap-2" style={{ ...mono, color: color.textDim }}><LoaderCircle size={11} className="animate-spin" /> {tr("loading…")}</div>
                ) : intents[g.id].length === 0 ? (
                  <div className="px-3 py-3 text-[12px]" style={{ ...mono, color: color.textDim }}>{tr("No proposals yet — start the agent, or force one over the cap.")}</div>
                ) : intents[g.id].map(it => {
                  const d = it.decision;
                  const tx = d?.chainTx;
                  // The precheck is advisory; the chain is the authority. Show
                  // both, because a disagreement between them is the single
                  // most interesting thing this table could ever display.
                  const allowed = tx ? tx.result === "success" : d?.allow;
                  const colour = allowed ? M : R;
                  return (
                    <div key={it.id} className="px-3 py-2 border-b last:border-0 flex items-center gap-3" style={{ borderColor: color.border }}>
                      <span className="text-[12px] w-8 shrink-0" style={{ ...mono, color: color.textDim }}>#{it.nonce}</span>
                      <span className="text-[12px] shrink-0" style={{ ...mono, color: color.textSecondary }}>{fmtUsdc(it.amountUnits)} USDC</span>
                      <span className="text-[12px] shrink-0" style={{ ...mono, color: color.textDim }}>→ {short(it.destination, 4)}</span>
                      <span className="text-[12px] flex-1 truncate" style={{ ...sans, color: color.textDim }} title={it.reason}>{it.reason}</span>
                      <span className="text-[12px] px-1.5 py-0.5 rounded-md shrink-0" style={{ ...mono, background: `${colour}12`, color: colour, border: `1px solid ${colour}25` }}>
                        {tx ? (tx.result === "success" ? tr("moved") : d?.reasonCode ?? tr("refused")) : d ? (d.allow ? tr("passed precheck") : d.reasonCode) : tr("pending")}
                      </span>
                      {tx?.signature && !tx.signature.startsWith("MOCK") && (
                        <a href={explorerTransactionUrl(tx.signature)} target="_blank" rel="noreferrer" className="shrink-0" style={{ color: C }} title="Open this transaction on Solana Explorer">
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Btn({ icon: Icon, label, accent, onClick, disabled, busy }: { icon: React.ElementType; label: string; accent: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="px-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold disabled:opacity-40"
      style={{ ...sans, background: `${accent}12`, border: `1px solid ${accent}30`, color: accent }}>
      {busy ? <LoaderCircle size={11} className="animate-spin" /> : <Icon size={11} />}{label}
    </button>
  );
}
