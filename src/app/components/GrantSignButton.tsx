import { useEffect, useState } from "react";
import { address } from "@solana/kit";
import { useConnectedWallet, useSignMessage } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { CheckCircle2, ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { AgentPolicyInput, RiskAssessment } from "../lib/risk-engine";
import { api, isSignedIn, type Health } from "../lib/api";
import { signIn } from "../lib/signin";
import type { AppClient } from "../solana/client";
import { explorerTransactionUrl } from "../solana/client";
import { createGrantInstruction, findVaultPda, initVaultInstruction, policyHashHex, randomAgentId, toHex } from "../solana/redline";
import { color } from "../theme";
import { useT } from "../i18n/LanguageContext";
import { isAddressLike } from "../solana/client";
import { playSound } from "../lib/soundscape";

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`, this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  "API unreachable": "Không kết nối được API",

  "Grant live on Devnet": "Grant đã hoạt động trên Devnet",
  "Grant not created": "Không tạo được Grant",
  "Transaction was rejected or could not reach Solana Devnet.": "Giao dịch bị từ chối hoặc không kết nối được với Solana Devnet.",

  "View create_grant on Solana Explorer": "Xem create_grant trên Solana Explorer",
  "Open Agent Guardrails → Active Policy Accounts to start the agent.": "Mở Agent Guardrails → Active Policy Accounts để khởi động agent.",

  "Backend offline": "Backend ngoại tuyến",
  "Connect wallet to sign grant": "Kết nối ví để ký grant",
  "Blocked by risk policy": "Bị chặn bởi chính sách rủi ro",
  "Add a valid destination address": "Thêm một địa chỉ đích hợp lệ",
  "Accept the flagged risk to continue": "Chấp nhận rủi ro được cảnh báo để tiếp tục",
  "Creating vault…": "Đang tạo vault…",
  "Sign create_grant…": "Đang ký create_grant…",
  "Registering…": "Đang đăng ký…",
  "Sign & create on-chain grant": "Ký & tạo Grant on-chain",

  "Plain-Language Authority Summary": "Tóm tắt quyền hạn bằng ngôn ngữ đơn giản",
  "You are granting": "Bạn đang cấp cho",
  "authority to spend up to": "quyền chi tiêu tối đa",
  "in total over": "trong tổng cộng",
  "(max": "(tối đa",
  "cooldown).": "cooldown).",
  "Funds can": "Tiền chỉ có thể",
  "only": "được",
  "be transferred to": "chuyển tới",
  "specified destination(s)": "địa chỉ đích được chỉ định",
  "allowlisted addresses": "các địa chỉ trong allowlist",

  "Copilot Verdict:": "Kết luận của Copilot:",
  "Rules verified against safety guidelines.": "Đã xác minh các quy tắc theo hướng dẫn an toàn.",

  "This policy was rated": "Chính sách này được đánh giá là",
  ": the risk engine wants a person to approve it before it is signed. I have read the findings above and accept this risk. Your acceptance is recorded in the audit trail against this grant.":
    ": công cụ đánh giá rủi ro yêu cầu một người phê duyệt trước khi ký. Tôi đã đọc các phát hiện ở trên và chấp nhận rủi ro này. Việc chấp nhận của bạn được ghi lại trong audit trail của grant này.",

  "Connecting to REDLINE API…": "Đang kết nối tới REDLINE API…",
  "Sign in with wallet…": "Đang đăng nhập bằng ví…",
  "Checking eligibility…": "Đang kiểm tra điều kiện…",
  "Sign in, then sign & create on-chain grant": "Đăng nhập, rồi ký & tạo Grant on-chain",
  "Lifetime clamped to the rental:": "Thời hạn được rút ngắn theo hợp đồng thuê:",
};

const ACCENT = color.primary;
const CYAN = color.info;
const USDC_MINT = import.meta.env.VITE_DEMO_USDC_MINT ?? "";

// Owner-side flow, all signed in the browser wallet:
//   1. init_vault if this wallet has no vault yet (+ ask the API to mint demo USDC into it)
//   2. create_grant with the reviewed policy's hash and limits
//   3. tell the API the grant exists (grantPda + signature) so the runtime can use it
// The backend never sees the owner's key.
export function GrantSignButton({ policy, assessment, destinations, destinationsInvalid, agentVersionId, hireId, onCreated }: { policy: AgentPolicyInput; assessment: RiskAssessment | null; destinations: string[]; destinationsInvalid: boolean; agentVersionId: string | null; hireId: string | null; onCreated?: (grantId: string) => void }) {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const signMessage = useSignMessage(client);
  const [health, setHealth] = useState<Health | null>(null);
  const [apiError, setApiError] = useState("");
  const [phase, setPhase] = useState<"idle" | "signin" | "preflight" | "vault" | "grant" | "register" | "done">("idle");
  const [clampedHours, setClampedHours] = useState<number | null>(null);
  const [signature, setSignature] = useState("");
  const [grantId, setGrantId] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const blocked = assessment?.decision === "BLOCK";
  // The copilot is told REVIEW means a human must approve. Until this feature
  // that verdict only tinted the panel, so a policy the engine wanted a person
  // to look at could be signed without anyone confirming they had.
  const needsAcceptance = assessment?.decision === "REVIEW";
  const held = needsAcceptance && !accepted;
  const configurationError = !isAddressLike(USDC_MINT) ? "Demo USDC mint is missing or invalid" : "";

  // A fresh assessment is a fresh decision to make.
  useEffect(() => { setAccepted(false); }, [assessment]);

  useEffect(() => {
    api.health().then(setHealth).catch(e => setApiError(e instanceof Error ? e.message : tr("API unreachable")));
  }, []);

  async function sign() {
    if (!connected?.signer || blocked || held || destinationsInvalid || configurationError || !health) return;
    setError("");
    setClampedHours(null);
    const owner = String(connected.account.address);
    try {
      // 0. identity and eligibility, before the wallet is asked to sign
      //    anything on-chain. Every call below needs a session on a public
      //    deployment; without one they came back 401 *after* create_grant
      //    had landed, leaving an orphan grant nobody could register.
      if (!isSignedIn(owner)) {
        setPhase("signin");
        await signIn(m => signMessage.dispatchAsync(m), owner);
      }
      setPhase("preflight");
      const allowedMints = [USDC_MINT];
      // The owner's list, capped at what the Grant account can hold.
      const allowedDestinations = destinations.slice(0, 4);
      // Bind the grant to the version the owner chose. Falling back to
      // whichever agent happened to be published first would record a policy
      // against a build nobody authorised.
      const agentVersion = agentVersionId
        ?? (await api.publishAgent({ name: policy.agentName, version: "v0.1.0", strategy: policy.strategy, modelRef: "openai:gpt-5.4-mini", codeRef: "git:redline-runtime@main" })).agent.id;
      const preflight = await api.preflightGrant({ ownerWallet: owner, agentVersionId: agentVersion, hireId: hireId ?? undefined, policy: { ...policy, allowedMints, allowedDestinations } });
      // A rented agent's authority ends with the rental, so the window the
      // wallet signs is the requested lifetime clamped to what is left of it.
      const durationHours = preflight.durationHours;
      if (durationHours !== policy.durationHours) setClampedHours(durationHours);
      const full = { ...policy, durationHours, allowedMints, allowedDestinations };

      // 1. vault
      setPhase("vault");
      const vaultPda = await findVaultPda(owner);
      const { value: vaultAccount } = await client.rpc.getAccountInfo(address(vaultPda), { encoding: "base64" }).send();
      if (!vaultAccount) await client.sendTransaction([await initVaultInstruction(owner)]);
      // Fund on balance, not on "the vault is new". An init that landed while
      // its funding call did not leaves a vault with no token account at all,
      // and execute_transfer then fails on vault_token_account with
      // AccountNotInitialized — every later attempt would skip funding again.
      const vault = await api.vault(owner);
      if (vault.balanceUnits === null || BigInt(vault.balanceUnits) === 0n) {
        await api.fundVault(owner); // demo USDC so the agent has something to move
      }

      // 2. grant
      setPhase("grant");
      const agentId = randomAgentId();
      const hash = await policyHashHex(full);
      const now = Math.floor(Date.now() / 1000);
      const { instruction, grantPda } = await createGrantInstruction({
        owner, executor: health.executor, agentId, policyHashHex: hash,
        spendCapUnits: BigInt(Math.round(policy.spendCapUsdc * 1_000_000)),
        maxTransactions: policy.maxTransactions,
        expiresAt: now + durationHours * 3600,
        cooldownSeconds: policy.cooldownMinutes * 60,
        allowedMints, allowedDestinations,
      });
      const result = await client.sendTransaction([instruction]);
      const sig = String(result.context.signature);
      setSignature(sig);

      // 3. register
      setPhase("register");
      const created = await api.createGrant({ ownerWallet: owner, vaultPda, agentVersionId: agentVersion, grantPda, createSignature: sig, agentId: toHex(agentId), policy: full, riskAcknowledged: needsAcceptance ? accepted : undefined, hireId: preflight.hireId ?? hireId ?? undefined });
      setGrantId(created.grant.id);
      setPhase("done");
      playSound("success");
      onCreated?.(created.grant.id);
      toast.success(tr("Grant live on Devnet"), { description: `id ${created.grant.id.slice(-6)} · ${policy.spendCapUsdc} USDC cap` });
    } catch (e) {
      setPhase("idle");
      const message = e instanceof Error ? e.message : tr("Transaction was rejected or could not reach Solana Devnet.");
      setError(message);
      playSound("error");
      toast.error(tr("Grant not created"), { description: message });
    }
  }

  if (phase === "done") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold" style={{ color: ACCENT, background: `${ACCENT}12`, border: `1px solid ${ACCENT}30` }}>
          <CheckCircle2 size={13} /> {tr("Grant live on Devnet")} · id {grantId.slice(-6)}
        </div>
        <a className="flex items-center justify-center gap-1 text-[12px]" style={{ color: CYAN }} href={explorerTransactionUrl(signature)} target="_blank" rel="noreferrer">
          {tr("View create_grant on Solana Explorer")} <ExternalLink size={10} />
        </a>
        <p className="text-[12px] text-center" style={{ color: color.textDim }}>{tr("Open Agent Guardrails → Active Policy Accounts to start the agent.")}</p>
      </div>
    );
  }

  const label = apiError ? tr("Backend offline") : configurationError || (!connected ? tr("Connect wallet to sign grant")
    : blocked ? tr("Blocked by risk policy")
    : destinationsInvalid ? tr("Add a valid destination address")
    : held ? tr("Accept the flagged risk to continue")
    : phase === "signin" ? tr("Sign in with wallet…") : phase === "preflight" ? tr("Checking eligibility…")
    : phase === "vault" ? tr("Creating vault…") : phase === "grant" ? tr("Sign create_grant…") : phase === "register" ? tr("Registering…")
    : isSignedIn(String(connected.account.address)) ? tr("Sign & create on-chain grant") : tr("Sign in, then sign & create on-chain grant"));
  const busy = phase !== "idle";

  return (
    <div className="space-y-2">
      {/* Plain Language Authority Summary (Rule 6) */}
      <div className="p-3 rounded-xl space-y-1.5" style={{ background: color.surfaceSubtle, border: `1px solid ${color.border}` }}>
        <div className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: color.text }}>
          📋 {tr("Plain-Language Authority Summary")}
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: color.textMuted }}>
          {tr("You are granting")} <strong>{policy.agentName || "Agent"}</strong> {tr("authority to spend up to")} <strong className="font-mono" style={{ color: color.text }}>{policy.spendCapUsdc} USDC</strong> {tr("in total over")} <strong>{policy.durationHours} hours</strong> {tr("(max")} <strong className="font-mono" style={{ color: color.text }}>{policy.maxTransactions} txs</strong>, <strong>{policy.cooldownMinutes} min</strong> {tr("cooldown).")} {tr("Funds can")} <em>{tr("only")}</em> {tr("be transferred to")} {destinations.length > 0 ? `${destinations.length} ${tr("specified destination(s)")}` : tr("allowlisted addresses")}.
        </p>
        {assessment && (
          <div className="text-[12px] pt-1 flex items-start gap-1.5 border-t" style={{ borderColor: color.border, color: assessment.decision === "BLOCK" ? color.danger : assessment.decision === "REVIEW" ? color.warn : color.verified }}>
            <span className="font-semibold font-mono">{tr("Copilot Verdict:")} [{assessment.decision}]</span>
            <span className="truncate flex-1">— {assessment.summary || tr("Rules verified against safety guidelines.")}</span>
          </div>
        )}
      </div>

      {needsAcceptance && (
        <label className="flex items-start gap-2 p-3 rounded-xl cursor-pointer" style={{ background: "#f59e0b0b", border: "1px solid #f59e0b30" }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 accent-amber-500" />
          <span className="text-[12px] leading-relaxed" style={{ color: color.warn }}>
            {tr("This policy was rated")} <strong>REVIEW</strong>{tr(": the risk engine wants a person to approve it before it is signed. I have read the findings above and accept this risk. Your acceptance is recorded in the audit trail against this grant.")}
          </span>
        </label>
      )}
      <button type="button" onClick={sign} disabled={!connected?.signer || busy || blocked || held || destinationsInvalid || !!apiError || !!configurationError || !health}
        className="btn-radiant w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${ACCENT}dd, ${CYAN}cc)`, color: color.bg }}>
        {busy ? <LoaderCircle size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        {label}
      </button>
      <p className="text-[12px] text-center" style={{ color: color.textDim }}>
        {health ? `Program ${health.programId.slice(0, 6)}… · executor ${health.executor.slice(0, 6)}… · ${health.chain}` : apiError ? `API: ${apiError}` : tr("Connecting to REDLINE API…")}
      </p>
      {clampedHours !== null && (
        <p role="status" className="text-[12px] text-center" style={{ color: color.warn }}>
          {tr("Lifetime clamped to the rental:")} {clampedHours}h
        </p>
      )}
      {error && <p role="alert" className="text-[12px] text-center" style={{ color: color.danger }}>{error}</p>}
    </div>
  );
}
