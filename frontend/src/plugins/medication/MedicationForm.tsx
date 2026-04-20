/** Medication entry form — dropdown from master data + free-text fallback. */

import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateMedication, useUpdateMedication } from "../../hooks/useMedication";
import { useMedicationMasters } from "../../hooks/useMedicationMasters";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import type { MedicationEntry } from "../../api/types";

interface MedicationFormProps {
  entry?: MedicationEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

export function MedicationForm({ entry, onDone, onCancel }: MedicationFormProps) {
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const createMut = useCreateMedication();
  const updateMut = useUpdateMedication();
  const { data: masters = [] } = useMedicationMasters();

  const [givenAt, setGivenAt] = useState(
    entry?.given_at ? isoToLocalInput(entry.given_at) : isoToLocalInput(nowISO()),
  );
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(
    entry?.medication_master_id ?? null,
  );
  const [medicationName, setMedicationName] = useState(entry?.medication_name ?? "");
  const [dose, setDose] = useState(entry?.dose ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [useFreeTex, setUseFreeText] = useState(
    entry != null && !entry.medication_master_id,
  );
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  function handleMasterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "__free__") {
      setUseFreeText(true);
      setSelectedMasterId(null);
      setMedicationName("");
      return;
    }
    const master = masters.find((m) => m.id === Number(val));
    if (master) {
      setSelectedMasterId(master.id);
      setMedicationName(master.name);
      setUseFreeText(false);
      if (!dose && master.default_unit) {
        setDose(master.default_unit);
      }
    }
  }

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
            medication_master_id: selectedMasterId,
            dose: dose.trim() || null,
            notes: notes || null,
          },
        });
        onDone?.();
      } else {
        const result = await createMut.mutateAsync({
          child_id: activeChild!.id,
          given_at: localInputToISO(givenAt),
          medication_name: medicationName.trim(),
          medication_master_id: selectedMasterId,
          dose: dose.trim() || null,
          notes: notes || null,
        });
        setCreatedId(result.id);
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  // After creation: form stays open, TagSelector becomes active, submit changes to "Fertig"

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {masters.length > 0 && !useFreeTex ? (
          <div className="flex flex-col gap-1">
            <label className="font-label text-sm font-medium text-subtext0">
              Medikament <span className="text-red">*</span>
            </label>
            <select
              value={selectedMasterId ?? ""}
              onChange={handleMasterChange}
              className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
            >
              <option value="">-- Medikament waehlen --</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.active_ingredient ? ` (${m.active_ingredient})` : ""}
                </option>
              ))}
              <option value="__free__">Anderes (Freitext)</option>
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="font-label text-sm font-medium text-subtext0">
              Medikament <span className="text-red">*</span>
            </label>
            <Input
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              placeholder="z.B. Paracetamol, Ibuprofen..."
              maxLength={200}
            />
            {masters.length > 0 ? (
              <button
                type="button"
                onClick={() => setUseFreeText(false)}
                className="font-label text-xs text-mauve hover:underline text-left"
              >
                Aus Liste waehlen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/admin/medication-masters")}
                className="font-label text-xs text-mauve hover:underline text-left"
              >
                Medikamentenliste anlegen
              </button>
            )}
          </div>
        )}
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
        <div className="pt-3 border-t border-surface1">
          {(entry || createdId) ? (
            <TagSelector entryType="medication" entryId={(entry?.id ?? createdId)!} />
          ) : (
            <p className="font-body text-xs text-subtext0">Tags nach dem Speichern verfuegbar</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>}
          {createdId && !entry ? (
            <Button type="button" variant="primary" onClick={() => onDone?.()}>Fertig</Button>
          ) : (
            <Button type="submit" disabled={isPending || !medicationName.trim()}>
              {isPending ? "Speichern..." : isEditing ? "Aktualisieren" : "Nachtragen"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
