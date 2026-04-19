/** Sleep entry form — create/edit sleep with start/stop timer. */

import { type FormEvent, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateSleep, useUpdateSleep } from "../../hooks/useSleep";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import type { SleepEntry, SleepType } from "../../api/types";

const SLEEP_TYPE_OPTIONS = [
  { value: "nap", label: "Nickerchen" },
  { value: "night", label: "Nachtschlaf" },
];

const QUALITY_OPTIONS = [
  { value: "", label: "Keine Angabe" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

interface SleepFormProps {
  entry?: SleepEntry;
  onDone?: () => void;
}

export function SleepForm({ entry, onDone }: SleepFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateSleep();
  const updateMut = useUpdateSleep();

  const [sleepType, setSleepType] = useState<SleepType>(entry?.sleep_type ?? "nap");
  const [startTime, setStartTime] = useState(
    entry?.start_time ? isoToLocalInput(entry.start_time) : "",
  );
  const [endTime, setEndTime] = useState(
    entry?.end_time ? isoToLocalInput(entry.end_time) : "",
  );
  const [location, setLocation] = useState(entry?.location ?? "");
  const [quality, setQuality] = useState(entry?.quality?.toString() ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const isRunning = entry && !entry.end_time;
  const isPending = createMut.isPending || updateMut.isPending;

  function handleStartNow() {
    setStartTime(isoToLocalInput(nowISO()));
  }

  function handleStopNow() {
    setEndTime(isoToLocalInput(nowISO()));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeChild) return;

    const payload = {
      child_id: activeChild.id,
      start_time: localInputToISO(startTime),
      end_time: endTime ? localInputToISO(endTime) : null,
      sleep_type: sleepType,
      location: location || null,
      quality: quality ? Number(quality) : null,
      notes: notes || null,
    };

    if (entry) {
      const { child_id: _, ...updateData } = payload;
      await updateMut.mutateAsync({ id: entry.id, data: updateData });
    } else {
      await createMut.mutateAsync(payload);
    }
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Select
        label="Typ"
        options={SLEEP_TYPE_OPTIONS}
        value={sleepType}
        onChange={(e) => setSleepType(e.target.value as SleepType)}
      />

      <div className="flex flex-col gap-1">
        <Input
          label="Beginn"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
        {!startTime && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleStartNow}
            className="mt-1"
          >
            Jetzt starten
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Input
          label="Ende"
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        {isRunning && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleStopNow}
            className="mt-1"
          >
            Jetzt stoppen
          </Button>
        )}
      </div>

      <Input
        label="Ort"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="z.B. Kinderbett, Kinderwagen"
        maxLength={50}
      />

      <Select
        label="Qualitaet"
        options={QUALITY_OPTIONS}
        value={quality}
        onChange={(e) => setQuality(e.target.value)}
      />

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
