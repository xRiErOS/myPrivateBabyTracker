/** Medication entry form — create/edit medication administration. */

import { type FormEvent, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateMedication, useUpdateMedication } from "../../hooks/useMedication";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import type { MedicationEntry } from "../../api/types";

interface MedicationFormProps {
  entry?: MedicationEntry;
  onDone?: () => void;
}

export function MedicationForm({ entry, onDone }: MedicationFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateMedication();
  const updateMut = useUpdateMedication();

  const [givenAt, setGivenAt] = useState(
    entry?.given_at ? isoToLocalInput(entry.given_at) : isoToLocalInput(nowISO()),
  );
  const [medicationName, setMedicationName] = useState(entry?.medication_name ?? "");
  const [dose, setDose] = useState(entry?.dose ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!medicationName.trim()) {
      setError("Medikamentenname ist erforderlich");
      return;
    }

    try {
      if (isEditing) {
        await updateMut.mutateAsync({
          id: entry.id,
          data: {
            given_at: localInputToISO(givenAt),
            medication_name: medicationName.trim(),
            dose: dose.trim() || null,
            notes: notes || null,
          },
        });
      } else {
        await createMut.mutateAsync({
          child_id: activeChild!.id,
          given_at: localInputToISO(givenAt),
          medication_name: medicationName.trim(),
          dose: dose.trim() || null,
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
          label="Medikament"
          value={medicationName}
          onChange={(e) => setMedicationName(e.target.value)}
          placeholder="z.B. Paracetamol, Ibuprofen..."
          maxLength={200}
        />
        <Input
          label="Dosis"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="z.B. 2.5 ml, 1 Tablette..."
          maxLength={100}
        />
        <Input
          label="Zeitpunkt"
          type="datetime-local"
          value={givenAt}
          onChange={(e) => setGivenAt(e.target.value)}
        />
        <Input
          label="Notizen"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionale Notizen..."
          maxLength={2000}
        />
        <Button type="submit" disabled={isPending || !medicationName.trim()}>
          {isPending ? "Speichern..." : isEditing ? "Aktualisieren" : "Nachtragen"}
        </Button>
      </form>
    </div>
  );
}
