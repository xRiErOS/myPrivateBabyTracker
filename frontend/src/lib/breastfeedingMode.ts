/** Breastfeeding / feeding mode localStorage helpers. */

const KEY = "mybaby-breastfeeding-enabled";
const HYBRID_KEY = "mybaby-feeding-hybrid";

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

export function isFeedingHybrid(): boolean {
  try {
    return localStorage.getItem(HYBRID_KEY) === "true";
  } catch {
    return false;
  }
}

export function setFeedingHybrid(enabled: boolean): void {
  try {
    localStorage.setItem(HYBRID_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}
