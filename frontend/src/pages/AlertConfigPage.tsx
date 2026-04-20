/** Alert configuration page — toggle and configure all 5 alert rules. */

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useActiveChild } from "../context/ChildContext";
import { useAlertConfig, useUpdateAlertConfig } from "../hooks/useAlertConfig";
import type { AlertConfig } from "../api/types";

interface AlertRule {
  enabledKey: keyof AlertConfig;
  thresholdKey: keyof AlertConfig;
  title: string;
  description: string;
  thresholdLabel: string;
  unit: string;
  step: number;
  min: number;
}

const RULES: AlertRule[] = [
  {
    enabledKey: "wet_diaper_enabled",
    thresholdKey: "wet_diaper_min",
    title: "Nasse Windeln",
    description: "Warnung wenn weniger als X nasse Windeln pro Tag",
    thresholdLabel: "Minimum pro Tag",
    unit: "",
    step: 1,
    min: 1,
  },
  {
    enabledKey: "no_stool_enabled",
    thresholdKey: "no_stool_hours",
    title: "Kein Stuhlgang",
    description: "Warnung wenn laenger als X Stunden kein Stuhlgang",
    thresholdLabel: "Stunden",
    unit: "h",
    step: 1,
    min: 1,
  },
  {
    enabledKey: "low_feeding_enabled",
    thresholdKey: "low_feeding_ml",
    title: "Trinkmenge",
    description: "Warnung wenn weniger als X ml pro Tag getrunken",
    thresholdLabel: "Minimum ml/Tag",
    unit: "ml",
    step: 10,
    min: 0,
  },
  {
    enabledKey: "fever_enabled",
    thresholdKey: "fever_threshold",
    title: "Fieber",
    description: "Warnung wenn Temperatur den Schwellwert erreicht",
    thresholdLabel: "Schwellwert",
    unit: "°C",
    step: 0.1,
    min: 36.0,
  },
  {
    enabledKey: "feeding_interval_enabled",
    thresholdKey: "feeding_interval_hours",
    title: "Fuetterungsintervall",
    description: "Warnung wenn laenger als X Stunden seit letzter Mahlzeit",
    thresholdLabel: "Stunden",
    unit: "h",
    step: 0.5,
    min: 0.5,
  },
];

function ToggleButton({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative min-h-[44px] w-14 rounded-full transition-colors ${enabled ? "bg-green" : "bg-surface2"}`}
      aria-pressed={enabled}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-text transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`}
      />
    </button>
  );
}

export default function AlertConfigPage() {
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: config, isLoading } = useAlertConfig(activeChild?.id);
  const updateMut = useUpdateAlertConfig(activeChild?.id ?? 0);

  if (isLoading) return <LoadingSpinner />;

  if (!config) {
    return (
      <div className="space-y-4">
        <p className="font-body text-sm text-subtext0">
          Keine Konfiguration vorhanden. Bitte zuerst ein Kind anlegen.
        </p>
      </div>
    );
  }

  function handleToggle(key: keyof AlertConfig, value: boolean) {
    updateMut.mutate({ [key]: value });
  }

  function handleThreshold(key: keyof AlertConfig, value: number) {
    updateMut.mutate({ [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] active:bg-surface1"
        >
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h2 className="font-headline text-lg font-semibold text-text">
          Warnhinweise
        </h2>
      </div>

      {RULES.map((rule) => {
        const enabled = config[rule.enabledKey] as boolean;
        const threshold = config[rule.thresholdKey] as number;

        return (
          <Card key={rule.enabledKey} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <h4 className="font-label text-sm font-medium text-text">
                  {rule.title}
                </h4>
                <p className="font-body text-xs text-subtext0">
                  {rule.description}
                </p>
              </div>
              <ToggleButton
                enabled={enabled}
                onChange={(v) => handleToggle(rule.enabledKey, v)}
              />
            </div>
            {enabled && (
              <div className="flex items-center gap-3">
                <label className="font-label text-sm text-subtext0">
                  {rule.thresholdLabel}
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) =>
                    handleThreshold(rule.thresholdKey, parseFloat(e.target.value) || 0)
                  }
                  step={rule.step}
                  min={rule.min}
                  className="min-h-[44px] w-24 px-3 rounded-[8px] bg-surface0 text-text font-body text-base border border-surface2 focus:outline-none focus:ring-2 focus:ring-peach"
                />
                {rule.unit && (
                  <span className="font-body text-sm text-subtext0">{rule.unit}</span>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
