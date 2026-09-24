import { Fragment } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import type { ProtocolOverview } from "../../lib/api";
import { ChainConnector } from "./ChainLinks";
import { VoxelCube } from "./VoxelCube";

// The seven gates as extruded slabs joined by chain links, with a proposal
// that rides the rail on a 24-second loop: the first passes every gate and
// lights the vault; the second is refused at gate 06 and nothing moves.
// The choreography is CSS (astral-depth.css, rl-gate-*, rl-runner) so it
// costs nothing on the main thread; reduced-motion collapses it to a still.
//
// Gate labels come from the API (ProtocolOverview.gates) so the rail always
// shows what the program actually enforces; reason codes are the on-chain
// error names, set in mono like every other verifiable value.
const REASON_FALLBACK = ["REVOKED", "EXPIRED", "NONCE_REPLAY", "MINT_NOT_ALLOWED", "DESTINATION_NOT_ALLOWED", "SPEND_CAP_EXCEEDED", "COOLDOWN_ACTIVE"];

export function GateChain({ gates, tr = (s: string) => s }: {
  gates: ProtocolOverview["gates"];
  tr?: (s: string) => string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="gate-chain-wrap">
      <div className="gate-chain">
        <div className="flow" role="list" aria-label={tr("Policy gates")}>
          {!reduced && (
            <div className="runner" aria-hidden="true">
              <VoxelCube size={26} tone="info" />
            </div>
          )}
          <div className="ep agent" aria-hidden="true"><VoxelCube size={28} />AGENT</div>
          {gates.map((gate, i) => (
            <Fragment key={gate.id}>
              <ChainConnector />
              <div className={`g3 k${i}`} role="listitem" style={{ "--k": i } as CSSProperties} title={`${tr(gate.label)}: ${tr(gate.detail)}`}>
                <div className="front">
                  <span className="gs" aria-hidden="true" />
                  <span className="gi">0{gate.id}</span>
                  <div>
                    <div className="gl">{tr(gate.label)}</div>
                    <div className="gc">{gate.reasonCodes[0] ?? REASON_FALLBACK[i] ?? ""}</div>
                  </div>
                </div>
              </div>
            </Fragment>
          ))}
          <ChainConnector />
          <div className="ep vault" aria-hidden="true"><VoxelCube size={28} tone="ok" />VAULT</div>
        </div>
        <div className="floor" aria-hidden="true" />
        <div className="legend">
          <span><i style={{ background: "#8dcced" }} />{tr("PROPOSAL")}</span>
          <span><i style={{ background: "#85dbc0" }} />{tr("GATE PASSED")}</span>
          <span><i style={{ background: "#ff93a4" }} />{tr("GATE REFUSED · NOTHING MOVES")}</span>
          {!reduced && <span style={{ marginLeft: "auto" }}>{tr("LOOP · 24 S · TWO PROPOSALS")}</span>}
        </div>
      </div>
    </div>
  );
}
