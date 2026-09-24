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
import { PolicyDeck, VoxelStack } from "./depth";
import { useT } from "../i18n/LanguageContext";
import { playSound } from "../lib/soundscape";

const M = color.primary, C = color.info, A = color.warn, R = color.danger;

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`; this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  "Grants": "Tài Khoản Chính Sách Đang Hoạt Động",
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
export function GrantsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const signMessage = useSignMessage(client);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [chain, setChain] = useState<"mock" | "solana" | "">("");
  const [openGrant, setOpenGrant] = useState("");
  const [intents, setIntents] = useState<Record<string, IntentRow[]>>({});

  // What is on screen, readable from inside `load` without making it depend
  // on state (which would re-subscribe the feed on every refresh).
  const grantsRef = useRef<Grant[]>([]);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const list = await api.grants();
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
      if (seq !== loadSeq.current) return;
      const merged = mergeGrants(grantsRef.current, withChain);
      grantsRef.current = merged;
      setGrants(merged);
      setError("");
    } catch (e) {
      if (seq === loadSeq.current) setError(e instanceof Error ? e.message : "API unreachable");
    }
  }, []);

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
    setBusy(label); setError("");
    try {
      if (owner) await withSession(owner);
      await fn();
      await load();
      playSound("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      playSound("error");
    } finally { setBusy(""); }
  }

  async function revoke(g: Grant) {
    const owner = connected ? String(connected.account.address) : "";
    if (chain === "solana" && owner === g.owner.wallet && connected?.signer) {
      const result = await client.sendTransaction([await revokeGrantInstruction(owner, g.grantPda)]);
      await api.revoke(g.id, String(result.context.signature));
    } else {
      await api.revoke(g.id); // mock, or headless demo owner on the server
    }
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
    <div className="rounded-2xl overflow-hidden px-block" style={{ background: color.surface, border: `1px solid ${color.border}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: color.border }}>
        <span className="text-sm font-semibold inline-flex items-center gap-3" style={{ ...sans, color: color.text }}><VoxelStack size={13} />{tr("Grants")}</span>
        <div className="flex items-center gap-3">
          {/* Revoking everything belongs next to the count of what is running,
              not buried per row: it is the one control someone reaches for
              without wanting to read the page first. */}
          <EmergencyStop grants={grants} chain={chain} onDone={load} />
          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ ...mono, background: `${M}14`, color: M, border: `1px solid ${M}25` }}>
            {grants.filter(g => !g.revoked).length} {tr("active")} · {chain || tr("api offline")}
          </span>
        </div>
      </div>
      {error && <div className="px-5 py-2 text-[13px]" style={{ ...mono, color: R }}>{error}</div>}
      {/* The same grants as physical policy cards — click one to open its proposals below */}
      <PolicyDeck grants={grants} selected={openGrant} onSelect={id => void toggleIntents(id)} tr={tr} />
      {grants.length === 0 && !error && <div className="policy-empty"><Key size={36}/><h3>Your next boundary starts here.</h3><p>No grants are recorded yet. Select an agent and define its limits in the policy builder.</p><span>OWNER SIGNATURE · SEVEN GATES · ONE TRANSACTION</span></div>}
      {grants.map(g => {
        const oc = g.onchain;
        const cap = Number(g.policyVersion.spendCapUnits);
        const spent = Number(oc?.spentUnits ?? g.spentUnits);
        const pct = cap ? Math.min(100, (spent / cap) * 100) : 0;
        const revoked = g.revoked || oc?.active === false;
        const running = activeRun(g);
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
          <div key={g.id} className="px-5 py-4 border-b space-y-3 ledger-row" style={{ borderColor: color.border }}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0" style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}>
                  <Key size={13} style={{ color: accent }} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-xs font-semibold leading-normal" style={{ ...sans, color: color.text }}>
                    {g.agentVersion.name} <span style={{ color: color.textDim }}>{g.agentVersion.version}</span>
                  </div>
                  <div className="text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1 leading-normal" style={{ ...mono, color: C }}>
                    <CopyChip value={g.grantPda} label={`grant ${short(g.grantPda)}`} title="Copy full grant address" toastLabel={short(g.grantPda)} />
                    <span style={{ color: color.textDim }} title={g.policyVersion.policyHash}>policy {g.policyVersion.policyHash.slice(0, 8)}…</span>
                    {g.createSignature && !g.createSignature.startsWith("MOCK") && (
                      <a href={explorerTransactionUrl(g.createSignature)} target="_blank" rel="noreferrer" style={{ color: C }}>
                        explorer <ExternalLink size={9} className="inline ml-0.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0" style={{ borderColor: color.border }}>
                <div className="text-left lg:text-right space-y-0.5 min-w-0">
                  <div className="text-[13px] font-semibold leading-normal" style={{ ...mono, color: A }}>
                    {fmtUsdc(spent)} / {fmtUsdc(cap)} USDC
                  </div>
                  <div className="text-[12px] leading-normal" style={{ ...mono, color: color.textDim }}>
                    tx {oc?.transactionCount ?? g.transactionCount}/{g.policyVersion.maxTransactions} · nonce {oc?.nextNonce ?? g.nextNonce} ·{" "}
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
                  {revoked ? "REVOKED" : expired ? "EXPIRED" : running ? "AGENT RUNNING" : "ACTIVE"}
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
                      <Btn icon={Play} label={running ? tr("Agent running…") : tr("Start agent (scripted)")} accent={M} disabled={!!running || !!busy} busy={busy === `run-${g.id}`} onClick={() => run(`run-${g.id}`, () => api.startRun(g.id), g.owner.wallet)} />
                    </div>
                    {/* Isolated Destructive / Danger Actions Zone */}
                    <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: color.border }}>
                      <span className="text-[12px] font-mono text-slate-500 uppercase tracking-wider hidden sm:inline">{tr("Stress Test & Revoke:")}</span>
                      {/* Gate 6 is `spent + amount > cap`, so exactly `cap` on a
                          fresh grant is *inside* the cap: the old button sent
                          `cap` and, before the agent had spent anything, made a
                          real transfer of the whole budget. One unit past what
                          is left is the smallest amount the program must refuse. */}
                      <Btn icon={Zap} label={`${tr("Force")} >${fmtUsdc(Math.max(cap - spent, 0))} ${tr("USDC (over cap)")}`} accent={color.blocked} disabled={!!busy} busy={busy === `force-${g.id}`}
                        onClick={() => run(`force-${g.id}`, () => api.submitIntent({ grantId: g.id, mint, amountUnits: String(Math.max(cap - spent, 0) + 1), destination: dest, reason: "Manual over-cap attempt from dashboard", proveOnChain: true }), g.owner.wallet)} />
                      <Btn icon={ShieldOff} label={tr("Revoke")} accent={color.blocked} disabled={!!busy} busy={busy === `revoke-${g.id}`} onClick={() => run(`revoke-${g.id}`, () => revoke(g))} />
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] py-1.5" style={{ ...mono, color: color.textMuted }}>{tr("Read-only · Connect owner wallet to manage")}</div>
                )}
              </div>
            )}

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
