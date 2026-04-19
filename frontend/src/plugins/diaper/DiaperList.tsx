/** Diaper entry list with type filter. */

import { useState } from "react";
import { AlertTriangle, Droplets, Pencil, Trash2 } from "lucide-react";
import { Card } from "../../components/Card";
import { Select } from "../../components/Select";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteDiaper, useDiaperEntries } from "../../hooks/useDiaper";
import { formatDateTime, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import type { DiaperEntry, DiaperType } from "../../api/types";

const TYPE_OPTIONS = [
  { value: "", label: "Alle Typen" },
  { value: "wet", label: "Nass" },
  { value: "dirty", label: "Stuhl" },
  { value: "mixed", label: "Gemischt" },
  { value: "dry", label: "Trocken" },
];

const TYPE_LABELS: Record<DiaperType, string> = {
  wet: "Nass",
  dirty: "Stuhl",
  mixed: "Gemischt",
  dry: "Trocken",
};

interface DiaperListProps {
  onEdit?: (entry: DiaperEntry) => void;
}

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

export function DiaperList({ onEdit }: DiaperListProps) {
  const { activeChild } = useActiveChild();
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const deleteMut = useDeleteDiaper();

  const { data: entries = [], isLoading } = useDiaperEntries({
    child_id: activeChild?.id,
    diaper_type: typeFilter || undefined,
    date_from: DATE_RANGE_MAP[dateRange],
  });

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Droplets className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine Windel-Eintraege</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      <Select
        label="Filter"
        options={TYPE_OPTIONS}
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
      />

      {entries.map((entry) => (
        <Card key={entry.id} className="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onEdit?.(entry)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue" />
              <span className="font-label text-sm font-medium">
                {TYPE_LABELS[entry.diaper_type] ?? entry.diaper_type}
              </span>
              {entry.has_rash && (
                <span className="flex items-center gap-1 text-red">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-label text-xs">Ausschlag</span>
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(entry)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text transition-colors"
                  aria-label="Bearbeiten"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); deleteMut.mutate(entry.id); }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-red transition-colors"
                aria-label="Loeschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="font-body text-sm text-subtext0">
            {formatDateTime(entry.time)}
          </p>
          {(entry.color || entry.consistency) && (
            <p className="font-body text-sm text-overlay0">
              {entry.color && `Farbe: ${entry.color}`}
              {entry.color && entry.consistency && " | "}
              {entry.consistency && `Konsistenz: ${entry.consistency}`}
            </p>
          )}
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
