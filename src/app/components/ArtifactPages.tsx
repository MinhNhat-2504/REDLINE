import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import {
Activity,
AlertTriangle,
Bot,
CheckCircle2,
Cpu,
Gauge,
Play,
Server,
ShieldCheck,
Sparkles,
Wallet,
} from "lucide-react";
import { useEffect,useMemo,useState,type CSSProperties } from "react";
import { useRealAgents } from "../lib/agents";
import { api,API_URL,checkHealth,short,type Analytics,type Health } from "../lib/api";
import { useBackendStatus } from "./BackendStatus";
import type { AppClient } from "../solana/client";
import { color } from "../theme";
import { ProtocolConsole } from "./ProtocolConsole";
import { useT } from "../i18n/LanguageContext";

const VI: Record<string, string> = {
  "Configured model": "Mô hình đã cấu hình",
  "Backend · grounded assistant": "Backend · trợ lý có căn cứ",
  "Deterministic floor": "Sàn tất định",
  "Rules · always available": "Quy tắc · luôn sẵn sàng",
  "Gate registry": "Sổ gate",
  "Seven on-chain checks": "Bảy lớp kiểm tra on-chain",
  "Assistant stack": "Bộ trợ lý",
  "Grounding": "Căn cứ dữ liệu",
  "Ledger events": "Sự kiện sổ cái",
  "LIVE": "TRỰC TIẾP",
  "Scope": "Phạm vi",
  "THIS WALLET": "VÍ NÀY",
  "ALL WALLETS": "MỌI VÍ",
  "Ask the ledger. Verify the answer.": "Hỏi sổ cái. Kiểm chứng câu trả lời.",
  "GROUNDED": "CÓ CĂN CỨ",
  "Running now": "Đang chạy",
  "Operations assistant": "Trợ lý vận hành",
  "Answers use recorded grants, audit events and the same seven gate definitions shown across REDLINE.": "Câu trả lời dựa trên grant đã ghi, sự kiện kiểm toán và cùng bảy định nghĩa gate hiển thị khắp REDLINE.",
  "GATES": "GATE",
  "SCOPE": "PHẠM VI",
  "OPENAI-COMPATIBLE BACKEND": "BACKEND TƯƠNG THÍCH OPENAI",
  "The assistant explains. Your wallet remains the only signer.": "Trợ lý giải thích. Ví của bạn vẫn là bên ký duy nhất.",
  "Connectivity check failed": "Kiểm tra kết nối thất bại",
  "Grounds answers in recorded state": "Căn cứ câu trả lời vào trạng thái đã ghi",
  "Names the refusing gate and reason code": "Nêu tên gate từ chối và mã lý do",
  "Keeps signing authority in the wallet": "Giữ quyền ký trong ví",
  "Falls back to deterministic rules": "Dự phòng bằng quy tắc tất định",
  "Avoids inventing unknown figures": "Không bịa số liệu chưa biết",
  "MODEL UNDER TEST · BACKEND": "MÔ HÌNH ĐANG KIỂM TRA · BACKEND",
  "Configured assistant": "Trợ lý đã cấu hình",
  "The active model is discovered through a real grounded request. Until then, REDLINE reports configuration without inventing hardware figures.": "Mô hình đang hoạt động được phát hiện qua một yêu cầu thật. Trước đó, REDLINE chỉ báo cấu hình chứ không bịa số liệu phần cứng.",
  "SOURCE": "NGUỒN",
  "LATENCY": "ĐỘ TRỄ",
  "GROUNDING": "CĂN CỨ",
  "LEDGER": "SỔ CÁI",
  "AUTHORITY": "QUYỀN HẠN",
  "READ ONLY": "CHỈ ĐỌC",
  "Running check…": "Đang kiểm tra…",
  "Run grounded benchmark": "Chạy benchmark có căn cứ",
  "Measured latency": "Độ trễ đo được",
  "one live grounded request": "một yêu cầu thật",
  "Answer source": "Nguồn câu trả lời",
  "reported by the API": "do API báo",
  "Policy gates": "Gate chính sách",
  "enforced on-chain": "thực thi on-chain",
  "Signing access": "Quyền ký",
  "model cannot sign": "mô hình không thể ký",
  "Latency profile": "Hồ sơ độ trễ",
  "LIVE CHECK": "KIỂM TRA TRỰC TIẾP",
  "Measured request latency in milliseconds": "Độ trễ yêu cầu đo bằng mili giây",
  "Request": "Yêu cầu",
  "No measurements yet. Run a benchmark to start.": "Chưa có số đo. Chạy benchmark để bắt đầu.",
  "Last 12 successful requests in this session. Values include network and server response time.": "12 yêu cầu thành công gần nhất trong phiên này. Giá trị bao gồm thời gian mạng và phản hồi máy chủ.",
  "Trust boundary checklist": "Danh sách ranh giới tin cậy",
  "5 CONTROLS": "5 KIỂM SOÁT",
  "DESIGN": "THIẾT KẾ",
  "OWNER IDENTITY · SOLANA": "ĐỊNH DANH CHỦ SỞ HỮU · SOLANA",
  "Wallet not connected": "Chưa kết nối ví",
  "Connect a wallet to load the owner-scoped profile.": "Kết nối ví để tải hồ sơ của chủ sở hữu.",
  "REDLINE OPERATOR": "NGƯỜI VẬN HÀNH REDLINE",
  "Registry versions": "Phiên bản trong sổ",
  "Active grants": "Grant hoạt động",
  "Total grants": "Tổng grant",
  "Confirmed volume": "Khối lượng đã xác nhận",
  "Transactions": "Giao dịch",
  "Success rate": "Tỷ lệ thành công",
  "Blocked": "Bị chặn",
  "Built from the wallet's seven-day confirmed volume.": "Tính từ khối lượng đã xác nhận trong bảy ngày của ví.",
  "LIVE LEDGER": "SỔ CÁI TRỰC TIẾP",
  "Connect a wallet to load its recorded activity.": "Kết nối ví để tải hoạt động đã ghi.",
  "LOW": "THẤP",
  "OWNER-SCOPED ACTIVITY": "HOẠT ĐỘNG CỦA CHỦ SỞ HỮU",
  "HIGH": "CAO",
};

const panel: CSSProperties = {
  background: color.surface,
  border: `1px solid ${color.border}`,
};

const modelOptions = [
  { name: "Configured model", note: "Backend · grounded assistant", tone: color.info },
  { name: "Deterministic floor", note: "Rules · always available", tone: color.verified },
  { name: "Gate registry", note: "Seven on-chain checks", tone: color.warn },
];

export function CopilotPage() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const owner = connected ? String(connected.account.address) : undefined;
  // Shared with every other indicator in the shell, so a cold start cannot be
  // reported as LIVE here and OFFLINE two panels away.
  const backend = useBackendStatus();
  const health = backend.health;
  const healthState = backend.phase === "waking" ? "checking" : backend.phase;

  return (
    <div className="route-page page-copilot artifact-page-grid">
      <div className="route-local-heading" aria-hidden="true" />
      <aside className="artifact-side-panel copilot-model-rail" style={panel}>
        <div className="artifact-panel-kicker"><span />{tr("Assistant stack")}</div>
        {modelOptions.map((model, index) => (
          <div className="artifact-model-option" key={model.name}>
            <span className="artifact-icon" style={{ color: model.tone }}><Bot size={15} /></span>
            <span><strong>{tr(model.name)}</strong><small>{tr(model.note)}</small></span>
            <i style={{ background: model.tone }} />
          </div>
        ))}
        <div className="artifact-panel-kicker artifact-panel-kicker-spaced"><span />{tr("Grounding")}</div>
        <div className="artifact-grounding-list">
          <span>{tr("Ledger events")}</span><b>{tr("LIVE")}</b>
          <span>{tr("Gate registry")}</span><b>7</b>
          <span>{tr("Scope")}</span><b>{owner ? tr("THIS WALLET") : tr("ALL WALLETS")}</b>
        </div>
      </aside>

      <section className="copilot-console-stage">
        <div className="artifact-stage-head">
          <div><span>REDLINE COPILOT</span><strong>{tr("Ask the ledger. Verify the answer.")}</strong></div>
          <em><i />{tr("GROUNDED")}</em>
        </div>
        <ProtocolConsole owner={owner} />
      </section>

      <aside className="artifact-side-panel copilot-status-panel" style={panel}>
        <div className="artifact-panel-kicker"><span />{tr("Running now")}</div>
        <h3>{tr("Operations assistant")}</h3>
        <p>{tr("Answers use recorded grants, audit events and the same seven gate definitions shown across REDLINE.")}</p>
        <div className="artifact-metric-grid">
          <div><small>API</small><strong>{healthState.toUpperCase()}</strong></div>
          <div><small>CHAIN</small><strong>{health?.chain ?? "—"}</strong></div>
          <div><small>{tr("GATES")}</small><strong>7</strong></div>
          <div><small>{tr("SCOPE")}</small><strong>{owner ? tr("THIS WALLET") : tr("ALL WALLETS")}</strong></div>
        </div>
        <div className="artifact-connection-card">
          <Server size={14} />
          <span><small>{tr("OPENAI-COMPATIBLE BACKEND")}</small><code>{API_URL}</code></span>
        </div>
        <p className="artifact-trust-note"><ShieldCheck size={14} />{tr("The assistant explains. Your wallet remains the only signer.")}</p>
      </aside>
    </div>
  );
}

type Benchmark = { latency: number; source: string; model: string } | null;

export function ModelsPage() {
  const tr = useT(VI);
  const [benchmark, setBenchmark] = useState<Benchmark>(null);
  const [busy, setBusy] = useState(false);
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [error, setError] = useState("");

  async function runBenchmark() {
    setBusy(true);
    setError("");
    const started = performance.now();
    try {
      const reply = await api.ask("Explain which REDLINE gate protects the spending cap.");
      const latency = Math.round(performance.now() - started);
      setBenchmark({ latency, source: reply.source, model: reply.model });
      setMeasurements(values => [...values.slice(-11), latency]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr("Connectivity check failed"));
    } finally {
      setBusy(false);
    }
  }

  const checks = [
    "Grounds answers in recorded state",
    "Names the refusing gate and reason code",
    "Keeps signing authority in the wallet",
    "Falls back to deterministic rules",
    "Avoids inventing unknown figures",
  ];

  return (
    <div className="route-page page-models artifact-model-layout">
      <div className="route-local-heading" aria-hidden="true" />
      <aside className="model-identity-card" style={panel}>
        <div className="model-prism" aria-hidden="true"><span /><span /><span /></div>
        <small>{tr("MODEL UNDER TEST · BACKEND")}</small>
        <h2>{benchmark?.model || tr("Configured assistant")}</h2>
        <p>{tr("The active model is discovered through a real grounded request. Until then, REDLINE reports configuration without inventing hardware figures.")}</p>
        <div className="artifact-metric-grid">
          <div><small>{tr("SOURCE")}</small><strong>{benchmark?.source ?? "—"}</strong></div>
          <div><small>{tr("LATENCY")}</small><strong>{benchmark ? `${benchmark.latency} ms` : "—"}</strong></div>
          <div><small>{tr("GROUNDING")}</small><strong>{tr("LEDGER")}</strong></div>
          <div><small>{tr("AUTHORITY")}</small><strong>{tr("READ ONLY")}</strong></div>
        </div>
        <button type="button" className="artifact-primary-button" onClick={() => void runBenchmark()} disabled={busy}>
          <Play size={14} />{busy ? tr("Running check…") : tr("Run grounded benchmark")}
        </button>
        {error && <p className="artifact-error"><AlertTriangle size={13} />{error}</p>}
      </aside>

      <section className="model-observability-grid">
        {[
          { label: tr("Measured latency"), value: benchmark ? `${benchmark.latency} ms` : "—", icon: Gauge, sub: tr("one live grounded request") },
          { label: tr("Answer source"), value: benchmark?.source?.toUpperCase() ?? "—", icon: Cpu, sub: tr("reported by the API") },
          { label: tr("Policy gates"), value: "7", icon: ShieldCheck, sub: tr("enforced on-chain") },
          { label: tr("Signing access"), value: "0", icon: Wallet, sub: tr("model cannot sign") },
        ].map(item => (
          <article className="artifact-kpi-card" style={panel} key={item.label}>
            <item.icon size={14} /><small>{tr(item.label)}</small><strong>{item.value}</strong><span>{tr(item.sub)}</span>
          </article>
        ))}
        <article className="model-chart-card" style={panel}>
          <header><h3>{tr("Latency profile")}</h3><span>{tr("LIVE CHECK")}</span></header>
          <div className="model-bars" aria-label={tr("Measured request latency in milliseconds")}>
            {measurements.length ? measurements.map((ms, index) => <i key={index} title={`${tr("Request")} ${index + 1}: ${ms} ms`} style={{ height: `${ms / Math.max(...measurements) * 90}%` }}><span>{ms} ms</span></i>) : <p>{tr("No measurements yet. Run a benchmark to start.")}</p>}
          </div>
          <p>{tr("Last 12 successful requests in this session. Values include network and server response time.")}</p>
        </article>
        <article className="model-check-card" style={panel}>
          <header><h3>{tr("Trust boundary checklist")}</h3><span>{tr("5 CONTROLS")}</span></header>
          {checks.map(check => <div key={check}><CheckCircle2 size={14} /><span>{tr(check)}</span><small>{tr("DESIGN")}</small></div>)}
        </article>
      </section>
    </div>
  );
}

export function ProfilePage() {
  const tr = useT(VI);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const wallet = connected ? String(connected.account.address) : "";
  const { agents } = useRealAgents();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!wallet) { setAnalytics(null); return; }
    let live = true;
    setAnalytics(null);
    api.analytics(wallet).then(value => { if (live) setAnalytics(value); }).catch(() => { if (live) setAnalytics(null); });
    return () => { live = false; };
  }, [wallet]);

  const activity = useMemo(() => {
    const points = analytics?.weeklyVolume ?? [];
    const max = Math.max(1, ...points.map(p => p.volumeUsdc));
    return points.map(p => ({ ...p, opacity: Math.max(0.08, p.volumeUsdc / max) }));
  }, [analytics]);

  return (
    <div className="route-page page-profile artifact-profile-layout">
      <div className="route-local-heading" aria-hidden="true" />
      <aside className="profile-identity-card" style={panel}>
        <div className="profile-avatar"><Wallet size={25} /></div>
        <small>{tr("OWNER IDENTITY · SOLANA")}</small>
        <h2>{wallet ? short(wallet, 6) : tr("Wallet not connected")}</h2>
        <p>{wallet || tr("Connect a wallet to load the owner-scoped profile.")}</p>
        <div className="profile-rank"><Sparkles size={14} /><span>{tr("REDLINE OPERATOR")}</span></div>
        <dl>
          <div><dt>{tr("Registry versions")}</dt><dd>{agents.length}</dd></div>
          <div><dt>{tr("Active grants")}</dt><dd>{analytics?.activeGrants ?? "—"}</dd></div>
          <div><dt>{tr("Total grants")}</dt><dd>{analytics?.totalGrants ?? "—"}</dd></div>
          <div><dt>{tr("Confirmed volume")}</dt><dd>{analytics ? `${analytics.totalVolumeUsdc.toLocaleString()} USDC` : "—"}</dd></div>
        </dl>
      </aside>

      <section className="profile-data-stage">
        <div className="profile-kpis">
          {[
            ["Active grants", analytics?.activeGrants ?? "—"],
            ["Transactions", analytics?.totalTransactions ?? "—"],
            ["Success rate", analytics?.successRatePct == null ? "—" : `${analytics.successRatePct}%`],
            ["Blocked", analytics?.totalRejections ?? "—"],
          ].map(([label, value]) => <article style={panel} key={label}><small>{tr(String(label))}</small><strong>{value}</strong><Activity size={14} /></article>)}
        </div>
        <article className="profile-activity-card" style={panel}>
          <header><div><h3>{tr("Confirmed volume")}</h3><p>{tr("Built from the wallet's seven-day confirmed volume.")}</p></div><span>{tr("LIVE LEDGER")}</span></header>
          <div className="profile-heatmap">
            {activity.map((point, index) => <div key={index}><i style={{ opacity: point.opacity }} /><small>{point.t}</small><b>{point.volumeUsdc.toLocaleString()} USDC</b></div>)}
            {!activity.length && <p>{tr("Connect a wallet to load its recorded activity.")}</p>}
          </div>
          <footer><span>{tr("LOW")}</span><span>{tr("OWNER-SCOPED ACTIVITY")}</span><span>{tr("HIGH")}</span></footer>
        </article>
      </section>
    </div>
  );
}
