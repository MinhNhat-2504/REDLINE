import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { api, fmtUsdc, type SimulationResult } from "../lib/api";
import { useLang } from "../i18n/LanguageContext";
import { isQuickDemoResult } from "../lib/quick-demo";

/** Read-only simulation API; never connects a wallet or submits a transfer. */
export function QuickDemo() {
  const { lang } = useLang(); const vi = lang === "vi";
  const [example, setExample] = useState<"allowed" | "blocked" | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(false);
  const sequence = useRef(0); const gate = useRef(false);
  useEffect(() => () => { ++sequence.current; }, []);
  async function run(kind: "allowed" | "blocked") {
    if (gate.current) return;
    gate.current = true; const request = ++sequence.current;
    setExample(kind); setResult(null); setError(false); setBusy(true);
    try {
      const data = await api.simulatePolicy({ policy: { spendCapUnits: "100000000", maxTransactions: 5, cooldownSeconds: 60, durationSeconds: 86400 },
        proposal: { amountUnits: kind === "allowed" ? "20000000" : "120000000", attempts: 1, intervalSeconds: 60, destinationAllowed: true, mintAllowed: true, active: true, replayNonce: false } });
      if (request !== sequence.current) return;
      if (!isQuickDemoResult(data, kind)) throw new Error("Invalid simulation response");
      setResult(data);
    } catch { if (request === sequence.current) setError(true); }
    finally { gate.current = false; if (request === sequence.current) setBusy(false); }
  }
  return <section className="ux-quick-demo" id="quick-demo" aria-labelledby="quick-demo-title">
    <div className="compact-demo-heading"><div><span className="simple-eyebrow">{vi ? "MÔ PHỎNG" : "SIMULATION"}</span><h2 id="quick-demo-title">{vi ? "Thử một yêu cầu" : "Try a request"}</h2></div><div className="compact-demo-budget"><strong>100 dUSDC</strong><small>{vi ? "Ngân sách mỗi ví dụ" : "Budget per example"}</small></div></div>
    <div className="ux-demo-choices"><button type="button" disabled={busy} aria-pressed={example === "allowed"} onClick={() => void run("allowed")}><Check size={20} /><strong>20 dUSDC</strong><span>{vi ? "Trong ngân sách" : "Within budget"}</span></button><button type="button" disabled={busy} aria-pressed={example === "blocked"} onClick={() => void run("blocked")}><ShieldCheck size={20} /><strong>120 dUSDC</strong><span>{vi ? "Vượt ngân sách" : "Over budget"}</span></button></div>
    <div className="compact-demo-status" role="status" aria-live="polite" aria-busy={busy}>
      {busy && <p>{vi ? "Đang kiểm tra…" : "Checking…"}</p>}
      {result && <div className="ux-demo-result"><strong>{result.steps[0].verdict.allow ? (vi ? "Được phép trong mô phỏng" : "Allowed in simulation") : (vi ? "Bị chặn trong mô phỏng" : "Blocked in simulation")}</strong><span><b>{fmtUsdc(result.summary.remainingUnits)} dUSDC</b><small>{vi ? "Còn lại" : "Remaining"}</small></span></div>}
      {error && <p>{vi ? "Chưa kết nối. Chọn lại yêu cầu để thử lại." : "Simulation unavailable. Choose a request to retry."}</p>}
    </div>
    <p className="ux-demo-note">{vi ? "Không cần ví · Không chuyển tiền" : "No wallet · No money moves"}</p>
    {result && <a className="simple-secondary" href="#/guardrails?new=1">{vi ? "Tự thiết lập với ví thử nghiệm" : "Set up with a test wallet"}<ArrowRight size={16} /></a>}
  </section>;
}
