/** Breastfeeding mode localStorage helper. */

const KEY = "mybaby-breastfeeding-enabled";

export function isBreastfeedingEnabled(): boolean {
  try {
    const val = localStorage.getItem(KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setBreastfeedingEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}
