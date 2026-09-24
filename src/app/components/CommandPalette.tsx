import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { color, mono, sans } from "../theme";
import { useT } from "../i18n/LanguageContext";

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`, this map supplies the Vietnamese side.
// Note: `label`/`description` on each CommandItem arrive pre-translated from
// the caller (see App.tsx) — only this file's own copy is translated here.
const VI: Record<string, string> = {
  "Navigate REDLINE": "Điều hướng REDLINE",
  "Search pages and protocol tools…": "Tìm trang và công cụ giao thức…",
  "Search pages": "Tìm trang",
  "Close command palette": "Đóng bảng lệnh",
  "No matching REDLINE page.": "Không có trang REDLINE nào khớp.",
  "Navigate": "Điều hướng",
  "Open": "Mở",
  "Close": "Đóng",
};

export interface CommandItem {
  label: string;
  description: string;
  shortcut: string;
  icon: React.ElementType;
  onSelect: () => void;
}

export function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: CommandItem[] }) {
  const tr = useT(VI);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? items.filter(item => `${item.label} ${item.description}`.toLowerCase().includes(needle)) : items;
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  useEffect(() => setActive(index => Math.min(index, Math.max(filtered.length - 1, 0))), [filtered.length]);

  const choose = (item: CommandItem | undefined) => {
    if (!item) return;
    item.onSelect();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="command-palette-backdrop"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={tr("Navigate REDLINE")}
            className="command-palette"
            initial={reduced ? false : { opacity: 0, y: -12, scale: .985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: .99 }}
            transition={{ duration: reduced ? 0 : .2 }}
          >
            <div className="command-palette-search">
              <Search size={17} />
              <input
                ref={inputRef}
                value={query}
                onChange={event => { setQuery(event.target.value); setActive(0); }}
                onKeyDown={event => {
                  if (event.key === "Escape") onClose();
                  if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(index + 1, filtered.length - 1)); }
                  if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
                  if (event.key === "Enter") choose(filtered[active]);
                }}
                placeholder={tr("Search pages and protocol tools…")}
                aria-label={tr("Search pages")}
              />
              <button type="button" onClick={onClose} aria-label={tr("Close command palette")}><X size={16} /></button>
            </div>
            <div className="command-palette-list" role="listbox">
              {filtered.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    className={index === active ? "is-active" : ""}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(item)}
                    role="option"
                    aria-selected={index === active}
                  >
                    <span className="command-palette-icon"><Icon size={16} /></span>
                    <span className="command-palette-copy">
                      <strong style={sans}>{item.label}</strong>
                      <small style={sans}>{item.description}</small>
                    </span>
                    <kbd style={mono}>{item.shortcut}</kbd>
                    <ArrowRight size={14} />
                  </button>
                );
              })}
              {filtered.length === 0 && <div className="command-palette-empty" style={{ ...sans, color: color.textMuted }}>{tr("No matching REDLINE page.")}</div>}
            </div>
            <footer style={mono}><span>↑↓ {tr("Navigate")}</span><span>↵ {tr("Open")}</span><span>Esc {tr("Close")}</span></footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
