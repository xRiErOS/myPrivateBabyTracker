/** Medication entry list with date range filter. */

import { useState } from "react";
import { Pencil, Pill, Trash2 } from "lucide-react";
import { Card } from "../../components/Card";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteMedication, useMedicationEntries } from "../../hooks/useMedication";
import { formatDateTime } from "../../lib/dateUtils";
import type { MedicationEntry } from "../../api/types";

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  week: new Date(Date.now() - 7 * 86400000).toISOString(),
  all: undefined,
};

interface MedicationListProps {
  onEdit?: (entry: MedicationEntry) => void;
}

export function MedicationList({ onEdit }: MedicationListProps) {
  const { activeChild } = useActiveChild();
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const deleteMut = useDeleteMedication();

  const { data: entries = [], isLoading } = useMedicationEntries({
    child_id: activeChild?.id,
    date_from: DATE_RANGE_MAP[dateRange],
  });

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Pill className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine Medikamenten-Eintraege</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {entries.map((entry) => (
        <Card key={entry.id} className="flex flex-col gap-1 p-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-heading text-base text-text">
                {entry.medication_name}
              </span>
              {entry.dose && (
                <span className="font-body text-sm text-subtext0">{entry.dose}</span>
              )}
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(entry)}
                  className="rounded p-1.5 text-overlay0 hover:bg-surface1 active:bg-surface2"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
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
            {formatDateTime(entry.given_at)}
          </p>
          {entry.notes && (
            <p className="font-body text-xs text-overlay0">{entry.notes}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
