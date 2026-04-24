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
import { useAlertConfig } from "../hooks/useAlertConfig";
import {
  REFERENCE_VALUES,
  getChildAgeDays,
  getRecommendedValue,
  type RuleKey,
} from "../lib/referenceValues";

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

const REF_DISMISS_KEY = "mybaby_dismissed_ref_warnings";
const REF_PERMANENT_DISMISS_KEY = "mybaby_permanent_dismissed_ref_warnings";

interface RuleLabel {
  ruleKey: RuleKey;
  enabledKey: string;
  thresholdKey: string;
  title: string;
  unit: string;
}

const RULE_LABELS: RuleLabel[] = [
  { ruleKey: "wet_diaper_min", enabledKey: "wet_diaper_enabled", thresholdKey: "wet_diaper_min", title: "Nasse Windeln", unit: "" },
  { ruleKey: "no_stool_hours", enabledKey: "no_stool_enabled", thresholdKey: "no_stool_hours", title: "Kein Stuhlgang", unit: "h" },
  { ruleKey: "low_feeding_ml", enabledKey: "low_feeding_enabled", thresholdKey: "low_feeding_ml", title: "Trinkmenge", unit: "ml" },
  { ruleKey: "fever_threshold", enabledKey: "fever_enabled", thresholdKey: "fever_threshold", title: "Fieber", unit: "°C" },
  { ruleKey: "feeding_interval_hours", enabledKey: "feeding_interval_enabled", thresholdKey: "feeding_interval_hours", title: "Fuetterungsintervall", unit: "h" },
];

function isPermanentlyDismissed(key: string): boolean {
  try {
    const raw = localStorage.getItem(REF_PERMANENT_DISMISS_KEY);
    if (!raw) return false;
    const set: string[] = JSON.parse(raw);
    return set.includes(key);
  } catch {
    return false;
  }
}

function permanentlyDismiss(key: string): void {
  try {
    const raw = localStorage.getItem(REF_PERMANENT_DISMISS_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(key)) set.push(key);
    localStorage.setItem(REF_PERMANENT_DISMISS_KEY, JSON.stringify(set));
  } catch {
    // ignore
  }
}

function isRefDismissed(key: string): boolean {
  if (isPermanentlyDismissed(key)) return true;
  try {
    const raw = localStorage.getItem(REF_DISMISS_KEY);
    if (!raw) return false;
    const map: Record<string, number> = JSON.parse(raw);
    const ts = map[key];
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function dismissRef(key: string): void {
  try {
    const raw = localStorage.getItem(REF_DISMISS_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[key] = Date.now();
    localStorage.setItem(REF_DISMISS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function ReferenceDeviationBanner() {
  const { activeChild } = useActiveChild();
  const { data: config } = useAlertConfig(activeChild?.id);
  const [, setTick] = useState(0);

  if (!activeChild || !config) return null;

  const ageDays = getChildAgeDays(activeChild.birth_date);

  const deviations: { key: string; message: string }[] = [];

  for (const rule of RULE_LABELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enabled = (config as any)[rule.enabledKey] as boolean;
    if (!enabled) continue;

    if (!REFERENCE_VALUES[rule.ruleKey]) continue;

    const ref = getRecommendedValue(rule.ruleKey, ageDays);
    if (!ref) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (config as any)[rule.thresholdKey] as number;
    // No deviation if current is within the recommended range [min, max]
    const min = ref.recommended;
    const max = ref.recommendedMax ?? ref.recommended;
    if (current >= min && current <= max) continue;

    const dismissKey = `${activeChild.id}_ref_${rule.ruleKey}`;
    if (isRefDismissed(dismissKey)) continue;

    const unitStr = rule.unit ? ` ${rule.unit}` : "";
    deviations.push({
      key: dismissKey,
      message: `Der Warnwert fuer "${rule.title}" weicht von der Empfehlung ab (empfohlen: ${ref.recommended}${unitStr}, eingestellt: ${current}${unitStr})`,
    });
  }

  if (deviations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {deviations.map((d) => (
        <div
          key={d.key}
          className="flex items-start gap-3 rounded-xl px-4 py-3 bg-sapphire/15 border border-sapphire/30 text-sapphire"
        >
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-body text-sm font-medium leading-snug">{d.message}</p>
            <button
              onClick={() => {
                permanentlyDismiss(d.key);
                setTick((t) => t + 1);
              }}
              className="mt-1 text-xs underline opacity-70 hover:opacity-100"
            >
              Nicht mehr anzeigen
            </button>
          </div>
          <button
            onClick={() => {
              dismissRef(d.key);
              setTick((t) => t + 1);
            }}
            className="shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
            aria-label="Hinweis ausblenden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
