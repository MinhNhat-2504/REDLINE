export type ExperiencePreference = "depth" | "motion";
export function readPreference(key: ExperiencePreference): boolean {
  try {
    return localStorage.getItem(`redline-${key}`) !== "off";
  } catch {
    return true;
  }
}
export function applyPreference(key: ExperiencePreference, enabled: boolean) {
  document.documentElement.dataset[key] = enabled ? "on" : "off";
  try {
    localStorage.setItem(`redline-${key}`, enabled ? "on" : "off");
  } catch {
    /* Storage can be disabled. The current session still works. */
  }
}
