import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Circle, FlaskConical, X } from "lucide-react";
import { api, isSignedIn, loadSession, type AuditRow, type Grant } from "../lib/api";
import { VoxelStack } from "./depth";
import { useT } from "../i18n/LanguageContext";

// deriveProgress stays in English so its tests read as written; the component
// translates at the point of display.
const VI: Record<string, string> = {
  "Sign a boundary": "Ký một ranh giới",
  "Guardrails → build a policy → Sign & create on-chain grant. Use a small cap: 500 USDC, 5 transfers.": "Guardrails → tạo chính sách → Ký & tạo grant on-chain. Dùng hạn mức nhỏ: 500 USDC, 5 lệnh chuyển.",
  "Connect a Devnet wallet and sign in from the top bar, then open Guardrails.": "Kết nối ví Devnet và đăng nhập từ thanh trên cùng, rồi mở Guardrails.",
  "The wallet signs once. From here the limits live on Solana, not in this dashboard.": "Ví ký một lần. Từ đây giới hạn nằm trên Solana, không phải trong dashboard này.",
  "Let the agent operate": "Để agent hoạt động",
  "On the grant you just made, press Start agent. It proposes transfers inside the policy.": "Trên grant vừa tạo, bấm Start agent. Nó sẽ đề xuất các lệnh chuyển trong phạm vi chính sách.",
  "Counters move on the grant itself — they are read back from the chain, not from the server.": "Bộ đếm thay đổi ngay trên grant — đọc lại từ chain, không phải từ server.",
  "Watch the chain refuse one": "Xem chain từ chối một lệnh",
  "On the grant, press Force over-cap. It proposes one unit more than the grant has left and sends it straight to Solana.": "Trên grant, bấm Force over-cap. Nó đề xuất nhiều hơn đúng một đơn vị so với số còn lại và gửi thẳng lên Solana.",
  "The transaction lands on Solana and fails with SPEND_CAP_EXCEEDED. Open the explorer link: the token balances before and after are identical. Nothing moved.": "Giao dịch lên Solana và thất bại với SPEND_CAP_EXCEEDED. Mở link explorer: số dư token trước và sau y hệt nhau. Không gì dịch chuyển.",
  "Take the authority back": "Thu hồi quyền",
  "Revoke the grant from your wallet, then let the agent try again.": "Revoke grant từ ví của bạn, rồi để agent thử lại.",
  "It now fails with Revoked. The owner did not ask the agent to stop — the program stopped accepting it.": "Giờ nó thất bại với Revoked. Chủ sở hữu không yêu cầu agent dừng — program ngừng chấp nhận nó.",
  "Guided demo": "Demo có hướng dẫn",
  "FOUR MINUTES": "BỐN PHÚT",
  "See the chain refuse a transfer": "Xem chain từ chối một lệnh chuyển",
  "You have seen the whole path. Every step above is backed by a real transaction.": "Bạn đã đi hết đường. Mỗi bước ở trên đều có giao dịch thật làm bằng chứng.",
  "Four steps. Each one ticks itself only when the records say it happened.": "Bốn bước. Mỗi bước chỉ tự đánh dấu khi bản ghi cho thấy nó đã xảy ra.",
  "Hide the guided demo": "Ẩn hướng dẫn demo",
  "No wallet to hand?": "Không có ví sẵn?",
  "Policy Lab": "Policy Lab",
  "below runs the same seven gates as a simulation — no wallet, no transaction, nothing written down. The steps here need a Devnet wallet because they put real records on Solana.": "bên dưới chạy cùng bảy gate dưới dạng mô phỏng — không ví, không giao dịch, không ghi gì cả. Các bước ở đây cần ví Devnet vì chúng ghi bản ghi thật lên Solana.",
  "Go": "Đi",
};

// A path through the demo, driven by what has actually happened.
//
// The dashboard has twelve routes. Someone seeing it for the first time — a
// judge with four minutes — lands on Protocol and has to work out for
// themselves that the story is Guardrails, then a run, then the Audit trail.
// Most will not, and the one thing worth seeing is the one thing they miss.
//
// This is not a scripted tour. Every step reads real records and marks itself
// done only when the chain says so, which is the same standard the rest of the
// product holds itself to: a checklist that ticked itself on a timer would be
// exactly the kind of decorative progress REDLINE argues against.

const DISMISSED_KEY = "redline.demoGuide.dismissed";

export interface DemoStep {
  key: string;
  title: string;
  detail: string;
  /** What to look for once you are there — the part a tour usually forgets. */
  look: string;
  /** Route slug, not an index: the shell still maps legacy indices through a
   *  compatibility table, so a number here would not mean what it reads. */
  slug: string;
  done: boolean;
}

export interface DemoProgress {
  steps: DemoStep[];
  completed: number;
  signedIn: boolean;
}

/**
 * Work out where the visitor is from records, not from clicks.
 *
 * Exported and pure so the rules are testable: "the chain refused something"
 * has to mean a real rejection, and nothing else.
 */
export function deriveProgress(grants: Grant[], audit: AuditRow[], signedIn: boolean): DemoProgress {
  const hasGrant = grants.length > 0;
  const ran = audit.some(row => row.eventType === "run.started" || row.eventType === "intent.created");
  // The moment the whole product exists for: a proposal the program refused.
  // Only an on-chain rejection counts — a local precheck is the server's
  // opinion, and the claim being demonstrated is that the chain decides.
  const refused = audit.some(row =>
    row.eventType === "tx.rejected" ||
    row.eventType === "chain.tx_failed" ||
    row.eventType === "swap.reverted");
  const revoked = grants.some(g => g.revoked) || audit.some(row => row.eventType === "grant.revoked");

  const steps: DemoStep[] = [
    {
      key: "grant",
      title: "Sign a boundary",
      detail: signedIn
        ? "Guardrails → build a policy → Sign & create on-chain grant. Use a small cap: 500 USDC, 5 transfers."
        : "Connect a Devnet wallet and sign in from the top bar, then open Guardrails.",
      look: "The wallet signs once. From here the limits live on Solana, not in this dashboard.",
      slug: "guardrails",
      done: hasGrant,
    },
    {
      key: "run",
      title: "Let the agent operate",
      detail: "On the grant you just made, press Start agent. It proposes transfers inside the policy.",
      look: "Counters move on the grant itself — they are read back from the chain, not from the server.",
      slug: "guardrails",
      done: ran,
    },
    {
      key: "refused",
      title: "Watch the chain refuse one",
      detail: "On the grant, press Force over-cap. It proposes one unit more than the grant has left and sends it straight to Solana.",
      look: "The transaction lands on Solana and fails with SPEND_CAP_EXCEEDED. Open the explorer link: the token balances before and after are identical. Nothing moved.",
      slug: "guardrails",
      done: refused,
    },
    {
      key: "revoke",
      title: "Take the authority back",
      detail: "Revoke the grant from your wallet, then let the agent try again.",
      look: "It now fails with Revoked. The owner did not ask the agent to stop — the program stopped accepting it.",
      slug: "guardrails",
      done: revoked,
    },
  ];
  return { steps, completed: steps.filter(s => s.done).length, signedIn };
}

export function DemoGuide({ navigate }: { navigate?: (slug: string) => void }) {
  const tr = useT(VI);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
  });
  const [progress, setProgress] = useState<DemoProgress | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Both reads are scoped to the caller by the API, so an anonymous visitor
    // sees an empty checklist rather than someone else's progress.
    const [grants, audit] = await Promise.all([
      api.grants().catch(() => [] as Grant[]),
      api.audit().catch(() => [] as AuditRow[]),
    ]);
    setProgress(deriveProgress(grants, audit, isSignedIn(wallet)));
  }, [wallet]);

  useEffect(() => {
    // Signing in happens in the header, which React cannot subscribe to, so
    // the guide polls its own view of the session rather than freezing on the
    // state the page happened to load with.
    const sync = () => setWallet(loadSession()?.wallet ?? null);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const t = setInterval(sync, 3_000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (dismissed) return;
    void load();
    const t = setInterval(() => void load(), 10_000);
    return () => clearInterval(t);
  }, [dismissed, load]);

  if (dismissed || !progress) return null;
  const { steps, completed, signedIn } = progress;
  const current = steps.find(s => !s.done) ?? steps[steps.length - 1];

  return (
    <section className="demo-guide" aria-label={tr("Guided demo")}>
      <header className="demo-guide-head">
        <span className="chip chip-info"><FlaskConical size={12} />{tr("FOUR MINUTES")}</span>
        <div>
          <strong>{tr("See the chain refuse a transfer")}</strong>
          <small>
            {completed === steps.length
              ? tr("You have seen the whole path. Every step above is backed by a real transaction.")
              : tr("Four steps. Each one ticks itself only when the records say it happened.")}
          </small>
        </div>
        <VoxelStack size={15} className="demo-guide-vox" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
          setDismissed(true);
          try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* fine either way */ }
        }} aria-label={tr("Hide the guided demo")}>
          <X size={14} />
        </button>
      </header>

      {!signedIn && (
        <p className="help">{tr("No wallet to hand?")}<strong>{tr("Policy Lab")}</strong>{tr("below runs the same seven gates as a simulation — no wallet, no transaction, nothing written down. The steps here need a Devnet wallet because they put real records on Solana.")}</p>
      )}

      <ol className="demo-guide-steps">
        {steps.map((step, i) => (
          <li key={step.key} className={`${step.done ? "is-done" : ""}${step === current && !step.done ? " is-current" : ""}`}>
            <span className="demo-guide-mark" aria-hidden="true">
              {step.done ? <Check size={13} /> : <Circle size={9} />}
            </span>
            <span className="demo-guide-body">
              <strong>{i + 1}. {tr(step.title)}</strong>
              <small>{tr(step.detail)}</small>
              {step === current && !step.done && <em>{tr(step.look)}</em>}
            </span>
            {navigate && !step.done && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(step.slug)}>
                {tr("Go")} <ArrowRight size={12} />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
