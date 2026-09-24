import { Languages } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";

// The provider, the hook and a dozen translated components all existed;
// nothing rendered a way to switch. With "en" as the default, every visitor
// saw English and the Vietnamese half of the product was unreachable.
//
// The label shows the language you are IN, not the one you would get — the
// same convention as the DEVNET pill beside it: a state, not a command.
export function LanguageToggle() {
  const { lang, toggle } = useLang();
  const other = lang === "en" ? "vi" : "en";
  return (
    <button
      type="button"
      className="header-tool lang-toggle"
      onClick={toggle}
      aria-label={lang === "en" ? "Chuyển sang tiếng Việt" : "Switch to English"}
      title={lang === "en" ? "Tiếng Việt" : "English"}
      lang={other}
    >
      <Languages size={14} />
      <b>{lang.toUpperCase()}</b>
    </button>
  );
}
