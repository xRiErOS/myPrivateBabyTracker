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

const CONSISTENCY_OPTIONS = [
  { value: "", label: "Keine Angabe" },
  { value: "fluessig", label: "Fluessig" },
  { value: "weich", label: "Weich" },
  { value: "fest", label: "Fest" },
  { value: "koernig", label: "Koernig" },
];

const COLOR_PRESETS = [
  { value: "gelb", label: "Gelb", bg: "bg-yellow" },
  { value: "braun", label: "Braun", bg: "bg-peach" },
  { value: "gruen", label: "Gruen", bg: "bg-green" },
  { value: "schwarz", label: "Schwarz", bg: "bg-crust" },
  { value: "weiss", label: "Weiss", bg: "bg-surface2" },
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
  const [color, setColor] = useState(entry?.color ?? "");
  const [consistency, setConsistency] = useState(entry?.consistency ?? "");
  const [hasRash, setHasRash] = useState(entry?.has_rash ?? false);
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const isPending = createMut.isPending || updateMut.isPending;
  const showColorAndConsistency = diaperType === "dirty" || diaperType === "mixed";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeChild) return;

    const payload = {
      child_id: activeChild.id,
      time: localInputToISO(time),
      diaper_type: diaperType,
      color: color || null,
      consistency: consistency || null,
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
      />

      <Input
        label="Zeitpunkt"
        type="datetime-local"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
      />

      {showColorAndConsistency && (
        <>
          <div className="flex flex-col gap-1">
            <span className="font-label text-sm font-medium text-subtext0">
              Farbe
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={`min-h-[44px] min-w-[3rem] px-3 py-2 rounded-[8px] font-label text-xs font-medium transition-all ${
                    color === preset.value
                      ? `${preset.bg} text-ground ring-2 ring-mauve`
                      : `${preset.bg} text-ground opacity-60 hover:opacity-80`
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <Select
            label="Konsistenz"
            options={CONSISTENCY_OPTIONS}
            value={consistency}
            onChange={(e) => setConsistency(e.target.value)}
          />
        </>
      )}

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
        {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Speichern"}
      </Button>
    </form>
  );
}
