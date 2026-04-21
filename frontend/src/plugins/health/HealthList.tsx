/** Health entry list with inline edit. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, Droplets, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { TagBadges } from "../../components/TagBadges";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { Select } from "../../components/Select";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteHealth, useHealthEntries } from "../../hooks/useHealth";
import { formatDateTime, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import { HealthForm } from "./HealthForm";

const TYPE_OPTIONS = [
  { value: "", label: "Alle Typen" },
  { value: "spit_up", label: "Spucken" },
  { value: "tummy_ache", label: "Bauchschmerzen" },
];

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "text-green",
  moderate: "text-peach",
  severe: "text-red",
};

const SEVERITY_LABELS: Record<string, string> = {
  mild: "Wenig",
  moderate: "Mittel",
  severe: "Stark",
};

const DURATION_LABELS: Record<string, string> = {
  short: "Kurz (~1h)",
  medium: "Mittel (1-2h)",
  long: "Lang (>2h)",
};

function EntryIcon({ type }: { type: string }) {
  if (type === "spit_up") {
    return <Droplets className="h-4 w-4 text-sapphire" />;
  }
  return <Activity className="h-4 w-4 text-mauve" />;
}

export function HealthList() {
  const { activeChild } = useActiveChild();
  const [typeFilter, setTypeFilter] = useState("");
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRange>((searchParams.get("range") as DateRange) ?? "week");
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMut = useDeleteHealth();

  const { data: entries = [], isLoading } = useHealthEntries({
    child_id: activeChild?.id,
    entry_type: typeFilter || undefined,
    date_from: DATE_RANGE_MAP[dateRange],
  });

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Activity className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine Gesundheits-Eintraege</p>
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
              <EntryIcon type={entry.entry_type} />
              <span className="font-label text-sm font-medium">
                {entry.entry_type === "spit_up" ? "Spucken" : "Bauchschmerzen"}
              </span>
              <span className={`font-label text-xs font-medium ${SEVERITY_COLORS[entry.severity] ?? "text-text"}`}>
                {SEVERITY_LABELS[entry.severity] ?? entry.severity}
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
            {formatDateTime(entry.time)}
          </p>
          {entry.duration && (
            <p className="font-body text-xs text-overlay0">
              Dauer: {DURATION_LABELS[entry.duration] ?? entry.duration}
            </p>
          )}
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
          <TagBadges entryType="health" entryId={entry.id} />
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <HealthForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
