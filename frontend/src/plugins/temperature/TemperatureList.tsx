/** Temperature entry list with inline edit. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Thermometer, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { ListSummaryBar, MetricPill } from "../../components/ListSummaryBar";
import { TagBadges } from "../../components/TagBadges";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteTemperature, useTemperatureEntries } from "../../hooks/useTemperature";
import { formatDateTime, formatTimeSince } from "../../lib/dateUtils";
import { TemperatureForm } from "./TemperatureForm";

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  week: new Date(Date.now() - 7 * 86400000).toISOString(),
  all: undefined,
};

function tempColor(celsius: number): string {
  if (celsius >= 38.5) return "text-red";
  if (celsius >= 37.5) return "text-peach";
  if (celsius < 36.5) return "text-blue";
  return "text-green";
}

function tempLabel(celsius: number): string {
  if (celsius >= 38.5) return "Fieber";
  if (celsius >= 37.5) return "Erhoehte Temp.";
  if (celsius < 36.5) return "Unterkuehlung";
  return "Normal";
}

export function TemperatureList() {
  const { activeChild } = useActiveChild();
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRange>((searchParams.get("range") as DateRange) ?? "week");
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMut = useDeleteTemperature();

  const { data: entries = [], isLoading } = useTemperatureEntries({
    child_id: activeChild?.id,
    date_from: DATE_RANGE_MAP[dateRange],
  });

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Thermometer className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine Temperatur-Eintraege</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {entries.length > 0 && (() => {
        const latest = entries[0];
        const temps = entries.map((e) => e.temperature_celsius);
        const min = Math.min(...temps);
        const max = Math.max(...temps);
        return (
          <ListSummaryBar>
            <div className="flex gap-1.5">
              <MetricPill
                label={tempLabel(latest.temperature_celsius)}
                value={<span className={tempColor(latest.temperature_celsius)}>{latest.temperature_celsius.toFixed(1)} °C</span>}
              />
              <MetricPill label="Messungen" value={entries.length} />
              {entries.length > 1 && (
                <MetricPill label="Bereich" value={`${min.toFixed(1)} — ${max.toFixed(1)}`} />
              )}
            </div>
            <p className="font-body text-xs text-subtext0">
              Letzte Messung: {formatTimeSince(latest.measured_at)}
            </p>
          </ListSummaryBar>
        );
      })()}

      {entries.map((entry) => (
        <Card key={entry.id} className={`flex flex-col gap-1 p-3${editingId === entry.id ? " overflow-hidden" : ""}`}>
          <div className="flex items-center justify-between">
            <span className={`font-heading text-lg ${tempColor(entry.temperature_celsius)}`}>
              {entry.temperature_celsius.toFixed(1)} °C
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                className={`rounded p-1.5 ${editingId === entry.id ? "text-peach bg-peach/10" : "text-overlay0 hover:bg-surface1"} active:bg-surface2`}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {editingId === entry.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  if (confirm("Eintrag loeschen?")) deleteMut.mutate(entry.id);
                }}
                className="rounded p-1.5 text-overlay0 hover:bg-red/10 hover:text-red active:bg-red/20"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="font-body text-xs text-subtext0">
            {formatDateTime(entry.measured_at)}
          </p>
          {entry.notes && (
            <p className="font-body text-xs text-overlay0">{entry.notes}</p>
          )}
          <TagBadges entryType="temperature" entryId={entry.id} />
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <TemperatureForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
