/** Sleep dashboard widget — today's total, last sleep, running timer. */

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { Card } from "../../components/Card";
import { useSleepEntries } from "../../hooks/useSleep";
import { formatDuration, formatTime, startOfTodayISO } from "../../lib/dateUtils";

function useElapsedMinutes(startIso: string | undefined): number {
  const [minutes, setMinutes] = useState(() =>
    startIso ? Math.floor((Date.now() - new Date(startIso).getTime()) / 60000) : 0,
  );
  useEffect(() => {
    if (!startIso) return;
    const update = () =>
      setMinutes(Math.floor((Date.now() - new Date(startIso).getTime()) / 60000));
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [startIso]);
  return minutes;
}

interface SleepWidgetProps {
  childId: number;
}

export function SleepWidget({ childId }: SleepWidgetProps) {
  const { data: entries = [], isLoading } = useSleepEntries({
    child_id: childId,
    date_from: startOfTodayISO(),
  });

  const totalMinutes = entries.reduce(
    (sum, e) => sum + (e.duration_minutes ?? 0),
    0,
  );
  const running = entries.find((e) => !e.end_time);
  const elapsed = useElapsedMinutes(running?.start_time);
  const lastEntry = entries[0];

  return (
    <Card className={running ? "ring-2 ring-green/40 bg-green/5" : ""}>
      <div className="flex items-center gap-2 mb-3">
        <Moon className={`h-5 w-5 ${running ? "text-green" : "text-mauve"}`} />
        <p className="font-label text-sm font-medium text-subtext0">Schlaf</p>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-overlay0">Laden...</p>
      ) : (
        <div className="flex flex-col gap-1">
          {running ? (
            <>
              <p className="font-headline text-2xl font-semibold text-green">
                {formatDuration(elapsed)}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green animate-pulse" />
                <span className="font-body text-xs text-green">
                  Schlaeft seit {formatTime(running.start_time)}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="font-headline text-2xl font-semibold">
                {formatDuration(totalMinutes)}
              </p>
              <p className="font-body text-xs text-overlay0">Heute gesamt</p>
              {lastEntry && (
                <p className="font-body text-xs text-overlay0 mt-1">
                  Letzter Schlaf: {formatTime(lastEntry.start_time)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
