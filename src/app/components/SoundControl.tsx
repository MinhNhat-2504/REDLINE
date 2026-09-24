import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { setSoundEnabled, soundEnabled, subscribeSound } from "../lib/soundscape";

export function SoundControl() {
  const [enabled, setEnabled] = useState(soundEnabled);
  useEffect(() => subscribeSound(setEnabled), []);

  return (
    <button
      type="button"
      className="header-tool header-sound-trigger"
      aria-label={enabled ? "Turn interface sound off" : "Turn interface sound on"}
      aria-pressed={enabled}
      title={enabled ? "Sound on" : "Sound off"}
      onClick={() => setSoundEnabled(!enabled)}
    >
      {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      <span>{enabled ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
