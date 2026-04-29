/** Quick Actions localStorage helper.
 *
 * MBT-182: unterstützt 1–4 Slots (FAB Radial-Menü, 4. Slot optional).
 */

const STORAGE_KEY = "mybaby-quick-actions";
const DEFAULT_ACTIONS = ["sleep", "feeding", "diaper"];
export const QUICK_ACTIONS_MAX = 4;

export function getQuickActions(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        Array.isArray(parsed) &&
        parsed.length >= 1 &&
        parsed.length <= QUICK_ACTIONS_MAX &&
        parsed.every((v) => typeof v === "string" && v.length > 0)
      ) {
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
