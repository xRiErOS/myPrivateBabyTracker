/** Alert banner — shows active warnings in the dashboard. Dismissable for 6h.

Layout:
- Mobile: Stacked (flex-col)
- Desktop: Grid nebeneinander (grid-cols-2 oder 3), max-width pro Kachel
- Visually staerker: groessere Icons (h-5 w-5), kraeftigere Hintergrundfarben
*/

import { useState } from "react";
import { AlertOctagon, AlertTriangle, Info, X } from "lucide-react";
import { useActiveChild } from "../context/ChildContext";
import { useActiveAlerts } from "../hooks/useAlerts";

const DISMISS_KEY = "mybaby_dismissed_alerts";
const DISMISS_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

function getDismissedAlerts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function dismissAlert(alertKey: string): void {
  const dismissed = getDismissedAlerts();
  dismissed[alertKey] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
}

function isAlertDismissed(alertKey: string): boolean {
  const dismissed = getDismissedAlerts();
  const ts = dismissed[alertKey];
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DURATION_MS;
}

function severityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return {
        container: "bg-red/20 border border-red/40 text-red",
        icon: <AlertOctagon className="h-5 w-5 shrink-0 mt-0.5" />,
      };
    case "info":
      return {
        container: "bg-sapphire/15 border border-sapphire/30 text-sapphire",
        icon: <Info className="h-5 w-5 shrink-0 mt-0.5" />,
      };
    default: // warning
      return {
        container: "bg-yellow/20 border border-yellow/40 text-yellow",
        icon: <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />,
      };
  }
}

export function AlertBanner() {
  const { activeChild } = useActiveChild();
  const { data } = useActiveAlerts(activeChild?.id);
  const [, setTick] = useState(0);

  if (!data?.alerts.length) return null;

  const visibleAlerts = data.alerts.filter(
    (alert, i) => !isAlertDismissed(`${activeChild?.id}-${alert.type}-${i}`)
  );

  if (!visibleAlerts.length) return null;

  // Responsive grid: 1 col on mobile, 2+ cols on sm+ (max 3 per row)
  const gridCols =
    visibleAlerts.length === 1
      ? "grid-cols-1"
      : visibleAlerts.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-2 ${gridCols}`}>
      {data.alerts.map((alert, i) => {
        const alertKey = `${activeChild?.id}-${alert.type}-${i}`;
        if (isAlertDismissed(alertKey)) return null;

        const { container, icon } = severityStyles(alert.severity);

        return (
          <div
            key={alertKey}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 ${container}`}
          >
            {icon}
            <p className="font-body text-sm font-medium flex-1 leading-snug">{alert.message}</p>
            <button
              onClick={() => {
                dismissAlert(alertKey);
                setTick((t) => t + 1);
              }}
              className="shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
              aria-label="Warnung fuer 6 Stunden ausblenden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
