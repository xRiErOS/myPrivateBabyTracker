/** Feeding dashboard widget — last meal, today's count. */

import { Utensils } from "lucide-react";
import { Card } from "../../components/Card";
import { useFeedingEntries } from "../../hooks/useFeeding";
import { formatTimeSince, startOfTodayISO } from "../../lib/dateUtils";
import type { FeedingType } from "../../api/types";

const TYPE_LABELS: Record<FeedingType, string> = {
  breast_left: "Brust L",
  breast_right: "Brust R",
  bottle: "Flasche",
  solid: "Beikost",
};

interface FeedingWidgetProps {
  childId: number;
}

export function FeedingWidget({ childId }: FeedingWidgetProps) {
  const { data: entries = [], isLoading } = useFeedingEntries({
    child_id: childId,
    date_from: startOfTodayISO(),
  });

  const lastEntry = entries[0];

  return (
    <Card className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <Utensils className="h-5 w-5 text-peach" />
        <p className="font-label text-sm font-medium text-subtext0">Mahlzeiten</p>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-subtext0">Laden...</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-headline text-2xl font-semibold">
            {entries.length} Mahlzeiten
          </p>
          <p className="font-body text-xs text-subtext0">Heute</p>

          {lastEntry && (
            <p className="font-body text-xs text-subtext0 mt-1">
              Letzte:{" "}
              {TYPE_LABELS[lastEntry.feeding_type as FeedingType] ?? lastEntry.feeding_type}
              {" — "}
              {formatTimeSince(lastEntry.start_time)}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
