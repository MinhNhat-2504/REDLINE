import { useCallback, useEffect, useRef, useState } from "react";
import { CornerDownLeft, Sparkles, TerminalSquare } from "lucide-react";
import { api, fmtUsdc, grantExpiresAt, short } from "../lib/api";
import { mono, sans, term } from "../theme";
import { useT } from "../i18n/LanguageContext";

// English is the source language here too, same as the rest of the app —
// every string below is written in English and wrapped as `tr("...")`.
const VI: Record<string, string> = {
  "REDLINE console — every answer below is read from recorded state.":
    "Console REDLINE — mọi câu trả lời dưới đây đều được đọc từ trạng thái đã ghi nhận.",
  "Type `help` for what this can tell you.": "Gõ `help` để xem console này có thể cho bạn biết những gì.",
  "Ask naturally — commands are optional.": "Hãy hỏi tự nhiên — không bắt buộc dùng câu lệnh.",

  "the seven checks, and how often each has refused a transfer": "bảy vòng kiểm tra, và tần suất mỗi vòng đã từ chối một lệnh chuyển",
  "policy accounts, what they have spent, when they lapse": "các tài khoản policy, số đã chi, khi nào hết hạn",
  "the last n recorded events (default 8)": "n sự kiện đã ghi nhận gần nhất (mặc định 8)",
  "which gate owns a reason code, and what it means": "gate nào sở hữu mã lý do đó, và ý nghĩa của nó",
  "put a question to the assistant, answered from recorded data": "đặt câu hỏi cho trợ lý, được trả lời từ dữ liệu đã ghi nhận",
  "empty the console": "xoá trắng console",

  "this wallet": "ví này",
  "protocol-wide": "toàn giao thức",
  "no grants recorded": "chưa có grant nào được ghi nhận",

  "explain what? try `explain SPEND_CAP_EXCEEDED`": "explain cái gì? thử `explain SPEND_CAP_EXCEEDED`",
  "is not a gate refusal — it may be a chain error, which sits outside the policy":
    "không phải một lần từ chối bởi gate — có thể là lỗi trên chuỗi, nằm ngoài phạm vi policy",
  "is gate": "là gate",
  "Gates run in order and the first failure stops the transfer, so a": "Các gate chạy tuần tự và lỗi đầu tiên sẽ dừng lệnh chuyển, nên một",
  "means gates 1–": "nghĩa là các gate 1–",
  "passed and nothing moved.": "đã qua và không có gì được chuyển.",

  "ask what? try `ask why is my agent being blocked`": "ask cái gì? thử `ask vì sao agent của tôi bị chặn`",
  "ask why is my agent being blocked": "ask vì sao agent của tôi bị chặn",
  "Protocol console": "Console giao thức",
  "answered by": "trả lời bởi",
  ", grounded in recorded state": ", dựa trên trạng thái đã ghi nhận",
  "answered from recorded figures — no model configured": "trả lời từ số liệu đã ghi nhận — chưa cấu hình model",
  "smart rules + live data": "luật thông minh + dữ liệu trực tiếp",

  "unknown command:": "lệnh không xác định:",
  " — try `help`": " — thử `help`",
  "the API did not answer": "API không phản hồi",

  "console": "console",
  "Console command": "Lệnh console",
  "Run command": "Chạy lệnh",
  "Ask about grants, spending, refusals, or expiry…": "Hỏi về grant, chi tiêu, từ chối hoặc thời hạn…",
  "Why was my agent blocked?": "Vì sao agent của tôi bị chặn?",
  "What should I fix first?": "Tôi nên sửa gì trước?",
  "Which grants are still active?": "Grant nào vẫn đang hoạt động?",

  "Answers come from this deployment's own records. Where a figure is unknown the console says so instead of estimating one.":
    "Câu trả lời đến từ chính dữ liệu ghi nhận của deployment này. Khi một số liệu chưa xác định, console sẽ nói rõ thay vì ước tính.",
};

// One console instead of three widgets.
//
// This product is operated by people who read logs, so the natural place to
// ask it something is a prompt. `ask` is the assistant; every other command
// reads the same endpoints the dashboard does. Nothing here invents a figure:
// if the API cannot answer, the line says so rather than printing a plausible
// number, which is the rule the rest of the product follows.

type Line = { id: number; kind: "in" | "out" | "dim" | "warn" | "good"; text: string };

const HELP: [string, string][] = [
  ["gates           ", "the seven checks, and how often each has refused a transfer"],
  ["grants          ", "policy accounts, what they have spent, when they lapse"],
  ["audit [n]       ", "the last n recorded events (default 8)"],
  ["explain <CODE>  ", "which gate owns a reason code, and what it means"],
  ["ask <question>  ", "put a question to the assistant, answered from recorded data"],
  ["clear           ", "empty the console"],
];

const STARTERS = [
  "Why was my agent blocked?",
  "What should I fix first?",
  "Which grants are still active?",
];

let seq = 0;
const line = (kind: Line["kind"], text: string): Line => ({ id: (seq += 1), kind, text });

export function ProtocolConsole({ owner }: { owner?: string }) {
  const tr = useT(VI);
  const [lines, setLines] = useState<Line[]>([
    line("dim", tr("REDLINE console — every answer below is read from recorded state.")),
    line("dim", tr("Ask naturally — commands are optional.")),
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyAt, setHistoryAt] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const push = useCallback((...next: Line[]) => setLines(prev => [...prev, ...next]), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  async function answerQuestion(question: string) {
    const reply = await api.ask(question, owner);
    push(line("out", reply.answer));
    if (reply.suggestions && reply.suggestions.length > 0) {
      for (const s of reply.suggestions) {
        push(line("dim", `💡 ${s.title}: ${s.detail}`));
      }
    }
  }

  async function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    push(line("in", cmd));
    setHistory(prev => [cmd, ...prev].slice(0, 40));
    setHistoryAt(-1);

    const [verb, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ");
    setBusy(true);
    try {
      switch (verb.toLowerCase()) {
        case "help":
          push(...HELP.map(([usage, desc]) => line("out", `${usage} ${tr(desc)}`)));
          break;

        case "clear":
          setLines([]);
          break;

        case "gates": {
          const o = await api.protocolOverview(owner);
          push(line("dim", `${o.scope === "wallet" ? tr("this wallet") : tr("protocol-wide")} · ${o.network.cluster}`));
          for (const g of o.gates) {
            const l = g.rejected
              ? line("warn", `${g.id}. ${g.label.padEnd(20)} refused ${g.rejected}× — ${g.detail}`)
              : line("out", `${g.id}. ${g.label.padEnd(20)} clean      — ${g.detail}`);
            push(l);
          }
          push(line("dim", `allowed ${o.activity.allowed} · refused ${o.activity.rejected}`));
          break;
        }

        case "grants": {
          const gs = await api.grants();
          if (!gs.length) { push(line("dim", tr("no grants recorded"))); break; }
          for (const g of gs) {
            const cap = Number(g.policyVersion.spendCapUnits);
            const spent = Number(g.spentUnits);
            const ms = grantExpiresAt(g) - Date.now();
            const state = g.revoked ? "REVOKED" : ms <= 0 ? "EXPIRED" : "ACTIVE";
            push(line(state === "ACTIVE" ? "good" : "warn",
              `${short(g.grantPda, 5)}  ${state.padEnd(8)} ${fmtUsdc(String(spent))}/${fmtUsdc(String(cap))} USDC  tx ${g.transactionCount}/${g.policyVersion.maxTransactions}  ${g.agentVersion.name}`));
          }
          break;
        }

        case "audit": {
          const n = Math.min(Math.max(Number(arg) || 8, 1), 40);
          const rows = await api.audit();
          for (const r of rows.slice(-n)) {
            const at = new Date(r.createdAt).toLocaleTimeString("en-US", { hour12: false });
            const fromChain = r.eventType.startsWith("chain.");
            push(line(fromChain ? "good" : "out", `${at}  ${fromChain ? "chain" : "server"}  ${r.eventType}`));
          }
          break;
        }

        case "explain": {
          const code = arg.toUpperCase();
          if (!code) { push(line("warn", tr("explain what? try `explain SPEND_CAP_EXCEEDED`"))); break; }
          const o = await api.protocolOverview(owner);
          const gate = o.gates.find(g => g.reasonCodes.includes(code));
          if (!gate) { push(line("warn", `${code} ${tr("is not a gate refusal — it may be a chain error, which sits outside the policy")}`)); break; }
          push(
            line("out", `${code} ${tr("is gate")} ${gate.id}, ${gate.label}.`),
            line("out", gate.detail + "."),
            line("dim", `${tr("Gates run in order and the first failure stops the transfer, so a")} ${code} ${tr("means gates 1–")}${gate.id - 1} ${tr("passed and nothing moved.")}`),
          );
          break;
        }

        case "ask": {
          if (!arg) { push(line("warn", tr("ask what? try `ask why is my agent being blocked`"))); break; }
          await answerQuestion(arg);
          break;
        }

        default:
          await answerQuestion(cmd);
      }
    } catch (e) {
      push(line("warn", e instanceof Error ? e.message : tr("the API did not answer")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="redline-console" aria-label={tr("Protocol console")}>
      <header className="redline-console-bar">
        <TerminalSquare size={12} />
        <span>{tr("console")}</span>
        <span className="redline-console-hint"><Sparkles size={11} /> {owner ? short(owner, 4) : tr("protocol-wide")}</span>
      </header>

      <div className="redline-console-body" ref={scrollRef}>
        {lines.map(l => (
          <p key={l.id} className={`redline-console-line redline-console-${l.kind}`} style={mono}>
            {l.kind === "in" ? <span className="redline-console-caret">›</span> : null}
            {l.text}
          </p>
        ))}
        {busy && <p className="redline-console-line redline-console-dim" style={mono}>…</p>}
      </div>

      <div className="redline-console-prompts" aria-label="Suggested questions">
        {STARTERS.map(prompt => (
          <button type="button" key={prompt} disabled={busy} onClick={() => void runCommand(tr(prompt))}>{tr(prompt)}</button>
        ))}
      </div>

      <form
        className="redline-console-input"
        onSubmit={e => { e.preventDefault(); const v = input; setInput(""); void runCommand(v); }}
      >
        <span className="redline-console-caret">›</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            // A console people type into should remember what they typed.
            if (e.key === "ArrowUp" && history.length) {
              e.preventDefault();
              const next = Math.min(historyAt + 1, history.length - 1);
              setHistoryAt(next); setInput(history[next]);
            } else if (e.key === "ArrowDown" && historyAt >= 0) {
              e.preventDefault();
              const next = historyAt - 1;
              setHistoryAt(next); setInput(next < 0 ? "" : history[next]);
            }
          }}
          placeholder={tr("Ask about grants, spending, refusals, or expiry…")}
          aria-label={tr("Console command")}
          spellCheck={false}
          autoComplete="off"
          style={{ ...mono, color: "#ffffff", caretColor: "#38bdf8" }}
        />
        <button type="submit" disabled={busy} aria-label={tr("Run command")}><CornerDownLeft size={12} /></button>
      </form>

      <p className="redline-console-note" style={sans}>
        {tr("Answers come from this deployment's own records. Where a figure is unknown the console says so instead of estimating one.")}
      </p>
    </section>
  );
}

export const consoleTone = term;
