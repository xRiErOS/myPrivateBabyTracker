/** Diaper entry form — color buttons as visual selection. */

import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateDiaper, useUpdateDiaper } from "../../hooks/useDiaper";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { attachTag } from "../../api/tags";
import type { DiaperEntry, DiaperType } from "../../api/types";

interface DiaperFormProps {
  entry?: DiaperEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

export function DiaperForm({ entry, onDone, onCancel }: DiaperFormProps) {
  const { t } = useTranslation("diaper");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();

  const DIAPER_TYPE_OPTIONS = [
    { value: "wet", label: t("type.wet") },
    { value: "dirty", label: t("type.dirty") },
    { value: "mixed", label: t("type.mixed") },
    { value: "dry", label: t("type.dry") },
  ];
  const createMut = useCreateDiaper();
  const updateMut = useUpdateDiaper();

  const [diaperType, setDiaperType] = useState<DiaperType>(entry?.diaper_type ?? "wet");
  const [time, setTime] = useState(
    entry?.time ? isoToLocalInput(entry.time) : isoToLocalInput(nowISO()),
  );
  const [hasRash, setHasRash] = useState(entry?.has_rash ?? false);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

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
      onDone?.();
    } else {
      const result = await createMut.mutateAsync(payload);
      if (pendingTagIds.length > 0) {
        await Promise.all(pendingTagIds.map(tagId =>
          attachTag({ tag_id: tagId, entry_type: "diaper", entry_id: result.id })
        ));
      }
      onDone?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Select
        label={t("label_type")}
        options={DIAPER_TYPE_OPTIONS}
        value={diaperType}
        onChange={(e) => setDiaperType(e.target.value as DiaperType)}
        required
      />

      <Input
        label={t("label_time")}
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
          {t("has_rash")}
        </span>
      </label>

      <Input
        label={tc("notes")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={tc("notes_placeholder")}
        maxLength={2000}
      />

      <div className="pt-3 border-t border-surface1">
        {entry ? (
          <TagSelector entryType="diaper" entryId={entry.id} />
        ) : (
          <TagSelector entryType="diaper" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
        )}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{tc("cancel")}</Button>}
        <Button type="submit" disabled={isPending || !time}>
          {isPending ? tc("saving") : entry ? tc("update") : tc("add")}
        </Button>
      </div>
    </form>
  );
}
