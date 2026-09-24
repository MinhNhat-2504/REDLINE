import type { CSSProperties } from "react";

// Astral palette. Keep these in sync with semantic CSS variables in astral.css.
export const color = {
  bg: "#080d19", canvasDeep: "#080d19", surface: "#121c30", surfaceSubtle: "#17243a", surfaceInset: "#0c1425",
  border: "#2d3b53", borderStrong: "#60728e",
  text: "#f2eee5", textSecondary: "#c4cddd", textMuted: "#afbbcf", textDim: "#9fadc3",
  primary: "#dfc38c", primaryText: "#eed5a3",
  info: "#8dcced", verified: "#85dbc0", blocked: "#ff93a4", warn: "#f1c678", danger: "#ff93a4", success: "#85dbc0",
  onAccent: "#101827",
} as const;
export const term = {
  bg: "#0b1424", text: "#d4dfef", dim: "#a8b8d0", faint: "#96a8c4",
  success: "#85dbc0", info: "#8dcced", warn: "#f1c678", danger: "#ff93a4",
} as const;
export const tint = (hex: string, alpha = 0.14) => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
export const glow = { cyan: "#8dcced", violet: "#b9a4f5", primaryBright: "#eed5a3" } as const;
export const glowShadow = (hex: string, alpha = 0.45, blur = 26): string => `0 0 ${blur}px ${tint(hex, alpha)}`;
export const mono: CSSProperties = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
export const sans: CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };
export const panel = (extra?: CSSProperties): CSSProperties => ({ background: color.surface, border: `1px solid ${color.border}`, boxShadow: "0 18px 48px #00000025", ...extra });
export const inset = (extra?: CSSProperties): CSSProperties => ({ background: color.surfaceSubtle, border: `1px solid ${color.border}`, ...extra });
export const chip = (c: string): CSSProperties => ({ background: tint(c, .16), color: c, border: `1px solid ${tint(c, .34)}` });
