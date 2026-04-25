/** Shared localStorage dismiss logic for AlertBanner and AlertBell. */

export const DISMISS_KEY = "mybaby_dismissed_alerts";
export const DISMISS_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export function getDismissedAlerts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function dismissAlert(alertKey: string): void {
  const dismissed = getDismissedAlerts();
  dismissed[alertKey] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
}

export function isAlertDismissed(alertKey: string): boolean {
  const dismissed = getDismissedAlerts();
  const ts = dismissed[alertKey];
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DURATION_MS;
}

export function buildAlertKey(childId: number | undefined, type: string, index: number): string {
  return `${childId}-${type}-${index}`;
}
