/** Weight entry form — create/edit weight measurements. */

import { type FormEvent, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateWeight, useUpdateWeight } from "../../hooks/useWeight";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import { attachTag } from "../../api/tags";
import type { WeightEntry } from "../../api/types";

interface WeightFormProps {
  entry?: WeightEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

function gramsToKg(grams: number): string {
  return (grams / 1000).toFixed(2);
}

function kgToGrams(kg: string): number {
  return Math.round(parseFloat(kg) * 1000);
}

export function WeightForm({ entry, onDone, onCancel }: WeightFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateWeight();
  const updateMut = useUpdateWeight();

  const [measuredAt, setMeasuredAt] = useState(
    entry?.measured_at ? isoToLocalInput(entry.measured_at) : isoToLocalInput(nowISO()),
  );
  const [weightKg, setWeightKg] = useState(
    entry?.weight_grams ? gramsToKg(entry.weight_grams) : "4.00",
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const grams = kgToGrams(weightKg);
    if (isNaN(grams) || grams < 500 || grams > 30000) {
      setError("Gewicht muss zwischen 0.50 und 30.00 kg liegen");
      return;
    }

    try {
      if (isEditing) {
        await updateMut.mutateAsync({
          id: entry.id,
          data: {
            measured_at: localInputToISO(measuredAt),
            weight_grams: grams,
            notes: notes || null,
          },
        });
        onDone?.();
      } else {
        const result = await createMut.mutateAsync({
          child_id: activeChild!.id,
          measured_at: localInputToISO(measuredAt),
          weight_grams: grams,
          notes: notes || null,
        });
        if (pendingTagIds.length > 0) {
          await Promise.all(pendingTagIds.map(tagId =>
            attachTag({ tag_id: tagId, entry_type: "weight", entry_id: result.id })
          ));
        }
        onDone?.();
      }
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
          label="Gewicht (kg)"
          type="number"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          min="0.50"
          max="30.00"
          step="0.01"
        />
        <Input
          label="Notizen"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionale Notizen..."
          maxLength={2000}
        />
        <div className="pt-3 border-t border-surface1">
          {entry ? (
            <TagSelector entryType="weight" entryId={entry.id} />
          ) : (
            <TagSelector entryType="weight" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
          )}
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>}
          <Button type="submit" disabled={isPending || !measuredAt}>
            {isPending ? "Speichern..." : isEditing ? "Aktualisieren" : "Nachtragen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
