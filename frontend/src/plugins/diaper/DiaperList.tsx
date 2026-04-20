/** Diaper entry list with inline edit. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Droplets, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { TagBadges } from "../../components/TagBadges";
import { Select } from "../../components/Select";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteDiaper, useDiaperEntries } from "../../hooks/useDiaper";
import { formatDateTime, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import { DiaperForm } from "./DiaperForm";
import type { DiaperType } from "../../api/types";

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

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

export function DiaperList() {
  const { activeChild } = useActiveChild();
  const [typeFilter, setTypeFilter] = useState("");
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRange>((searchParams.get("range") as DateRange) ?? "week");
  const [editingId, setEditingId] = useState<number | null>(null);
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
        <Card key={entry.id} className={`flex flex-col gap-1 p-3${editingId === entry.id ? " overflow-hidden" : ""}`}>
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
              <button
                onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${editingId === entry.id ? "text-peach" : "text-subtext0 hover:text-text"} transition-colors`}
              >
                {editingId === entry.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteMut.mutate(entry.id); }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-red transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="font-body text-sm text-subtext0">
            {formatDateTime(entry.time)}
          </p>
          {entry.color && (
            <p className="font-body text-sm text-overlay0">Farbe: {entry.color}</p>
          )}
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
          <TagBadges entryType="diaper" entryId={entry.id} />
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <DiaperForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
