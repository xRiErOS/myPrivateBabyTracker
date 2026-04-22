/** Temperature dashboard widget — shows latest measurement. */

import { useTranslation } from "react-i18next";
import { Thermometer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useTemperatureEntries } from "../../hooks/useTemperature";
import { formatTimeSince } from "../../lib/dateUtils";
import type { TFunction } from "i18next";

function tempColor(celsius: number): string {
  if (celsius >= 38.5) return "text-red";
  if (celsius >= 37.5) return "text-peach";
  if (celsius < 36.5) return "text-blue";
  return "text-green";
}

function tempLabel(celsius: number, t: TFunction): string {
  if (celsius >= 38.5) return t("status.fever");
  if (celsius >= 37.5) return t("status.elevated");
  if (celsius < 36.5) return t("status.hypothermia");
  return t("status.normal");
}

export function TemperatureWidget() {
  const { t } = useTranslation("temperature");
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: entries = [] } = useTemperatureEntries({
    child_id: activeChild?.id,
  });

  const latest = entries[0]; // already sorted by measured_at desc

  return (
    <Card className="h-full flex flex-col gap-2 p-3 cursor-pointer active:bg-surface1 transition-colors" onClick={() => navigate("/temperature")}>
      <div className="flex items-center gap-2">
        <Thermometer className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">{t("widget_title")}</span>
      </div>

      {latest ? (
        <div className="flex items-baseline gap-2">
          <span className={`font-heading text-lg font-semibold whitespace-nowrap ${tempColor(latest.temperature_celsius)}`}>
            {latest.temperature_celsius.toFixed(1)}&nbsp;°C
          </span>
          <span className="font-body text-xs text-subtext0">
            {tempLabel(latest.temperature_celsius, t)}
          </span>
        </div>
      ) : (
        <p className="font-body text-sm text-overlay0">{t("no_measurement")}</p>
      )}

      {latest && (
        <p className="font-body text-xs text-overlay0">
          {formatTimeSince(latest.measured_at)}
        </p>
      )}
    </Card>
  );
}
