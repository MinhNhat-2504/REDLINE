import type { CSSProperties } from "react";

// One voxel: three tinted faces on a preserve-3d box. Purely decorative —
// it carries no meaning of its own, so it is hidden from assistive tech.
// Styles live in src/styles/astral-depth.css (.vox).
export type VoxelTone = "gold" | "ok" | "bad" | "info";

const TONE_CLASS: Record<VoxelTone, string> = { gold: "", ok: "vox-ok", bad: "vox-bad", info: "vox-info" };

export function VoxelCube({ size = 56, tone = "gold", label, solid = false, className = "", style }: {
  size?: number;
  tone?: VoxelTone;
  label?: string;
  solid?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`vox ${TONE_CLASS[tone]} ${solid ? "vox-solid" : ""} ${className}`.trim()}
      style={{ "--vs": `${size}px`, ...style } as CSSProperties}
      aria-hidden="true"
    >
      <i className="r" /><i className="t" /><i className="f" />
      {label ? <span className="lb">{label}</span> : null}
    </div>
  );
}
