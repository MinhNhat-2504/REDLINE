import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";

// Three seamless wave bands sliding at 9 / 14 / 22 s (the slowest in reverse).
// Reads as flowing water; used as the current under the hero and between the
// Protocol chapters. Colours are r,g,b triplets so a route accent (`--pg`)
// can be passed straight through.
const DEFAULT_COLORS: [string, string, string] = ["141,204,237", "223,195,140", "133,219,192"];

function wavePath(amp: number, y: number, phase: number): string {
  const pts: string[] = [];
  for (let x = 0; x <= 2000; x += 50) pts.push(`${x},${(y + amp * Math.sin((x / 2000) * Math.PI * 8 + phase)).toFixed(1)}`);
  return `M${pts[0]} L${pts.slice(1).join(" L")} L2000,200 L0,200 Z`;
}

export function WaterDivider({ height = 90, colors = DEFAULT_COLORS, className = "" }: {
  height?: number;
  colors?: [string, string, string];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`rl-water ${className}`.trim()} style={{ "--wh": `${height}px` } as CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 2000 200" preserveAspectRatio="none">
        <defs>
          {colors.map((c, i) => (
            <linearGradient key={i} id={`${id}-w${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: `rgb(${c})`, stopOpacity: 0.55 }} />
              <stop offset="1" style={{ stopColor: `rgb(${c})`, stopOpacity: 0 }} />
            </linearGradient>
          ))}
        </defs>
        <path className="w1" d={wavePath(18, 70, 0)} fill={`url(#${id}-w0)`} />
        <path className="w2" d={wavePath(12, 92, 1)} fill={`url(#${id}-w1)`} />
        <path className="w3" d={wavePath(24, 110, 2)} fill={`url(#${id}-w2)`} />
      </svg>
    </div>
  );
}

// A full-bleed water band between two story sections, with an optional caption pill.
export function StoryDivider({ children, colors }: { children?: ReactNode; colors?: [string, string, string] }) {
  return (
    <div className="rl-divider" aria-hidden={children ? undefined : true}>
      <WaterDivider height={120} colors={colors} />
      {children ? <div className="rl-divider-caption">{children}</div> : null}
    </div>
  );
}
