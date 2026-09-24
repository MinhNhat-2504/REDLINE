import { useEffect, useState } from "react";
import { ExternalLink, TrendingUp } from "lucide-react";
import { api, short, type ProtocolRevenue as Revenue } from "../lib/api";
import { explorerTransactionUrl } from "../solana/client";
import { useT } from "../i18n/LanguageContext";

const VI: Record<string, string> = {
  "Protocol revenue": "Doanh thu giao thức",
  "all time": "tổng cộng",
  "Last 24h": "24h qua",
  "of rentals": "của lượt thuê",
  "Gross volume": "Tổng khối lượng",
  "rentals carrying a fee": "lượt thuê có phí",
  "Paid rentals": "Lượt thuê đã trả",
  "to": "về",
  "MARKETPLACE REVENUE": "DOANH THU MARKETPLACE",
  "of every rental, split out in the same transaction that pays the publisher and verified on-chain before the rental is recorded.": "của mỗi lượt thuê, tách ra trong cùng giao dịch trả cho người xuất bản và được xác minh on-chain trước khi ghi nhận lượt thuê.",
  "fee": "phí",
  "of": "trên",
};

const LAMPORTS_PER_SOL = 1_000_000_000;
const sol = (lamports: string) => (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);

/**
 * What the marketplace take rate has actually collected.
 *
 * docs/BUSINESS_MODEL.md claimed a 10% fee on rental revenue long before any
 * code took one. This panel exists because the difference between a business
 * model and a paragraph is whether you can point at the transactions — every
 * figure here is summed from rental rows, and each row links to the payment on
 * Explorer so a reader can add it up themselves.
 *
 * It renders nothing when no fee is configured rather than showing zeros: a
 * deployment that charges nothing has no revenue to report, and an empty
 * dashboard reads as a broken one.
 */
export function ProtocolRevenuePanel() {
  const tr = useT(VI);
  const [data, setData] = useState<Revenue | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => api.protocolRevenue().then(d => { if (live) setData(d); }).catch(() => { /* panel simply stays hidden */ });
    void load();
    const t = setInterval(load, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  if (!data?.enabled) return null;

  const cells = [
    { label: tr("Protocol revenue"), value: `${sol(data.protocolRevenueLamports)} SOL`, hint: tr("all time") },
    { label: tr("Last 24h"), value: `${sol(data.revenue24hLamports)} SOL`, hint: `${data.feeBps / 100}% ${tr("of rentals")}` },
    { label: tr("Gross volume"), value: `${sol(data.grossVolumeLamports)} SOL`, hint: tr("rentals carrying a fee") },
    { label: tr("Paid rentals"), value: String(data.rentalsCharged), hint: data.treasury ? `${tr("to")} ${short(data.treasury, 4)}` : "" },
  ];

  return (
    <section className="panel protocol-revenue">
      <header className="protocol-revenue-head">
        <span className="chip chip-info"><TrendingUp size={12} />{tr("MARKETPLACE REVENUE")}</span>
        <p className="help">
          {data.feeBps / 100}% {tr("of every rental, split out in the same transaction that pays the publisher and verified on-chain before the rental is recorded.")}
        </p>
      </header>
      <div className="protocol-revenue-grid">
        {cells.map(c => (
          <div key={c.label} className="protocol-revenue-cell">
            <small>{c.label}</small>
            <strong>{c.value}</strong>
            <em>{c.hint}</em>
          </div>
        ))}
      </div>
      {data.recent.length > 0 && (
        <ul className="protocol-revenue-list">
          {data.recent.slice(0, 5).map(r => (
            <li key={r.hireId}>
              <span>{r.agent}</span>
              <span>{sol(r.protocolFeeLamports)} SOL {tr("fee")}</span>
              <span>{tr("of")} {sol(r.paidLamports)} SOL</span>
              {r.signature && !r.signature.startsWith("MOCK") ? (
                <a href={explorerTransactionUrl(r.signature)} target="_blank" rel="noreferrer">
                  {short(r.signature, 4)} <ExternalLink size={10} />
                </a>
              ) : <span>{r.signature ? short(r.signature, 4) : "—"}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
