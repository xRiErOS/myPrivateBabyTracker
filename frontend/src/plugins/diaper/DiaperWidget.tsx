/** Diaper dashboard widget — last change, today's count, rash warning. */

import { AlertTriangle, Droplets } from "lucide-react";
import { Card } from "../../components/Card";
import { useDiaperEntries } from "../../hooks/useDiaper";
import { formatTimeSince, startOfTodayISO } from "../../lib/dateUtils";
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
        <p className="font-body text-sm text-subtext0">Laden...</p>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Kacheln: Gesamt / Nass / Beides */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: entries.length, label: "Ges." },
              { value: entries.filter((e) => e.diaper_type === "wet").length, label: "Nass" },
              { value: entries.filter((e) => e.diaper_type === "mixed").length, label: "Beid." },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="bg-surface1 rounded-lg p-2 text-center"
              >
                <p className="font-headline text-lg font-semibold">{value}</p>
                <p className="font-body text-[10px] text-subtext0">{label}</p>
              </div>
            ))}
          </div>

          {/* Stuhl + Trocken kompakt */}
          <p className="font-body text-xs text-subtext0 mt-1">
            Stuhl: {entries.filter((e) => e.diaper_type === "dirty").length}
            {" \u00B7 "}
            Trocken: {entries.filter((e) => e.diaper_type === "dry").length}
          </p>

          {lastEntry && (
            <p className="font-body text-xs text-subtext0">
              Letzte: {TYPE_LABELS[lastEntry.diaper_type] ?? lastEntry.diaper_type}
              {" — "}
              {formatTimeSince(lastEntry.time)}
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
