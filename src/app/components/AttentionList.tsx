import { useLang } from "../i18n/LanguageContext";
import { attentionItems } from "../lib/attention";
import type { AgentRun, Grant } from "../lib/api";
export function AttentionList({ owner, grants, runs, stale, now }: { owner: string; grants: Grant[]; runs: AgentRun[]; stale: boolean; now: number }) {
  const { lang } = useLang();
  const vi = lang === "vi";
  const items = attentionItems(owner, grants, runs, now);
  if (!items.length && !stale) return null;
  const groups = new Map<string, typeof items>();
  items.forEach(item => groups.set(item.grantId, [...(groups.get(item.grantId) ?? []), item]));
  return <section className="p1-attention compact-attention"><h2>{vi ? "Cần xử lý" : "Needs attention"}</h2>{stale && <p role="status">{vi ? "Dữ liệu cũ — kiểm tra lại trước khi thao tác." : "Stale data — verify before acting."}</p>}<ul>{[...groups].map(([id, group]) => {
    const failed = group.find(item => item.kind === "failed");
    return <li key={id}><div><strong>{group[0].agent}</strong><div className="compact-alert-tags">{group.map(item => <span key={item.id}>{item.kind === "expiry" ? (vi ? "Hết hạn ≤ 6 giờ" : "Expires in ≤ 6h") : item.kind === "budget" ? (vi ? "Đã dùng ≥ 80%" : "Budget ≥ 80% used") : (vi ? "Lượt chạy lỗi" : "Run failed")}</span>)}</div></div><div className="p1-actions"><a className="simple-secondary" href={`#/guardrails?grant=${encodeURIComponent(id)}`}>{vi ? "Xem quyền" : "View policy"}</a>{failed && <a className="simple-secondary" href={`#/audit?grant=${encodeURIComponent(id)}&run=${encodeURIComponent(failed.runId!)}`}>{vi ? "Xem lỗi" : "View error"}</a>}</div></li>;
  })}</ul></section>;
}
