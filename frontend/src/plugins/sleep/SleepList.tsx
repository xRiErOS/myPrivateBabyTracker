/** Sleep entry list with inline edit (running entries excluded). */

import { useState } from "react";
import { Moon, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { TagBadges } from "../../components/TagBadges";
import { TagSelector } from "../../components/TagSelector";
import { Select } from "../../components/Select";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteSleep, useSleepEntries } from "../../hooks/useSleep";
import { formatDateTime, formatDuration, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import { SleepForm } from "./SleepForm";

const TYPE_OPTIONS = [
  { value: "", label: "Alle Typen" },
  { value: "nap", label: "Nickerchen" },
  { value: "night", label: "Nachtschlaf" },
];

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

export function SleepList() {
  const { activeChild } = useActiveChild();
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMut = useDeleteSleep();

  const { data: allEntries = [], isLoading } = useSleepEntries({
    child_id: activeChild?.id,
    sleep_type: typeFilter || undefined,
    date_from: DATE_RANGE_MAP[dateRange],
  });

  // Filter out running entries — those are shown in SleepForm timer
  const entries = allEntries.filter((e) => e.end_time != null);

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Moon className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine Schlaf-Eintraege</p>
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
        <div key={entry.id} className="flex flex-col gap-2">
          <Card className="flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-mauve" />
                <span className="font-label text-sm font-medium">
                  {entry.sleep_type === "nap" ? "Nickerchen" : "Nachtschlaf"}
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
              {entry.end_time ? ` - ${formatDateTime(entry.end_time)}` : ""}
            </p>
            <p className="font-body text-sm text-overlay0">
              Dauer: {formatDuration(entry.duration_minutes)}
            </p>
            {entry.notes && (
              <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
            )}
            <TagBadges entryType="sleep" entryId={entry.id} />
          </Card>
          {editingId === entry.id && (
            <Card className="border border-mauve/20">
              <SleepForm entry={entry} onDone={() => setEditingId(null)} />
              <div className="mt-3 pt-3 border-t border-surface1">
                <TagSelector entryType="sleep" entryId={entry.id} />
              </div>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}
