/** Sleep dashboard widget — today's total, last sleep, running timer with stop. */

import { useEffect, useState } from "react";
import { Moon, Pencil, Play, Square, X } from "lucide-react";
import { Card } from "../../components/Card";
import { useCreateSleep, useUpdateSleep, useSleepEntries } from "../../hooks/useSleep";
import { formatDuration, formatTime, formatTimeSince, isoToLocalInput, localInputToISO, nowISO, daysAgoISO } from "../../lib/dateUtils";
import { splitSleepByDay, todayBerlin } from "../../lib/timelineUtils";

function useElapsedSeconds(startIso: string | undefined): number {
  const [seconds, setSeconds] = useState(() =>
    startIso ? Math.floor((Date.now() - new Date(startIso).getTime()) / 1000) : 0,
  );
  useEffect(() => {
    if (!startIso) return;
    const update = () =>
      setSeconds(Math.floor((Date.now() - new Date(startIso).getTime()) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return seconds;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")} h`;
  return `${m}:${String(s).padStart(2, "0")} min`;
}

interface SleepWidgetProps {
  childId: number;
}

export function SleepWidget({ childId }: SleepWidgetProps) {
  // Fetch from yesterday to catch overnight sleep that extends into today
  const { data: entries = [], isLoading } = useSleepEntries({
    child_id: childId,
    date_from: daysAgoISO(1),
  });
  const createMut = useCreateSleep();
  const updateMut = useUpdateSleep();

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustStart, setAdjustStart] = useState("");

  // Split sleep at Berlin midnight and only count today's portion
  const today = todayBerlin();
  const todaySegments = splitSleepByDay(entries)[today] ?? [];
  const totalMinutes = Math.round(todaySegments.reduce((sum, seg) => {
    const start = new Date(seg._splitStart).getTime();
    const end = new Date(seg._splitEnd).getTime();
    return sum + (end - start) / 60000;
  }, 0));
  const running = entries.find((e) => !e.end_time);
  const elapsedSec = useElapsedSeconds(running?.start_time);
  const lastEntry = entries[0];

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation();
    if (!running) return;
    updateMut.mutate({ id: running.id, data: { end_time: nowISO() } });
  }

  function handleStart(e: React.MouseEvent) {
    e.stopPropagation();
    createMut.mutate({
      child_id: childId,
      start_time: nowISO(),
      sleep_type: "nap",
    });
  }

  function openAdjust(e: React.MouseEvent) {
    e.stopPropagation();
    if (!running) return;
    setAdjustStart(isoToLocalInput(running.start_time));
    setShowAdjust(true);
  }

  function handleAdjustSave() {
    if (!running || !adjustStart) return;
    updateMut.mutate(
      { id: running.id, data: { start_time: localInputToISO(adjustStart) } },
      { onSuccess: () => setShowAdjust(false) },
    );
  }

  return (
    <>
    <Card className={`h-full ${running ? "ring-2 ring-green/40 bg-green/5" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <Moon className={`h-5 w-5 ${running ? "text-green" : "text-mauve"}`} />
        <p className="font-label text-sm font-medium text-subtext0">Schlaf</p>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-subtext0">Laden...</p>
      ) : (
        <div className="flex flex-col gap-1">
          {running ? (
            <>
              <p className="font-headline text-2xl font-semibold text-green">
                {formatElapsed(elapsedSec)}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green animate-pulse" />
                <span className="font-body text-xs text-green">
                  Schlaeft seit {formatTime(running.start_time)}
                </span>
                <button
                  onClick={openAdjust}
                  className="text-green/60 hover:text-green transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
                  aria-label="Startzeit anpassen"
                >
                  <Pencil size={11} />
                </button>
              </div>
              <button
                onClick={handleStop}
                disabled={updateMut.isPending}
                className="mt-2 min-h-[44px] flex items-center justify-center gap-2 rounded-[8px] bg-green text-ground font-label text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Square className="h-4 w-4" />
                {updateMut.isPending ? "Stoppe..." : "Timer stoppen"}
              </button>
            </>
          ) : (
            <>
              <p className="font-headline text-2xl font-semibold">
                {formatDuration(totalMinutes)}
              </p>
              <p className="font-body text-xs text-subtext0">Heute gesamt</p>
              {lastEntry && (
                <p className="font-body text-xs text-subtext0 mt-1">
                  Letzter Schlaf: {formatTimeSince(lastEntry.end_time ?? lastEntry.start_time)}
                </p>
              )}
              <button
                onClick={handleStart}
                disabled={createMut.isPending}
                className="mt-2 min-h-[44px] flex items-center justify-center gap-2 rounded-[8px] bg-mauve text-ground font-label text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Play className="h-4 w-4" />
                {createMut.isPending ? "Starte..." : "Jetzt starten"}
              </button>
            </>
          )}
        </div>
      )}
    </Card>

    {/* Startzeit-Anpassen Overlay */}
    {showAdjust && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-ground/80 backdrop-blur-sm"
          onClick={() => setShowAdjust(false)}
        />
        <div className="relative w-full max-w-xs bg-surface0 rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-sm font-semibold text-text">Startzeit anpassen</h3>
            <button
              onClick={() => setShowAdjust(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
          <input
            type="datetime-local"
            value={adjustStart}
            onChange={(e) => setAdjustStart(e.target.value)}
            className="w-full min-h-[44px] rounded-[8px] bg-surface1 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdjust(false)}
              className="px-4 py-2 rounded-lg font-label text-sm text-subtext0 hover:text-text transition-colors min-h-[44px]"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleAdjustSave}
              disabled={updateMut.isPending || !adjustStart}
              className="px-4 py-2 rounded-lg bg-green text-ground font-label text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[44px]"
            >
              {updateMut.isPending ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
