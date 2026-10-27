import { QuickDemo } from "./QuickDemo";
import { useEffect, useRef, useState } from "react";
import { useClient } from "@solana/react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Play, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { useLang, useT } from "../i18n/LanguageContext";
import { api, fmtUsdc } from "../lib/api";
import { useWalletResource } from "../lib/useWalletResource";
import { setupProgress } from "../lib/onboarding";
import { useSignedIn } from "../lib/useSignedIn";
import type { AppClient } from "../solana/client";
import { PolicyLab } from "./PolicyLab";
import { SolanaWalletControl } from "./SolanaWalletControl";
import { AttentionList } from "./AttentionList";

const VI: Record<string, string> = {
  "Your agents": "Agent của bạn",
  "Agents pay. You set the limits.": "Agent thanh toán. Bạn kiểm soát.",
  "Choose the budget and recipients.": "Chọn ngân sách và người nhận.",
  "Try without a wallet": "Thử không cần ví",
  "Set up with a wallet": "Thiết lập với ví",
  "Simulation. No money moves.": "Mô phỏng. Không chuyển tiền.",
  "Try the demo": "Thử demo",
  "Check balance": "Kiểm tra số dư",
  "Start a test run": "Chạy thử",
  "Set agent permissions": "Cấp quyền cho agent",
  "Test funds needed": "Cần token thử nghiệm",
  "Check your vault": "Kiểm tra quỹ",
  "Agent running": "Agent đang chạy",
  "Ready to run": "Sẵn sàng chạy",
  "Some data is out of date.": "Một phần dữ liệu chưa được làm mới.",
  "First payment confirmed": "Đã có thanh toán xác nhận",
  "Setup progress": "Tiến trình thiết lập",
  "Help & advanced tools": "Hướng dẫn & công cụ nâng cao",
  "Read the guide": "Xem hướng dẫn",
  "Devnet uses test tokens. Network fees use Devnet SOL.": "Devnet dùng token thử nghiệm. Phí mạng dùng SOL Devnet.",
  "Advanced simulation tools": "Công cụ mô phỏng nâng cao",
  "Recent agent runs": "Lượt chạy gần đây",
  "Confirm your first payment": "Xác nhận thanh toán đầu tiên",
  "Start the test run in Spending limits. This step completes after a payment is confirmed.": "Chạy thử trong Hạn mức chi. Bước này hoàn tất khi có thanh toán được xác nhận.",
  "Test funds are added during setup when needed. Top up only if the vault is empty.": "Token thử nghiệm được nạp khi thiết lập nếu cần. Chỉ nạp thêm khi quỹ trống.",
  "First payment confirmed. Your first-use setup is complete, even if a policy later expires or is revoked.": "Thanh toán đầu tiên đã xác nhận. Bạn đã hoàn tất làm quen, kể cả khi chính sách sau đó hết hạn hoặc được thu hồi.",
  "A current spending policy is needed.": "Cần tạo chính sách chi tiêu còn hiệu lực.",
  "Your vault needs test funds.": "Quỹ cần được nạp token thử nghiệm.",
  "An agent is running. Follow its payments in Activity.": "Agent đang chạy. Theo dõi thanh toán trong Hoạt động.",
  "Refresh your vault balance before starting.": "Tải lại số dư quỹ trước khi chạy.",
  "Ready to start a test run.": "Đã sẵn sàng chạy thử.",
  "Last verified data; refresh failed.": "Dữ liệu đã xác minh trước đó; chưa làm mới được.",
  "Data unavailable.": "Chưa tải được dữ liệu.",
  "Updating…": "Đang cập nhật…",
  "Some data could not be refreshed. Available records remain visible; check the affected card before acting.": "Một phần dữ liệu chưa làm mới được. Bản ghi đã tải vẫn hiển thị; kiểm tra mục bị lỗi trước khi thao tác.",
  "Your agents. Your limits.": "Agent của bạn. Hạn mức bạn chọn.",
  "Let an agent make payments within a budget you control. Start with the steps below.": "Cho phép agent thanh toán trong ngân sách bạn kiểm soát. Bắt đầu với các bước bên dưới.",
  "Test environment": "Môi trường thử nghiệm",
  "Devnet uses test tokens. You may need Devnet SOL for network fees.": "Devnet dùng token thử nghiệm. Bạn có thể cần SOL Devnet để trả phí mạng.",
  "Available in vault": "Số dư quỹ",
  "Active policies": "Chính sách đang hiệu lực",
  "Agent runs": "Lượt chạy agent",
  "Connect and sign in to see your balances.": "Kết nối ví và đăng nhập để xem số dư.",
  "Get started": "Bắt đầu sử dụng",
  "Your next step": "Bước tiếp theo của bạn",
  "Setup complete": "Đã hoàn tất thiết lập",
  "Connect your wallet": "Kết nối ví của bạn",
  "Connect a Solana wallet, then choose Sign in to verify ownership.": "Kết nối ví Solana, sau đó chọn Đăng nhập để xác nhận quyền sở hữu.",
  "Set spending limits": "Đặt hạn mức chi",
  "Choose an agent, approved recipients, a budget and an expiry date.": "Chọn agent, người nhận được phép, ngân sách và thời hạn.",
  "Add test funds": "Nạp tiền thử nghiệm",
  "Open your vault and add test tokens for the agent to use.": "Mở quỹ và nạp token thử nghiệm để agent sử dụng.",
  "Start your agent": "Chạy agent của bạn",
  "Open Spending limits and choose Start agent on your policy.": "Mở Hạn mức chi và chọn Chạy agent trên chính sách đã tạo.",
  "Create a policy": "Tạo chính sách",
  "Open vault": "Mở quỹ",
  "Manage agents": "Quản lý agent",
  "View activity": "Xem hoạt động",
  "Complete": "Hoàn tất",
  "Current step": "Bước hiện tại",
  "All set. You can manage your policies and follow each payment in Activity.": "Đã sẵn sàng. Bạn có thể quản lý chính sách và theo dõi từng khoản thanh toán trong Hoạt động.",
  "You stay in control": "Bạn giữ quyền kiểm soát",
  "You choose the budget": "Bạn chọn ngân sách",
  "The agent can only spend within the limits you sign.": "Agent chỉ được chi trong hạn mức bạn đã ký.",
  "You choose who gets paid": "Bạn chọn người được nhận",
  "Only the recipient addresses you approve can receive payments.": "Chỉ địa chỉ người nhận bạn cho phép mới nhận được thanh toán.",
  "You can stop access": "Bạn có thể ngừng cấp quyền",
  "Revoke a policy at any time from Spending limits.": "Thu hồi chính sách bất cứ lúc nào trong Hạn mức chi.",
  "Need a hand?": "Cần trợ giúp?",
  "Read the step-by-step guide": "Xem hướng dẫn từng bước",
  "Explore available agents": "Khám phá agent có sẵn",
  "Try a simulation first": "Thử mô phỏng trước",
  "No wallet needed. Try a sample policy and see which payments are allowed.": "Không cần ví. Thử chính sách mẫu và xem khoản thanh toán nào được phép.",
  "We could not load your setup. Retry to check your latest progress.": "Chưa tải được trạng thái thiết lập. Thử lại để xem tiến độ mới nhất.",
  "Retry": "Thử lại",
  "Loading your setup…": "Đang tải trạng thái thiết lập…",
  "completed": "đã hoàn tất",
};

const fetchPolicies = () => api.grants();
const fetchFunds = (owner: string) => api.vault(owner);
const fetchRuns = () => api.runs();

function ResourceStatus({ state, retry }: { state: { error: boolean; loading: boolean; data: unknown }; retry: () => void }) {
  const tr = useT(VI);
  if (state.error) return <small className="p0-resource-error">{tr(state.data ? "Last verified data; refresh failed." : "Data unavailable.")} <button type="button" onClick={retry}>{tr("Retry")}</button></small>;
  return state.loading && state.data == null ? <small role="status">{tr("Updating…")}</small> : null;
}

export function OverviewPage({ setNav }: { setNav?: (index: number) => void }) {
  const tr = useT(VI);
  const { lang } = useLang(); const vi = lang === "vi";
  const [showQuickDemo, setShowQuickDemo] = useState(() => new URLSearchParams(location.hash.split("?")[1]).has("demo"));
  const demoFocus = useRef<HTMLDivElement>(null);
  useEffect(() => { if (showQuickDemo) { demoFocus.current?.focus({ preventScroll: true }); demoFocus.current?.scrollIntoView({ block: "start", behavior: "instant" }); } }, [showQuickDemo]);
  const client = useClient<AppClient>();
  const connected = useConnectedWallet(client);
  const wallet = connected ? String(connected.account.address) : "";
  const signedIn = useSignedIn(wallet);
  const [refresh, setRefresh] = useState(0);
  const [showSimulation, setShowSimulation] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const policies = useWalletResource(wallet, signedIn, fetchPolicies, refresh);
  const funds = useWalletResource(wallet, signedIn, fetchFunds, refresh);
  const runs = useWalletResource(wallet, signedIn, fetchRuns, refresh);
  const { active, done, firstPayment, readiness } = setupProgress(wallet, signedIn, policies.data ?? [], funds.data, now);
  const current = !signedIn ? 0 : !policies.data ? -1 : readiness === "policy" ? 1 : readiness === "funds" ? 2 : 3;
  const completed = done.filter(Boolean).length;
  const loading = signedIn && !policies.data && policies.loading;
  const error = policies.error || funds.error || runs.error;
  const action = readiness === "policy" ? "Create a policy" : readiness === "funds" ? "Open vault" : "Manage agents";
  const stateCopy = readiness === "policy" ? "A current spending policy is needed."
    : readiness === "funds" ? "Your vault needs test funds." : readiness === "running" ? "An agent is running. Follow its payments in Activity."
    : readiness === "unknown" ? "Refresh your vault balance before starting." : "Ready to start a test run.";
  const steps = [
    { title: "Connect your wallet", detail: "Connect a Solana wallet, then choose Sign in to verify ownership.", action: "", route: 0 },
    { title: "Set spending limits", detail: "Choose an agent, approved recipients, a budget and an expiry date.", action: "Create a policy", route: 6 },
    { title: "Add test funds", detail: "Test funds are added during setup when needed. Top up only if the vault is empty.", action: "Open vault", route: 4 },
    { title: "Confirm your first payment", detail: "Start the test run in Spending limits. This step completes after a payment is confirmed.", action: "Manage agents", route: 6 },
  ];

  const nextHref = readiness === "policy" ? "#/guardrails?new=1" : readiness === "funds" || readiness === "unknown" ? "#/treasury" : readiness === "running" ? "#/audit" : active[0] ? `#/guardrails?grant=${encodeURIComponent(active[0].id)}` : "#/guardrails";
  const nextLabel = readiness === "policy" ? "Create a policy" : readiness === "funds" ? "Add test funds" : readiness === "unknown" ? "Check balance" : readiness === "running" ? "View activity" : "Start a test run";
  const nextTitle = readiness === "policy" ? "Set agent permissions" : readiness === "funds" ? "Test funds needed" : readiness === "unknown" ? "Check your vault" : readiness === "running" ? "Agent running" : "Ready to run";
  return <div className="overview-page compact-overview">
    <header className="overview-heading"><div><h1>{tr(firstPayment ? "Your agents" : "Agents pay. You set the limits.")}</h1>{!firstPayment && <p>{tr("Choose the budget and recipients.")}</p>}</div><span className="test-badge">Devnet</span></header>
    {!firstPayment && <section className="ux-start"><div className="p1-actions"><button type="button" className="simple-primary" onClick={() => setShowQuickDemo(true)}>{tr("Try without a wallet")}<Play size={17} /></button><a className="simple-secondary" href="#/guardrails?new=1">{tr("Set up with a wallet")}<ArrowRight size={16} /></a></div><small>{tr("Simulation. No money moves.")}</small></section>}
    {firstPayment && <button type="button" className="simple-secondary" onClick={() => setShowQuickDemo(v => !v)} aria-expanded={showQuickDemo}>{tr("Try the demo")}</button>}
    {showQuickDemo && <div ref={demoFocus} tabIndex={-1} className="ux-demo-focus"><QuickDemo /></div>}
    {signedIn && <>
      <div className="overview-stats" aria-label={tr("Your agents")}>
        <div><span>{tr("Available in vault")}</span><strong>{funds.data?.balanceUnits != null ? fmtUsdc(funds.data.balanceUnits) : "?"}<small> dUSDC</small></strong><ResourceStatus state={funds} retry={() => setRefresh(n => n + 1)} /></div>
        <div><span>{tr("Active policies")}</span><strong>{policies.data ? active.length : "?"}</strong><ResourceStatus state={policies} retry={() => setRefresh(n => n + 1)} /></div>
        <div><span>{tr("Recent agent runs")}</span><strong>{runs.data ? runs.data.runs.length : "?"}</strong><ResourceStatus state={runs} retry={() => setRefresh(n => n + 1)} /></div>
      </div>
      {policies.data && <AttentionList owner={wallet} grants={policies.data} runs={runs.data?.runs ?? []} stale={policies.error || runs.error || !runs.data} now={now} />}
      <section className="setup-card compact-next-step" aria-labelledby="setup-title" aria-busy={loading}>
        <div className="setup-card-heading"><div><span className="simple-eyebrow">{tr("Your next step")}</span><h2 id="setup-title">{tr(loading || !policies.data ? "Loading your setup?" : nextTitle)}</h2></div>{policies.data && <a className="simple-primary" href={nextHref}>{tr(nextLabel)}<ArrowRight size={16} /></a>}</div>
        {error && <p className="setup-error" role="status">{tr("Some data is out of date.")} <button type="button" onClick={() => setRefresh(n => n + 1)}><RefreshCw size={14} />{tr("Retry")}</button></p>}
        {firstPayment && <span className="compact-complete"><Check size={14} />{tr("First payment confirmed")}</span>}
        <details className="compact-progress"><summary>{tr("Setup progress")} <span className="setup-count">{completed}/4</span></summary><ol className="setup-steps">{steps.map((step, i) => <li key={step.title} className={done[i] ? "is-complete" : ""} aria-current={i === current ? "step" : undefined}><span className="setup-number">{done[i] ? <Check size={15} /> : i + 1}</span><h3>{tr(step.title)}</h3></li>)}</ol></details>
      </section>
    </>}
    <details className="compact-home-help"><summary>{tr("Help & advanced tools")}</summary><div className="p1-actions"><a className="simple-secondary" href="#/guide">{tr("Read the guide")}</a><a className="simple-secondary" href="#/agents?view=catalog">{tr("Explore available agents")}</a></div><p>{tr("Devnet uses test tokens. Network fees use Devnet SOL.")}</p><details className="simulation-disclosure" onToggle={event => setShowSimulation(event.currentTarget.open)}><summary>{tr("Advanced simulation tools")}</summary>{showSimulation && <PolicyLab />}</details></details>
  </div>;
}
