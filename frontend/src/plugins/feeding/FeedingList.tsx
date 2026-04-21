/** Feeding entry list with inline edit. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Trash2, Utensils, X } from "lucide-react";
import { Card } from "../../components/Card";
import { TagBadges } from "../../components/TagBadges";
import { Select } from "../../components/Select";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteFeeding, useFeedingEntries } from "../../hooks/useFeeding";
import { formatDateTime, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import { FeedingForm } from "./FeedingForm";
import type { FeedingType } from "../../api/types";

const TYPE_OPTIONS = [
  { value: "", label: "Alle Typen" },
  { value: "breast_left", label: "Brust links" },
  { value: "breast_right", label: "Brust rechts" },
  { value: "bottle", label: "Flasche" },
  { value: "solid", label: "Beikost" },
];

const TYPE_LABELS: Record<FeedingType, string> = {
  breast_left: "Brust links",
  breast_right: "Brust rechts",
  bottle: "Flasche",
  solid: "Beikost",
};

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

export function FeedingList() {
  const { activeChild } = useActiveChild();
  const [typeFilter, setTypeFilter] = useState("");
  const [searchParams] = useSearchParams();
  const specificDate = searchParams.get("date");
  const [dateRange, setDateRange] = useState<DateRange>(
    specificDate ? "today" : (searchParams.get("range") as DateRange) ?? "week"
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMut = useDeleteFeeding();

  const dateFrom = specificDate ? `${specificDate}T00:00:00Z` : DATE_RANGE_MAP[dateRange];
  const dateTo = specificDate ? `${specificDate}T23:59:59Z` : undefined;

  const { data: entries = [], isLoading } = useFeedingEntries({
    child_id: activeChild?.id,
    feeding_type: typeFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  });

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Utensils className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine Fuetterungs-Eintraege</p>
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
              <Utensils className="h-4 w-4 text-peach" />
              <span className="font-label text-sm font-medium">
                {TYPE_LABELS[entry.feeding_type as FeedingType] ?? entry.feeding_type}
              </span>
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
            {formatDateTime(entry.start_time)}
          </p>
          <p className="font-body text-sm text-overlay0">
            {entry.amount_ml != null && `${entry.amount_ml} ml`}
            {entry.food_type && `${entry.amount_ml != null ? " | " : ""}${entry.food_type}`}
          </p>
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
          <TagBadges entryType="feeding" entryId={entry.id} />
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <FeedingForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
