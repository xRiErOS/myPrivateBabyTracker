/** Checkup entry form — create/edit U-Untersuchungen. */

import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useActiveChild } from "../../context/ChildContext";
import { useCheckupTypes, useCreateCheckup, useUpdateCheckup } from "../../hooks/useCheckup";
import { formatApiError } from "../../lib/errorMessages";
import type { CheckupEntry } from "../../api/checkup";

interface CheckupFormProps {
  entry?: CheckupEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

export function CheckupForm({ entry, onDone, onCancel }: CheckupFormProps) {
  const { t } = useTranslation("checkup");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const { data: types = [] } = useCheckupTypes();
  const createMut = useCreateCheckup();
  const updateMut = useUpdateCheckup();

  const [checkupTypeId, setCheckupTypeId] = useState(entry?.checkup_type_id?.toString() ?? "");
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().slice(0, 10));
  const [doctor, setDoctor] = useState(entry?.doctor ?? "");
  const [weightKg, setWeightKg] = useState(
    entry?.weight_grams ? (entry.weight_grams / 1000).toFixed(2) : "",
  );
  const [heightCm, setHeightCm] = useState(entry?.height_cm?.toString() ?? "");
  const [headCm, setHeadCm] = useState(entry?.head_circumference_cm?.toString() ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (isEditing) {
        await updateMut.mutateAsync({
          id: entry.id,
          data: {
            date,
            doctor: doctor || null,
            weight_grams: weightKg ? Math.round(parseFloat(weightKg) * 1000) : null,
            height_cm: heightCm ? parseFloat(heightCm) : null,
            head_circumference_cm: headCm ? parseFloat(headCm) : null,
            notes: notes || null,
          },
        });
      } else {
        await createMut.mutateAsync({
          child_id: activeChild!.id,
          checkup_type_id: parseInt(checkupTypeId),
          date,
          doctor: doctor || null,
          weight_grams: weightKg ? Math.round(parseFloat(weightKg) * 1000) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          head_circumference_cm: headCm ? parseFloat(headCm) : null,
          notes: notes || null,
        });
      }
      onDone?.();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {!isEditing && (
          <div>
            <label className="font-label text-sm text-subtext0 mb-1 block">
              {t("label_type")} *
            </label>
            <select
              value={checkupTypeId}
              onChange={(e) => setCheckupTypeId(e.target.value)}
              className="w-full rounded-lg border border-surface1 bg-ground px-3 py-2 text-base text-text"
              required
            >
              <option value="">{t("select_type")}</option>
              {types.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label={t("label_date")}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label={t("label_doctor")}
          value={doctor}
          onChange={(e) => setDoctor(e.target.value)}
          placeholder={t("doctor_placeholder")}
          maxLength={200}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            label={t("label_weight")}
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            min="0.50"
            max="30.00"
            step="0.01"
            placeholder="kg"
          />
          <Input
            label={t("label_height")}
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            min="20"
            max="120"
            step="0.1"
            placeholder="cm"
          />
          <Input
            label={t("label_head")}
            type="number"
            value={headCm}
            onChange={(e) => setHeadCm(e.target.value)}
            min="20"
            max="60"
            step="0.1"
            placeholder="cm"
          />
        </div>
        <Input
          label={tc("notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tc("notes_placeholder")}
          maxLength={2000}
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {tc("cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isPending || (!isEditing && !checkupTypeId)}>
            {isPending ? tc("saving") : isEditing ? tc("update") : tc("add")}
          </Button>
        </div>
      </form>
    </div>
  );
}
