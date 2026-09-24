import type { CSSProperties } from "react";

// A run of chain links. Odd links lie flat (gold), even links stand on edge
// (info blue) so the row reads as an interlocked chain; each link glows in
// turn — the transaction moving link by link.
export function ChainLinks({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`rl-chain ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: count }, (_, k) => <i key={k} style={{ "--k": k } as CSSProperties} />)}
    </div>
  );
}

// Three interlocked links drawn as SVG — the connector between two gates.
export function ChainConnector() {
  return (
    <div className="lnk" aria-hidden="true">
      <svg viewBox="0 0 34 22">
        <rect x="1" y="6" width="14" height="10" rx="5" />
        <rect className="b" x="10" y="8" width="14" height="6" rx="3" />
        <rect x="19" y="6" width="14" height="10" rx="5" />
      </svg>
    </div>
  );
}
