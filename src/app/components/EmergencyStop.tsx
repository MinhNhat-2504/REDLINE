import { useState } from "react";
import { useConnectedWallet, useSignMessage } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { AlertTriangle, LoaderCircle, ShieldOff } from "lucide-react";
import { api, type Grant } from "../lib/api";
import {
  describeStopPlan,
  describeStopResult,
  planEmergencyStop,
  type StopResult,
  type StoppableGrant,
} from "../lib/emergency-stop";
import { sessionFor, signIn } from "../lib/signin";
import type { AppClient } from "../solana/client";
import { emergencyStopInstructions } from "../solana/redline";
import { color, mono, sans } from "../theme";
import { playSound } from "../lib/soundscape";
import { useLang, useT } from "../i18n/LanguageContext";

const R = color.danger;

const VI: Record<string, string> = {
  "Stop all agents": "Dừng tất cả agent",
  "Cancel": "Hủy",
  "Yes, revoke everything": "Có, thu hồi tất cả",
  "Stopping…": "Đang dừng…",
  "This cannot be undone. A stopped grant cannot be restarted — you would sign a new policy.":
    "Không thể hoàn tác. Grant đã dừng không khởi động lại được — bạn sẽ phải ký một chính sách mới.",
};

/**
 * One control that takes every agent's authority away at once.
 *
 * REDLINE's whole argument is that the chain, not the dashboard, decides what
 * an agent may do. That holds while things are going well. It also has to hold
 * at the moment someone decides they want everything to stop — and until now
 * that meant revoking grants one at a time, one wallet prompt each, which is
 * exactly the wrong shape for the one action people take under pressure.
 *
 * The revocations still go through the program, signed by the owner. Nothing
 * here is a kill switch the operator holds over a user's funds: it is the
 * owner's own signature, batched.
 */
export function EmergencyStop({ grants, chain, onDone }: {
  grants: Grant[];
  chain: "mock" | "solana" | "";
  onDone: () => void | Promise<void>;
}) {
  const tr = useT(VI);
  const { lang } = useLang();
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const signMessage = useSignMessage(client);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<StopResult | null>(null);

  const owner = connected ? String(connected.account.address) : "";
  // Only this wallet's grants. Someone else's grant is not ours to revoke and
  // the program would refuse the signature anyway — but showing it in the count
  // would promise something this button cannot deliver.
  const mine: StoppableGrant[] = grants
    .filter(g => owner && g.owner.wallet === owner)
    .map(g => ({ id: g.id, grantPda: g.grantPda, revoked: g.revoked || g.onchain?.active === false }));
  const plan = planEmergencyStop(mine);

  // After a successful stop there is nothing left to stop — but the outcome
  // still has to be readable, so the result keeps the component on screen.
  if (!owner || (plan.total === 0 && !result)) return null;

  async function stop() {
    setBusy("stopping");
    let revoked = 0, failed = 0, unrecorded = 0;
    let error: string | null = null;
    try {
      if (!sessionFor(owner)) await signIn(m => signMessage.dispatchAsync(m), owner);
      // Stop the scripted runs first. A run that keeps proposing transfers while
      // the revocations confirm would add rows the owner did not ask for; they
      // would all be refused, but the audit trail should not record an agent
      // still trying after its owner pressed stop.
      await Promise.all(grants
        .filter(g => g.owner.wallet === owner)
        .flatMap(g => (g.runs ?? []).filter(r => r.status === "running").map(r => api.stopRun(r.id).catch(() => {}))));

      for (const [i, batch] of plan.batches.entries()) {
        setBusy(plan.batches.length > 1 ? `signature ${i + 1} of ${plan.batches.length}` : "stopping");
        let signature: string | undefined;
        try {
          if (chain === "solana" && connected?.signer) {
            const sent = await client.sendTransaction(await emergencyStopInstructions(owner, batch.map(g => g.grantPda)));
            signature = String(sent.context.signature);
          }
        } catch (e) {
          // The transaction never landed, so nothing in this batch was revoked.
          failed += batch.length;
          error ??= e instanceof Error ? e.message : String(e);
          continue;
        }
        for (const g of batch) {
          try {
            await api.revoke(g.id, signature);
            revoked += 1;
          } catch (e) {
            // On Solana the program has already accepted the revocation — this
            // grant is dead whatever the API says. On mock there is no chain, so
            // a failure here is the real failure.
            if (chain === "solana" && signature) unrecorded += 1;
            else failed += 1;
            error ??= e instanceof Error ? e.message : String(e);
          }
        }
      }
      setResult({ revoked: revoked + unrecorded, failed, error, unrecorded });
      playSound(failed > 0 ? "error" : "success");
    } catch (e) {
      // Signing in failed, or the wallet was closed: nothing was attempted.
      setResult({ revoked: 0, failed: plan.total, error: e instanceof Error ? e.message : String(e) });
      playSound("error");
    } finally {
      setBusy("");
      setConfirming(false);
      await onDone();
    }
  }

  return (
    <div className="emergency-stop">
      {!confirming && plan.total > 0 && (
        <button
          type="button"
          className="emergency-stop-trigger"
          style={{ ...sans }}
          onClick={() => { setResult(null); setConfirming(true); }}
          disabled={!!busy}
        >
          <ShieldOff size={13} />
          {tr("Stop all agents")}
          <span style={{ ...mono }}>{plan.total}</span>
        </button>
      )}

      {confirming && (
        <div className="emergency-stop-confirm" role="alertdialog" aria-label="Confirm emergency stop">
          <p><AlertTriangle size={14} style={{ color: R }} /> {describeStopPlan(plan, lang)}</p>
          <small>{tr("This cannot be undone. A stopped grant cannot be restarted — you would sign a new policy.")}</small>
          <div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={!!busy}>
              {tr("Cancel")}
            </button>
            <button type="button" className="emergency-stop-go" onClick={() => void stop()} disabled={!!busy}>
              {busy ? <><LoaderCircle size={12} className="animate-spin" /> {busy === "stopping" ? tr("Stopping…") : busy}</> : tr("Yes, revoke everything")}
            </button>
          </div>
        </div>
      )}

      {result && !confirming && (
        <p className={`emergency-stop-result${result.failed > 0 ? " is-bad" : ""}`} role="status">
          {describeStopResult(result, lang)}
        </p>
      )}
    </div>
  );
}
