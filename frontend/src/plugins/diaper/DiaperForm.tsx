/** Diaper entry form — color buttons as visual selection. */

import { type FormEvent, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateDiaper, useUpdateDiaper } from "../../hooks/useDiaper";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import type { DiaperEntry, DiaperType } from "../../api/types";

const DIAPER_TYPE_OPTIONS = [
  { value: "wet", label: "Nass" },
  { value: "dirty", label: "Stuhl" },
  { value: "mixed", label: "Gemischt" },
  { value: "dry", label: "Trocken" },
];


interface DiaperFormProps {
  entry?: DiaperEntry;
  onDone?: () => void;
}

export function DiaperForm({ entry, onDone }: DiaperFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateDiaper();
  const updateMut = useUpdateDiaper();

  const [diaperType, setDiaperType] = useState<DiaperType>(entry?.diaper_type ?? "wet");
  const [time, setTime] = useState(
    entry?.time ? isoToLocalInput(entry.time) : isoToLocalInput(nowISO()),
  );
  const [hasRash, setHasRash] = useState(entry?.has_rash ?? false);
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeChild) return;

    const payload = {
      child_id: activeChild.id,
      time: localInputToISO(time),
      diaper_type: diaperType,
      color: null,
      has_rash: hasRash,
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
        options={DIAPER_TYPE_OPTIONS}
        value={diaperType}
        onChange={(e) => setDiaperType(e.target.value as DiaperType)}
        required
      />

      <Input
        label="Zeitpunkt"
        type="datetime-local"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
      />

      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          checked={hasRash}
          onChange={(e) => setHasRash(e.target.checked)}
          className="h-5 w-5 rounded accent-red"
        />
        <span className="font-label text-sm font-medium text-subtext0">
          Ausschlag vorhanden
        </span>
      </label>

      <Input
        label="Notizen"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optionale Notizen..."
        maxLength={2000}
      />

      <Button type="submit" disabled={isPending || !time}>
        {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Nachtragen"}
      </Button>
    </form>
  );
}
