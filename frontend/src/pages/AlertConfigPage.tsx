/** Alert configuration page — toggle and configure all 5 alert rules. */

import { useState } from "react";
import { Info, X, Check } from "lucide-react";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useActiveChild } from "../context/ChildContext";
import { useAlertConfig, useUpdateAlertConfig } from "../hooks/useAlertConfig";
import type { AlertConfig } from "../api/types";
import {
  REFERENCE_VALUES,
  getChildAgeDays,
  type RuleKey,
} from "../lib/referenceValues";

interface AlertRule {
  enabledKey: keyof AlertConfig;
  thresholdKey: keyof AlertConfig;
  referenceKey: RuleKey;
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
    referenceKey: "wet_diaper_min",
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
    referenceKey: "no_stool_hours",
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
    referenceKey: "low_feeding_ml",
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
    referenceKey: "fever_threshold",
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
    referenceKey: "feeding_interval_hours",
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
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${enabled ? "bg-green" : "bg-surface2"}`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${enabled ? "translate-x-[26px]" : "translate-x-[2px]"}`}
      />
    </button>
  );
}

function ReferenceModal({
  rule,
  ageDays,
  onApply,
  onClose,
}: {
  rule: AlertRule;
  ageDays: number;
  onApply: (value: number) => void;
  onClose: () => void;
}) {
  const ranges = REFERENCE_VALUES[rule.referenceKey];
  if (!ranges) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ground rounded-card w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface1">
          <h3 className="font-headline font-semibold text-text text-base">
            Referenzwerte: {rule.title}
          </h3>
          <button
            onClick={onClose}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-surface1 transition-colors"
            aria-label="Schliessen"
          >
            <X className="h-4 w-4 text-subtext0" />
          </button>
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="font-label text-subtext0 pb-2">Alter</th>
                <th className="font-label text-subtext0 pb-2">Empfehlung</th>
                <th className="font-label text-subtext0 pb-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {ranges.map((range, i) => {
                const isActive = ageDays <= range.maxAgeDays &&
                  (i === 0 || ageDays > ranges[i - 1].maxAgeDays);

                return (
                  <tr
                    key={i}
                    className={`border-t border-surface1 ${isActive ? "bg-green/10" : ""}`}
                  >
                    <td className={`py-2.5 font-body ${isActive ? "text-text font-medium" : "text-subtext0"}`}>
                      {range.label}
                      {isActive && (
                        <span className="ml-1.5 text-green text-xs font-label">aktuell</span>
                      )}
                    </td>
                    <td className={`py-2.5 font-body ${isActive ? "text-text font-medium" : "text-subtext0"}`}>
                      {range.display}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => {
                          onApply(range.recommended);
                          onClose();
                        }}
                        className="min-h-[36px] px-3 rounded-[8px] bg-peach text-ground text-xs font-label font-semibold hover:opacity-90 transition-all inline-flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Uebernehmen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AlertConfigPage() {
  const { activeChild } = useActiveChild();
  const { data: config, isLoading } = useAlertConfig(activeChild?.id);
  const updateMut = useUpdateAlertConfig(activeChild?.id ?? 0);
  const [openRef, setOpenRef] = useState<RuleKey | null>(null);

  const ageDays = activeChild ? getChildAgeDays(activeChild.birth_date) : 0;

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
      <PageHeader title="Warnhinweise" />

      {RULES.map((rule) => {
        const enabled = config[rule.enabledKey] as boolean;
        const threshold = config[rule.thresholdKey] as number;

        return (
          <Card key={rule.enabledKey} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-label text-sm font-medium text-text">
                    {rule.title}
                  </h4>
                  <button
                    onClick={() => setOpenRef(rule.referenceKey)}
                    className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg hover:bg-surface1 transition-colors"
                    aria-label={`Referenzwerte fuer ${rule.title}`}
                  >
                    <Info className="h-4 w-4 text-sapphire" />
                  </button>
                </div>
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
                  inputMode="decimal"
                  value={threshold}
                  onChange={(e) =>
                    handleThreshold(rule.thresholdKey, parseFloat(e.target.value) || 0)
                  }
                  step={rule.step}
                  min={rule.min}
                  className="min-h-[44px] w-24 px-3 rounded-[8px] bg-surface0 text-text font-body text-base border border-surface2 focus:outline-none focus:ring-2 focus:ring-peach"
                  style={{ fontSize: "16px" }}
                />
                {rule.unit && (
                  <span className="font-body text-sm text-subtext0">{rule.unit}</span>
                )}
              </div>
            )}

            {openRef === rule.referenceKey && (
              <ReferenceModal
                rule={rule}
                ageDays={ageDays}
                onApply={(value) => handleThreshold(rule.thresholdKey, value)}
                onClose={() => setOpenRef(null)}
              />
            )}
          </Card>
        );
      })}

      {/* Leap storm — toggle only, no threshold */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-3">
            <h4 className="font-label text-sm font-medium text-text">
              Entwicklungssprung
            </h4>
            <p className="font-body text-xs text-subtext0">
              Hinweis wenn sich das Kind in einer Sturmphase befindet
            </p>
          </div>
          <ToggleButton
            enabled={config.leap_storm_enabled}
            onChange={(v) => handleToggle("leap_storm_enabled", v)}
          />
        </div>
      </Card>

      {/* Age filter — optional min/max age in weeks */}
      <Card className="p-4 space-y-3">
        <div>
          <h4 className="font-label text-sm font-medium text-text">Altersbereich</h4>
          <p className="font-body text-xs text-subtext0 mt-0.5">
            Warnhinweise nur in diesem Altersbereich anzeigen (in Wochen, optional)
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="font-label text-sm text-subtext0 whitespace-nowrap">Ab Woche</label>
            <input
              type="number"
              value={config.min_age_weeks ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseInt(e.target.value);
                updateMut.mutate({ min_age_weeks: val });
              }}
              placeholder="–"
              min={0}
              max={520}
              className="min-h-[44px] w-20 px-3 rounded-[8px] bg-surface0 text-text font-body text-base border border-surface2 focus:outline-none focus:ring-2 focus:ring-peach"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-label text-sm text-subtext0 whitespace-nowrap">Bis Woche</label>
            <input
              type="number"
              value={config.max_age_weeks ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseInt(e.target.value);
                updateMut.mutate({ max_age_weeks: val });
              }}
              placeholder="–"
              min={0}
              max={520}
              className="min-h-[44px] w-20 px-3 rounded-[8px] bg-surface0 text-text font-body text-base border border-surface2 focus:outline-none focus:ring-2 focus:ring-peach"
              style={{ fontSize: "16px" }}
            />
          </div>
          {(config.min_age_weeks !== null || config.max_age_weeks !== null) && (
            <button
              onClick={() => updateMut.mutate({ min_age_weeks: null, max_age_weeks: null })}
              className="text-xs text-subtext0 underline"
            >
              Zuruecksetzen
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
