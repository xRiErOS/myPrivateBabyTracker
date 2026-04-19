/** Sleep entry list with type filter (running entries excluded — shown in SleepForm timer). */

import { useState } from "react";
import { Moon, Pencil, Trash2 } from "lucide-react";
import { Card } from "../../components/Card";
import { Select } from "../../components/Select";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteSleep, useSleepEntries } from "../../hooks/useSleep";
import { formatDateTime, formatDuration } from "../../lib/dateUtils";
import type { SleepEntry } from "../../api/types";

const TYPE_OPTIONS = [
  { value: "", label: "Alle Typen" },
  { value: "nap", label: "Nickerchen" },
  { value: "night", label: "Nachtschlaf" },
];

interface SleepListProps {
  onEdit?: (entry: SleepEntry) => void;
}

export function SleepList({ onEdit }: SleepListProps) {
  const { activeChild } = useActiveChild();
  const [typeFilter, setTypeFilter] = useState("");
  const deleteMut = useDeleteSleep();

  const { data: allEntries = [], isLoading } = useSleepEntries({
    child_id: activeChild?.id,
    sleep_type: typeFilter || undefined,
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
              <Moon className="h-4 w-4 text-mauve" />
              <span className="font-label text-sm font-medium">
                {entry.sleep_type === "nap" ? "Nickerchen" : "Nachtschlaf"}
              </span>
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
            {formatDateTime(entry.start_time)}
            {entry.end_time ? ` - ${formatDateTime(entry.end_time)}` : ""}
          </p>
          <p className="font-body text-sm text-overlay0">
            Dauer: {formatDuration(entry.duration_minutes)}
          </p>
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
