/** Diaper dashboard widget — last change, today's count, rash warning. */

import { AlertTriangle, Droplets } from "lucide-react";
import { Card } from "../../components/Card";
import { useDiaperEntries } from "../../hooks/useDiaper";
import { formatTime, startOfTodayISO } from "../../lib/dateUtils";
import type { DiaperType } from "../../api/types";

const TYPE_LABELS: Record<DiaperType, string> = {
  wet: "Nass",
  dirty: "Stuhl",
  mixed: "Gemischt",
  dry: "Trocken",
};

interface DiaperWidgetProps {
  childId: number;
}

export function DiaperWidget({ childId }: DiaperWidgetProps) {
  const { data: entries = [], isLoading } = useDiaperEntries({
    child_id: childId,
    date_from: startOfTodayISO(),
  });

  const lastEntry = entries[0];
  const hasRashToday = entries.some((e) => e.has_rash);

  return (
    <Card className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="h-5 w-5 text-blue" />
        <p className="font-label text-sm font-medium text-subtext0">Windeln</p>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-overlay0">Laden...</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-headline text-2xl font-semibold">
            {entries.length} Windeln
          </p>
          <p className="font-body text-xs text-overlay0">Heute</p>

          {lastEntry && (
            <p className="font-body text-xs text-overlay0 mt-1">
              Letzte: {TYPE_LABELS[lastEntry.diaper_type] ?? lastEntry.diaper_type}
              {" um "}
              {formatTime(lastEntry.time)}
            </p>
          )}

          {hasRashToday && (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertTriangle className="h-4 w-4 text-red" />
              <span className="font-body text-xs text-red font-medium">
                Ausschlag beobachtet
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
