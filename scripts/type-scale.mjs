// One typeface, and a floor under the smallest text.
//
// The artboards set display accents in Georgia. Georgia has no precomposed
// Vietnamese glyphs, so "Quyền" rendered as "Quyê`n" — the browser stacking a
// loose combining accent beside the letter — the moment the dashboard gained a
// Vietnamese mode. Inter, which the headings already use, covers Vietnamese
// properly, so the serif role now points at it and the italic carries the
// emphasis the second typeface used to.
//
// The floor exists because the artboards were drawn at 1440px with labels down
// to 7–8px. That is below comfortable reading size on an ordinary laptop, and
// Vietnamese diacritics make it worse: a stacked "ệ" at 8px is a smudge. Only
// text under 12px moves, and by at most 1.5px, so fixed-height chips and table
// rows keep their shape.
export const SANS_STACK = "'Inter',system-ui,-apple-system,'Segoe UI',sans-serif";

export const raise = (px) => (px < 9 ? 9.5 : px < 10 ? 10.5 : px < 11 ? 11.5 : px < 12 ? 12 : px);

export function unifyType(css) {
  return css
    .replace(/--serif\s*:[^;]+;/g, `--serif:${SANS_STACK};`)
    .replace(/Georgia\s*,\s*(?:'Times New Roman'\s*,\s*)?serif/g, SANS_STACK)
    .replace(/(font-size\s*:\s*)(\d+(?:\.\d+)?)px/g, (_, p, n) => `${p}${raise(+n)}px`)
    .replace(/(\bfont\s*:\s*[^;{}]*?)(\d+(?:\.\d+)?)px/g, (_, p, n) => `${p}${raise(+n)}px`);
}
