/** Header notification bell — shows badge when active alerts exist, dropdown on click. */

import { useState, useRef, useEffect } from "react";
import { Bell, AlertOctagon, AlertTriangle, Info, X } from "lucide-react";
import { useActiveChild } from "../context/ChildContext";
import { useActiveAlerts } from "../hooks/useAlerts";
import { dismissAlert, isAlertDismissed, buildAlertKey } from "../lib/alertDismiss";

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5 text-red" />;
    case "info":
      return <Info className="h-4 w-4 shrink-0 mt-0.5 text-sapphire" />;
    default:
      return <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow" />;
  }
}

function severityBorder(severity: string) {
  switch (severity) {
    case "critical": return "border-l-red";
    case "info": return "border-l-sapphire";
    default: return "border-l-yellow";
  }
}

export function AlertBell() {
  const { activeChild } = useActiveChild();
  const { data } = useActiveAlerts(activeChild?.id);
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const alerts = data?.alerts ?? [];
  const visibleAlerts = alerts.filter(
    (alert, i) => !isAlertDismissed(buildAlertKey(activeChild?.id, alert.type, i))
  );
  const count = visibleAlerts.length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-card bg-surface0 text-subtext0 hover:text-text transition-colors relative"
        aria-label={count > 0 ? `${count} aktive Warnungen` : "Keine Warnungen"}
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red border-2 border-mantle" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed left-2 right-2 top-[60px] w-auto max-w-none md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:max-w-[calc(100vw-2rem)] bg-surface0 border border-surface1 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-surface1 flex items-center justify-between">
            <span className="text-sm font-semibold text-text">Warnungen</span>
            <button
              onClick={() => setOpen(false)}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-surface1 transition-colors text-subtext0"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {count === 0 ? (
            <p className="px-4 py-6 text-sm text-subtext0 text-center">Keine aktiven Warnungen</p>
          ) : (
            <ul className="divide-y divide-surface1 max-h-80 overflow-y-auto">
              {alerts.map((alert, i) => {
                const alertKey = buildAlertKey(activeChild?.id, alert.type, i);
                if (isAlertDismissed(alertKey)) return null;
                return (
                  <li
                    key={alertKey}
                    className={`flex items-start gap-3 px-4 py-3 border-l-4 ${severityBorder(alert.severity)}`}
                  >
                    {severityIcon(alert.severity)}
                    <p className="text-sm text-text flex-1 leading-snug">{alert.message}</p>
                    <button
                      onClick={() => {
                        dismissAlert(alertKey);
                        setTick((t) => t + 1);
                      }}
                      className="shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-surface1 transition-colors text-subtext0"
                      aria-label="Warnung ausblenden"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
