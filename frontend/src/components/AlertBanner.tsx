/** Alert banner — shows active warnings in the dashboard. Dismissable for 6h. */

import { useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
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

export function AlertBanner() {
  const { activeChild } = useActiveChild();
  const { data } = useActiveAlerts(activeChild?.id);
  const [, setTick] = useState(0);

  if (!data?.alerts.length) return null;

  const visibleAlerts = data.alerts.filter(
    (alert, i) => !isAlertDismissed(`${activeChild?.id}-${alert.type}-${i}`)
  );

  if (!visibleAlerts.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {data.alerts.map((alert, i) => {
        const alertKey = `${activeChild?.id}-${alert.type}-${i}`;
        if (isAlertDismissed(alertKey)) return null;

        return (
          <div
            key={alertKey}
            className={`flex items-start gap-2 rounded-lg px-3 py-2.5 ${
              alert.severity === "critical"
                ? "bg-red/15 text-red"
                : alert.severity === "info"
                  ? "bg-blue/15 text-blue"
                  : "bg-peach/15 text-peach"
            }`}
          >
            {alert.severity === "info"
              ? <Info className="mt-0.5 h-4 w-4 shrink-0" />
              : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            }
            <p className="font-body text-sm flex-1">{alert.message}</p>
            <button
              onClick={() => {
                dismissAlert(alertKey);
                setTick((t) => t + 1);
              }}
              className="mt-0.5 shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center rounded hover:bg-black/10 transition-colors"
              aria-label="Warnung fuer 6 Stunden ausblenden"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
