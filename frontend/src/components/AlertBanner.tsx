/** Alert banner — shows active warnings in the dashboard. */

import { AlertTriangle } from "lucide-react";
import { useActiveChild } from "../context/ChildContext";
import { useActiveAlerts } from "../hooks/useAlerts";

export function AlertBanner() {
  const { activeChild } = useActiveChild();
  const { data } = useActiveAlerts(activeChild?.id);

  if (!data?.alerts.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {data.alerts.map((alert, i) => (
        <div
          key={`${alert.type}-${i}`}
          className={`flex items-start gap-2 rounded-lg px-3 py-2.5 ${
            alert.severity === "critical"
              ? "bg-red/15 text-red"
              : "bg-peach/15 text-peach"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-body text-sm">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}
