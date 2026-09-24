import { useState, type CSSProperties } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { color, mono } from "../theme";
import { useT } from "../i18n/LanguageContext";

// English is the source language here too — every string below is written
// in English and wrapped as `tr("...")`, this map supplies the Vietnamese side.
const VI: Record<string, string> = {
  "Copied to clipboard": "Đã sao chép",
  "Couldn't copy — your browser blocked clipboard access.": "Không sao chép được — trình duyệt đã chặn quyền truy cập clipboard.",
  "Copy": "Copy",
};

// The one web3 affordance every wallet, explorer and dapp header has and
// this one didn't: click a truncated address to copy the real one. `sonner`
// was already a dependency with an unused <Toaster/> wrapper sitting idle —
// this is what it was for.
export function CopyChip({
  value,
  label,
  title,
  toastLabel,
  style,
  iconSize = 11,
}: {
  value: string;
  label: string;
  title?: string;
  /** Shown in the copy confirmation toast. Defaults to a generic message. */
  toastLabel?: string;
  style?: CSSProperties;
  iconSize?: number;
}) {
  const tr = useT(VI);
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(tr("Copied to clipboard"), toastLabel ? { description: toastLabel } : undefined);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(tr("Couldn't copy — your browser blocked clipboard access."));
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={title ?? `${tr("Copy")} ${value}`}
      className="inline-flex items-center gap-1 align-middle"
      style={{ ...mono, fontSize: "inherit", fontWeight: "inherit", lineHeight: "inherit", color: "inherit", ...style }}
    >
      <span>{label}</span>
      {copied
        ? <Check size={iconSize} style={{ color: color.verified }} />
        : <Copy size={iconSize} style={{ opacity: .45 }} />}
    </button>
  );
}
