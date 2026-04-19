/** Sleep entry form — create/edit sleep with start/stop timer + live running display. */

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateSleep, useUpdateSleep } from "../../hooks/useSleep";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import type { SleepEntry, SleepType } from "../../api/types";

const SLEEP_TYPE_OPTIONS = [
  { value: "nap", label: "Nickerchen" },
  { value: "night", label: "Nachtschlaf" },
];

interface SleepFormProps {
  entry?: SleepEntry;
  onDone?: () => void;
}

/** Format elapsed seconds as HH:MM:SS. */
function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function SleepForm({ entry, onDone }: SleepFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateSleep();
  const updateMut = useUpdateSleep();

  const [sleepType, setSleepType] = useState<SleepType>(entry?.sleep_type ?? "nap");
  const [startTime, setStartTime] = useState(
    entry?.start_time ? isoToLocalInput(entry.start_time) : isoToLocalInput(nowISO()),
  );
  const [endTime, setEndTime] = useState(
    entry?.end_time ? isoToLocalInput(entry.end_time) : "",
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const isRunning = entry != null && entry.end_time == null;
  const isPending = createMut.isPending || updateMut.isPending;

  // Live timer for running sleep entries
  useEffect(() => {
    if (!isRunning || !entry?.start_time) return;

    function tick() {
      const start = new Date(entry!.start_time).getTime();
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, entry?.start_time]);

  async function handleStopAndSave() {
    if (!entry || !activeChild) return;
    setError(null);

    const now = nowISO();
    try {
      await updateMut.mutateAsync({
        id: entry.id,
        data: { end_time: now },
      });
      onDone?.();
    } catch (err) {
      handleApiError(err);
    }
  }

  function handleApiError(err: unknown) {
    if (err instanceof ApiError) {
      try {
        const body = JSON.parse(err.message.replace(/^API \d+: /, ""));
        setError(body.detail || err.message);
      } catch {
        // Message format: "API 422: {json}"
        const msg = err.message.replace(/^API \d+: /, "");
        setError(msg);
      }
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("Unbekannter Fehler");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeChild) return;
    setError(null);

    const payload = {
      child_id: activeChild.id,
      start_time: localInputToISO(startTime),
      end_time: endTime ? localInputToISO(endTime) : null,
      sleep_type: sleepType,
      notes: notes || null,
    };

    try {
      if (entry) {
        const { child_id: _, ...updateData } = payload;
        await updateMut.mutateAsync({ id: entry.id, data: updateData });
      } else {
        await createMut.mutateAsync(payload);
      }
      onDone?.();
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Running timer banner */}
      {isRunning && (
        <div className="rounded-[8px] border-2 border-green bg-green/10 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label text-sm font-semibold text-green">
              Schlaf laeuft
            </span>
            <span className="font-mono text-lg font-bold text-green">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={handleStopAndSave}
            disabled={isPending}
            className="bg-green text-ground"
          >
            {isPending ? "Stoppe..." : "Jetzt stoppen"}
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-[8px] border border-red bg-red/10 p-3 text-sm text-red">
          {error}
        </div>
      )}

      <Select
        label="Typ"
        options={SLEEP_TYPE_OPTIONS}
        value={sleepType}
        onChange={(e) => setSleepType(e.target.value as SleepType)}
      />

      <Input
        label="Beginn"
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        required
      />

      {!isRunning && (
        <Input
          label="Ende"
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      )}

      <Input
        label="Notizen"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optionale Notizen..."
        maxLength={2000}
      />

      <Button type="submit" disabled={isPending || !startTime}>
        {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Speichern"}
      </Button>
    </form>
  );
}
