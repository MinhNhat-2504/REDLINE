import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Whole-app English/Vietnamese toggle.
//
// There is no translation-key catalogue here on purpose: each component that
// has user-facing copy keeps a small local `{ en: {...}, vi: {...} }` object
// next to the JSX that uses it (see any component that imports `useLang`).
// That keeps a string and its translation on the same screen while editing,
// and means two components never fight over one shared dictionary file.
export type Lang = "en" | "vi";

const STORAGE_KEY = "redline-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "vi") return saved;
  } catch {
    // Private browsing / storage disabled — fall back to the default below.
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore — the toggle still works for this session, it just won't persist.
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang: setLangState,
    toggle: () => setLangState(l => (l === "en" ? "vi" : "en")),
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}

// Convenience for the common `const t = pick(lang, { en: {...}, vi: {...} })`
// shape used across components — keeps the two variants type-locked together.
export function pick<T>(lang: Lang, dict: { en: T; vi: T }): T {
  return dict[lang];
}

// The other, more common shape: a component keeps one `VI` map of
// `{ "English source string": "Vietnamese translation" }` right next to its
// JSX, and wraps each piece of copy as `t("English source string")`. In
// English mode (or for any string with no entry yet) it just returns the
// string unchanged, so a partially-translated file never shows a blank —
// worst case it silently falls back to English for that one line.
export function useT(dict: Record<string, string>): (source: string) => string {
  const { lang } = useLang();
  return (source: string) => (lang === "vi" ? dict[source] ?? source : source);
}
