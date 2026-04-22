/** Temperature entry form — create/edit temperature measurements. */

import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateTemperature, useUpdateTemperature } from "../../hooks/useTemperature";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import { attachTag } from "../../api/tags";
import type { TemperatureEntry } from "../../api/types";

interface TemperatureFormProps {
  entry?: TemperatureEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

export function TemperatureForm({ entry, onDone, onCancel }: TemperatureFormProps) {
  const { t } = useTranslation("temperature");
  const { t: tc } = useTranslation("common");
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
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const tempValue = parseFloat(temperature);
    if (isNaN(tempValue) || tempValue < 34 || tempValue > 43) {
      setError(t("validation.range"));
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
        onDone?.();
      } else {
        const result = await createMut.mutateAsync({
          child_id: activeChild!.id,
          measured_at: localInputToISO(measuredAt),
          temperature_celsius: tempValue,
          notes: notes || null,
        });
        if (pendingTagIds.length > 0) {
          await Promise.all(pendingTagIds.map(tagId =>
            attachTag({ tag_id: tagId, entry_type: "temperature", entry_id: result.id })
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
          label={t("label_time")}
          type="datetime-local"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="font-label text-sm font-medium text-subtext0">
            {t("label_temperature")} <span className="text-red">*</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const v = Math.max(34.0, parseFloat(temperature) - 0.1);
                setTemperature(v.toFixed(1));
              }}
              className="min-h-[44px] min-w-[44px] rounded-[8px] bg-surface0 text-text font-headline text-xl font-semibold hover:bg-surface1 active:bg-surface2 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              min="34.0"
              max="43.0"
              step="0.1"
              className="flex-1 min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-headline text-xl text-center text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
            />
            <button
              type="button"
              onClick={() => {
                const v = Math.min(43.0, parseFloat(temperature) + 0.1);
                setTemperature(v.toFixed(1));
              }}
              className="min-h-[44px] min-w-[44px] rounded-[8px] bg-surface0 text-text font-headline text-xl font-semibold hover:bg-surface1 active:bg-surface2 transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <Input
          label={tc("notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tc("notes_placeholder")}
          maxLength={2000}
        />
        <div className="pt-3 border-t border-surface1">
          {entry ? (
            <TagSelector entryType="temperature" entryId={entry.id} />
          ) : (
            <TagSelector entryType="temperature" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
          )}
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{tc("cancel")}</Button>}
          <Button type="submit" disabled={isPending || !measuredAt}>
            {isPending ? tc("saving") : isEditing ? tc("update") : tc("add")}
          </Button>
        </div>
      </form>
    </div>
  );
}
