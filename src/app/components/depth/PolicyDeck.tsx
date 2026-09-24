import type { CSSProperties } from "react";
import { fmtUsdc, grantExpiresAt, short, type Grant } from "../../lib/api";

// The owner's grants as physical policy cards fanned in 3D: the active grant
// in front, revoked or expired ones behind. Click a card to bring it forward
// (the panel below scrolls to it and opens its proposals).
export function PolicyDeck({ grants, selected, onSelect, tr = (s: string) => s }: {
  grants: Grant[];
  selected?: string;
  onSelect?: (grantId: string) => void;
  tr?: (s: string) => string;
}) {
  const now = Date.now();
  const ranked = [...grants].sort((a, b) => {
    const live = (g: Grant) => (g.revoked || grantExpiresAt(g) < now ? 1 : 0);
    return live(a) - live(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, 3);
  if (ranked.length === 0) return null;
  const front = selected && ranked.some(g => g.id === selected) ? selected : ranked[0].id;
  const order = [ranked.find(g => g.id === front)!, ...ranked.filter(g => g.id !== front)];

  return (
    <div className="policy-deck" style={{ "--n": order.length } as CSSProperties}>
      {order.map((g, i) => {
        const spent = Number(g.onchain?.spentUnits ?? g.spentUnits);
        const cap = Number(g.onchain?.spendCapUnits ?? g.policyVersion.spendCapUnits);
        const pct = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
        const expired = grantExpiresAt(g) < now;
        const dead = g.revoked || expired;
        const left = Math.max(0, grantExpiresAt(g) - now);
        const leftText = dead ? (g.revoked ? tr("revoked") : tr("expired")) : left > 36e5 ? `${Math.round(left / 36e5)}h ${tr("left")}` : `${Math.max(1, Math.round(left / 6e4))}m ${tr("left")}`;
        return (
          <button type="button" key={g.id} className={`gcard c${i}${dead ? " dead" : ""}`} onClick={() => onSelect?.(g.id)} aria-pressed={g.id === front}
            title={`${g.agentVersion.name} ${g.agentVersion.version} · ${short(g.grantPda)}`}>
            <div className="row">
              <span className="chipset" />
              <span className={`state ${dead ? "bad" : "ok"}`}>● {g.revoked ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE"}</span>
            </div>
            <div className="who"><b>{g.agentVersion.name}</b><small>{g.agentVersion.version} · grant {short(g.grantPda)}</small></div>
            <div className="nums">
              <div><small>{tr("SPENT / CAP")}</small><b>{fmtUsdc(spent)} / {fmtUsdc(cap)}</b></div>
              <div><small>TX</small><b>{g.onchain?.transactionCount ?? g.transactionCount} / {g.onchain?.maxTransactions ?? g.policyVersion.maxTransactions}</b></div>
              <div><small>{tr("TIME")}</small><b>{leftText}</b></div>
            </div>
            <div className={`bar${dead ? " bad" : ""}`}><i style={{ width: `${pct}%` }} /></div>
            <span className="stamp">{dead ? tr("CLOSED · NOTHING MORE CAN MOVE") : tr("SIGNED ON-CHAIN · SHA-256")}</span>
          </button>
        );
      })}
    </div>
  );
}
