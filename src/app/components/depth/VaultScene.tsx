import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { VoxelCube } from "./VoxelCube";
import { WaterDivider } from "./WaterDivider";
import vaultArt from "../../../assets/redline-treasury-core.webp";

// The vault as a physical stack: one solid cube per 1,000 dUSDC (capped at
// twelve so the stack never outgrows the stage), a glowing platform, and the
// live balance above. A cube that appears since the last render drops in; a
// cube that disappears flies out toward the wallet. Balance is the real
// on-chain figure the panel already loads — this only draws it.
const UNIT = 1_000;
const MAX_CUBES = 12;

export function VaultScene({ balanceUnits, busy, exists, label }: {
  balanceUnits: string | null | undefined;
  busy?: string;
  exists?: boolean;
  label: string;
}) {
  const balance = balanceUnits ? Number(balanceUnits) / 1e6 : null;
  const cubes = balance === null ? 0 : Math.min(MAX_CUBES, Math.max(0, Math.floor(balance / UNIT)));
  const prev = useRef(cubes);
  const [dropIdx, setDropIdx] = useState(-1);
  const [outIdx, setOutIdx] = useState(-1);

  useEffect(() => {
    if (cubes > prev.current) { setDropIdx(cubes - 1); setOutIdx(-1); }
    else if (cubes < prev.current) { setOutIdx(prev.current - 1); setDropIdx(-1); }
    prev.current = cubes;
    const t = window.setTimeout(() => { setDropIdx(-1); setOutIdx(-1); }, 1200);
    return () => window.clearTimeout(t);
  }, [cubes]);

  const cols = 3;
  const columns = Array.from({ length: cols }, (_, c) => Array.from({ length: cubes }, (_, i) => i).filter(i => i % cols === c));

  return (
    <div className="vault-scene" data-busy={busy || undefined} aria-hidden="true">
      <img src={vaultArt} alt="" loading="lazy" decoding="async" />
      <div className="wash" />
      <WaterDivider height={110} colors={["13,155,116", "141,204,237", "133,219,192"]} />
      <div className="vault-stage">
        <div className="vault-label">
          <small>{label}</small>
          <b>{balance === null ? "—" : balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
          <span>{exists === false ? "vault not initialised" : `dUSDC · each cube = ${UNIT.toLocaleString()}`}</span>
        </div>
        <div className="platform" />
        <div className="vstack">
          {columns.map((col, c) => (
            <div key={c} className="vcol">
              {col.map(i => (
                <VoxelCube key={i} size={46} tone={i % 2 ? "ok" : "gold"} solid
                  className={i === dropIdx ? "drop" : ""}
                  style={{ "--vc": i % 2 ? "133,219,192" : "13,155,116" } as CSSProperties} />
              ))}
              {outIdx >= 0 && outIdx % cols === c && <VoxelCube size={46} tone="ok" solid className="out" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
