/** Temperature dashboard widget — shows latest measurement. */

import { Thermometer } from "lucide-react";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useTemperatureEntries } from "../../hooks/useTemperature";
import { formatTimeSince } from "../../lib/dateUtils";

function tempColor(celsius: number): string {
  if (celsius >= 38.5) return "text-red";
  if (celsius >= 37.5) return "text-peach";
  if (celsius < 36.5) return "text-blue";
  return "text-green";
}

function tempLabel(celsius: number): string {
  if (celsius >= 38.5) return "Fieber";
  if (celsius >= 37.5) return "Erhoehte Temperatur";
  if (celsius < 36.5) return "Unterkuehlung";
  return "Normal";
}

export function TemperatureWidget() {
  const { activeChild } = useActiveChild();
  const { data: entries = [] } = useTemperatureEntries({
    child_id: activeChild?.id,
  });

  const latest = entries[0]; // already sorted by measured_at desc

  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <Thermometer className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">Temperatur</span>
      </div>

      {latest ? (
        <div className="flex items-baseline gap-2">
          <span className={`font-heading text-2xl ${tempColor(latest.temperature_celsius)}`}>
            {latest.temperature_celsius.toFixed(1)} °C
          </span>
          <span className="font-body text-xs text-subtext0">
            {tempLabel(latest.temperature_celsius)}
          </span>
        </div>
      ) : (
        <p className="font-body text-sm text-overlay0">Keine Messung</p>
      )}

      {latest && (
        <p className="font-body text-xs text-overlay0">
          {formatTimeSince(latest.measured_at)}
        </p>
      )}
    </Card>
  );
}
