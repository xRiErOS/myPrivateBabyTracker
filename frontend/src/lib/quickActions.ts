/** Quick Actions localStorage helper. */

const STORAGE_KEY = "mybaby-quick-actions";
const DEFAULT_ACTIONS = ["sleep", "feeding", "diaper"];

export function getQuickActions(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 3) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_ACTIONS;
}

export function setQuickActions(actions: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}
