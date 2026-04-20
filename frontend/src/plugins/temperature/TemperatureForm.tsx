/** Temperature entry form — create/edit temperature measurements. */

import { type FormEvent, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateTemperature, useUpdateTemperature } from "../../hooks/useTemperature";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import type { TemperatureEntry } from "../../api/types";

interface TemperatureFormProps {
  entry?: TemperatureEntry;
  onDone?: () => void;
}

export function TemperatureForm({ entry, onDone }: TemperatureFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateTemperature();
  const updateMut = useUpdateTemperature();

  const [measuredAt, setMeasuredAt] = useState(
    entry?.measured_at ? isoToLocalInput(entry.measured_at) : isoToLocalInput(nowISO()),
  );
  const [temperature, setTemperature] = useState(
    entry?.temperature_celsius?.toString() ?? "36.5",
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const tempValue = parseFloat(temperature);
    if (isNaN(tempValue) || tempValue < 34 || tempValue > 43) {
      setError("Temperatur muss zwischen 34.0 und 43.0 °C liegen");
      return;
    }

    try {
      if (isEditing) {
        await updateMut.mutateAsync({
          id: entry.id,
          data: {
            measured_at: localInputToISO(measuredAt),
            temperature_celsius: tempValue,
            notes: notes || null,
          },
        });
      } else {
        await createMut.mutateAsync({
          child_id: activeChild!.id,
          measured_at: localInputToISO(measuredAt),
          temperature_celsius: tempValue,
          notes: notes || null,
        });
      }
      onDone?.();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Zeitpunkt"
          type="datetime-local"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
        />
        <Input
          label="Temperatur (°C)"
          type="number"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          min="34.0"
          max="43.0"
          step="0.1"
        />
        <Input
          label="Notizen"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionale Notizen..."
          maxLength={2000}
        />
        <Button type="submit" disabled={isPending || !measuredAt}>
          {isPending ? "Speichern..." : isEditing ? "Aktualisieren" : "Nachtragen"}
        </Button>
      </form>
    </div>
  );
}
