import { useLang } from "../i18n/LanguageContext";
import type { Grant } from "../lib/api";
import { fmtUsdc } from "../lib/api";
import { displayDate } from "../lib/friendly-error";
import { agentTaskSummary } from "../lib/task-summary";
export function AgentTaskCard({ grants, owner, verified }: { grants: Grant[]; owner: string; verified: boolean }) {
  const { lang } = useLang(); const vi = lang === "vi";
  const task = agentTaskSummary(grants, verified ? owner : "");
  const status = task.state === "running" ? (vi ? "Đang chạy" : "Running") : task.state === "attention" ? (vi ? "Cần xem lại lượt chạy" : "Run needs attention") : task.state === "ready" ? (vi ? "Sẵn sàng chạy" : "Ready to run") : (vi ? "Cần cấp quyền trước khi chạy" : "Set permissions before running");
  return <section className="ux-agent-task" aria-label={vi ? "Tác vụ agent" : "Agent tasks"}>
    <strong>{verified ? status : (vi ? "Đăng nhập để xem tác vụ của ví" : "Sign in to see this wallet's tasks")}</strong>
    {verified && task.policyCount > 0 && <dl><div><dt>{vi ? "Ngân sách quyền còn lại" : "Remaining policy budget"}</dt><dd>{task.remainingUnits === null ? "—" : `${fmtUsdc(task.remainingUnits)} dUSDC`}</dd></div><div><dt>{vi ? "Hết quyền sớm nhất" : "Next expiry"}</dt><dd>{task.nextExpiry ? displayDate(task.nextExpiry, lang) : "—"}</dd></div></dl>}
    {verified && task.policyCount > 1 && <small>{vi ? `${task.policyCount} chính sách · Không phải số dư quỹ` : `${task.policyCount} policies · Not vault balance`}</small>}
    {verified && task.grantId && <div className="p1-actions">{task.state !== "needs-policy" && <a className="simple-primary" href={`#/guardrails?grant=${encodeURIComponent(task.grantId)}`}>{vi ? "Quản lý quyền" : "Manage permissions"}</a>}<a className="simple-secondary" href={`#/audit?grant=${encodeURIComponent(task.grantId)}`}>{vi ? "Xem kết quả" : "View results"}</a></div>}
  </section>;
}
