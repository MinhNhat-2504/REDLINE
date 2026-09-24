import type { CSSProperties } from "react";
import { VoxelCube, type VoxelTone } from "./VoxelCube";

// A small pile of voxels standing on its own shadow.
//
// A single cube floats; it reads as an icon. Three of them overlapping, with a
// soft ellipse of shadow underneath, read as objects resting on the page — the
// same trick the artboards use for the banner cluster, packaged so the panels
// built outside the artboards can carry the motif too. Decorative only.
export function VoxelStack({ size = 16, tones = ["gold", "info", "ok"], className = "" }: {
  size?: number;
  tones?: VoxelTone[];
  className?: string;
}) {
  return (
    <span className={`vox-stack ${className}`.trim()} style={{ "--vs": `${size}px` } as CSSProperties} aria-hidden="true">
      {tones.map((tone, i) => <VoxelCube key={i} size={size} tone={tone} />)}
      <i className="vox-ground" />
    </span>
  );
}
