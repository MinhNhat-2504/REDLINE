export type SoundCue = "navigate" | "success" | "warning" | "error" | "select";

const STORAGE_KEY = "redline.sound.enabled";
const CHANGE_EVENT = "redline:sound-change";
let audioContext: AudioContext | null = null;

export function soundEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; }
  catch { return false; }
}

export function setSoundEnabled(enabled: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* session-only fallback */ }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: enabled }));
  if (enabled) playSound("success", true);
}

export function subscribeSound(listener: (enabled: boolean) => void): () => void {
  const onChange = (event: Event) => listener(Boolean((event as CustomEvent<boolean>).detail));
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

const patterns: Record<SoundCue, Array<[frequency: number, offset: number, duration: number, volume: number]>> = {
  navigate: [[330, 0, .055, .025], [494, .045, .075, .022]],
  select: [[440, 0, .045, .018]],
  success: [[392, 0, .07, .025], [523, .065, .09, .028], [659, .14, .12, .026]],
  warning: [[294, 0, .09, .024], [247, .085, .13, .022]],
  error: [[220, 0, .1, .025], [165, .075, .16, .023]],
};

/** Short synthesized UI cues: no downloads, autoplay, or background audio. */
export function playSound(cue: SoundCue, force = false): void {
  if ((!force && !soundEnabled()) || document.visibilityState === "hidden") return;
  try {
    const AudioContextCtor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    audioContext ??= new AudioContextCtor();
    if (audioContext.state === "suspended") void audioContext.resume();
    const start = audioContext.currentTime + .01;
    for (const [frequency, offset, duration, volume] of patterns[cue]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = cue === "error" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start + offset);
      gain.gain.setValueAtTime(.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(volume, start + offset + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, start + offset + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + duration + .02);
    }
  } catch { /* sound must never interrupt a financial action */ }
}
