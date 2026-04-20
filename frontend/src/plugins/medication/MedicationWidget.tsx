/** Medication dashboard widget — shows today's medications. */

import { Pill } from "lucide-react";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useMedicationEntries } from "../../hooks/useMedication";

export function MedicationWidget() {
  const { activeChild } = useActiveChild();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const { data: entries = [] } = useMedicationEntries({
    child_id: activeChild?.id,
    date_from: todayStart,
  });

  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <Pill className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">Medikamente heute</span>
      </div>

      {entries.length > 0 ? (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-baseline gap-2">
              <span className="font-body text-sm text-text">{entry.medication_name}</span>
              {entry.dose && (
                <span className="font-body text-xs text-subtext0">{entry.dose}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="font-body text-sm text-overlay0">Keine Medikamente heute</p>
      )}
    </Card>
  );
}
