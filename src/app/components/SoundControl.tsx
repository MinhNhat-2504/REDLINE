import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { setSoundEnabled, soundEnabled, subscribeSound } from "../lib/soundscape";
import { useT } from "../i18n/LanguageContext";

const VI: Record<string, string> = {
  "Turn interface sound off": "Tắt âm thanh giao diện",
  "Turn interface sound on": "Bật âm thanh giao diện",
  "Sound on": "Đang bật âm thanh",
  "Sound off": "Đang tắt âm thanh",
};

export function SoundControl() {
  const tr = useT(VI);
  const [enabled, setEnabled] = useState(soundEnabled);
  useEffect(() => subscribeSound(setEnabled), []);

  return (
    <button
      type="button"
      className="header-tool header-sound-trigger"
      aria-label={tr(enabled ? "Turn interface sound off" : "Turn interface sound on")}
      aria-pressed={enabled}
      title={tr(enabled ? "Sound on" : "Sound off")}
      onClick={() => setSoundEnabled(!enabled)}
    >
      {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      <span>{tr(enabled ? "Sound on" : "Sound off")}</span>
    </button>
  );
}
