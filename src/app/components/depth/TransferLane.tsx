import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { subscribeFeed, type FeedEvent } from "../../lib/api";
import { VoxelCube } from "./VoxelCube";

// The live transfer lane: AGENT → seven gate pips → VAULT. It listens to the
// same SSE feed the grants panel uses and replays what the program decided:
//   intent.created            → a proposal (coin) leaves the agent
//   tx.confirmed              → every gate lights green, the vault glows
//   tx.rejected / precheck    → the coin stops at the refusing gate, which turns red
// Nothing here is simulated: with no events the lane simply sits idle.

const GATES: [string, string][] = [
  ["01", "Active grant"], ["02", "Time window"], ["03", "Fresh intent"], ["04", "Allowed asset"],
  ["05", "Allowed recipient"], ["06", "Budget envelope"], ["07", "Execution pace"],
];
const REASON_GATE: Record<string, number> = {
  REVOKED: 0, GRANT_REVOKED: 0, EXPIRED: 1, GRANT_EXPIRED: 1, NONCE_REPLAY: 2, NONCE_REUSED: 2,
  MINT_NOT_ALLOWED: 3, DESTINATION_NOT_ALLOWED: 4, SPEND_CAP_EXCEEDED: 5, TX_CAP_EXCEEDED: 5, COOLDOWN_ACTIVE: 6,
};
// Centre of each gate pip as a share of the track (110px endpoints, 7 equal cells).
const GATE_STOP = (k: number) => `${(12 + (k + 0.5) * (76 / 7)).toFixed(1)}%`;

type Phase = "idle" | "fly" | "land" | "block";

export function TransferLane({ tr = (s: string) => s, className = "" }: { tr?: (s: string) => string; className?: string }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [gate, setGate] = useState<number>(-1);
  const [last, setLast] = useState<string>("");
  const timer = useRef<number | undefined>(undefined);
  // `tr` is a fresh closure on every render; subscribe once and read it through a ref.
  const trRef = useRef(tr); trRef.current = tr;

  useEffect(() => {
    const tr = (s: string) => trRef.current(s);
    const settle = (next: Phase, text: string, hold: number) => {
      window.clearTimeout(timer.current);
      setPhase(next); setLast(text);
      timer.current = window.setTimeout(() => { setPhase("idle"); setGate(-1); }, hold);
    };
    const off = subscribeFeed("*", (e: FeedEvent) => {
      const p = e.payload as Record<string, unknown>;
      switch (e.eventType) {
        case "intent.created":
          window.clearTimeout(timer.current); setGate(-1); setPhase("fly");
          setLast(`${tr("PROPOSAL IN FLIGHT")} · #${String(p.nonce ?? "")}`);
          break;
        case "tx.confirmed":
          settle("land", tr("ALLOWED · FUNDS MOVED · SIGNATURE RECORDED"), 4200);
          break;
        case "tx.rejected":
        case "chain.tx_failed": {
          const code = String(p.reasonCode ?? p.variant ?? p.code ?? "");
          setGate(REASON_GATE[code] ?? 6);
          settle("block", `${tr("REFUSED")} · ${code || tr("GATE")} · ${tr("NOTHING MOVED")}`, 4600);
          break;
        }
        case "decision.precheck":
          if (p.allow === false) {
            const code = String(p.reasonCode ?? "");
            setGate(REASON_GATE[code] ?? 6);
            settle("block", `${tr("REFUSED AT PRECHECK")} · ${code}`, 4600);
          }
          break;
        default:
          break;
      }
    });
    return () => { off(); window.clearTimeout(timer.current); };
  }, []);

  const gateState = (k: number) => {
    if (phase === "land") return "passed";
    if (phase === "block") return k < gate ? "passed" : k === gate ? "blocked" : "skipped";
    if (phase === "fly") return "passing";
    return "idle";
  };

  return (
    <section className={`transfer-lane ${className}`.trim()} data-phase={phase} style={{ "--stop": GATE_STOP(gate < 0 ? 6 : gate) } as CSSProperties} aria-label={tr("Live transfer lane")}>
      <div className="lane-head">
        <span className="lane-eyebrow">{tr("LIVE TRANSFER LANE")}</span>
        <span className="lane-live"><i />{tr("SSE")}</span>
      </div>
      {!reduced && phase !== "idle" && <div className="coin" aria-hidden="true"><VoxelCube size={20} /></div>}
      <div className="track">
        <div className="ep agent" aria-hidden="true"><VoxelCube size={24} tone="info" />AGENT</div>
        {GATES.map(([idx, label], k) => (
          <div key={idx} className="mg" data-state={gateState(k)} style={{ "--k": k } as CSSProperties}>
            <b>{idx}</b><small>{tr(label)}</small>
          </div>
        ))}
        <div className="ep vault" aria-hidden="true"><VoxelCube size={24} tone="ok" />VAULT</div>
      </div>
      <div className="lane-status" role="status">
        <span className="dot" /><b>{phase === "idle" ? tr("IDLE · WAITING FOR THE AGENT") : last}</b>
        <span className="hint">{tr("START AN AGENT OR FORCE A PROPOSAL — THE LANE REPLAYS WHAT THE PROGRAM DECIDES")}</span>
      </div>
    </section>
  );
}
