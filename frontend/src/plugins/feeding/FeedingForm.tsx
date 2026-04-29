/** Feeding entry form — type-switch changes visible fields. */

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateFeeding, useFeedingEntries, useUpdateFeeding } from "../../hooks/useFeeding";
import { useEntryToast } from "../../hooks/useEntryToast";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { attachTag } from "../../api/tags";
import type { FeedingEntry, FeedingType } from "../../api/types";
import { isBreastfeedingForChild } from "../../lib/breastfeedingMode";

interface FeedingFormProps {
  entry?: FeedingEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

export function FeedingForm({ entry, onDone, onCancel }: FeedingFormProps) {
  const { t } = useTranslation("feeding");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();

  const ALL_FEEDING_TYPE_OPTIONS = [
    { value: "breast_left", label: t("type.breast_left") },
    { value: "breast_right", label: t("type.breast_right") },
    { value: "bottle", label: t("type.bottle") },
    { value: "solid", label: t("type.solid") },
  ];
  const createMut = useCreateFeeding();
  const updateMut = useUpdateFeeding();
  const toast = useEntryToast();
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

  const { data: recentEntries = [] } = useFeedingEntries({
    child_id: activeChild?.id,
  });
  const lastFeedingType = recentEntries[0]?.feeding_type;

  const [feedingType, setFeedingType] = useState<FeedingType>(
    entry?.feeding_type ?? "breast_left",
  );
  const presetApplied = useRef(!!entry);
  useEffect(() => {
    if (!presetApplied.current && lastFeedingType) {
      if (isBreastfeedingForChild(activeChild)) {
        // Preset opposite breast side; for bottle/solid keep same type
        const preset: FeedingType =
          lastFeedingType === "breast_left" ? "breast_right" :
          lastFeedingType === "breast_right" ? "breast_left" :
          lastFeedingType;
        setFeedingType(preset);
      } else {
        setFeedingType("bottle");
      }
      presetApplied.current = true;
    }
  }, [lastFeedingType, activeChild]);

  const [startTime, setStartTime] = useState(
    entry?.start_time ? isoToLocalInput(entry.start_time) : isoToLocalInput(nowISO()),
  );
  const [amountMl, setAmountMl] = useState(entry?.amount_ml?.toString() ?? "");
  const [foodType, setFoodType] = useState(entry?.food_type ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const breastfeedingOn = isBreastfeedingForChild(activeChild);
  const FEEDING_TYPE_OPTIONS = breastfeedingOn
    ? ALL_FEEDING_TYPE_OPTIONS
    : ALL_FEEDING_TYPE_OPTIONS.filter((o) => o.value !== "breast_left" && o.value !== "breast_right");

  const isPending = createMut.isPending || updateMut.isPending;
  const showAmount = feedingType === "bottle";
  const showFoodType = feedingType === "solid";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeChild) return;

    const payload = {
      child_id: activeChild.id,
      start_time: localInputToISO(startTime),
      feeding_type: feedingType,
      amount_ml: amountMl ? Number(amountMl) : null,
      food_type: foodType || null,
      notes: notes || null,
    };

    if (entry) {
      const { child_id: _, ...updateData } = payload;
      await updateMut.mutateAsync({ id: entry.id, data: updateData });
    } else {
      const result = await createMut.mutateAsync(payload);
      if (pendingTagIds.length > 0) {
        await Promise.all(pendingTagIds.map(tagId =>
          attachTag({ tag_id: tagId, entry_type: "feeding", entry_id: result.id })
        ));
      }
    }
    toast.saved();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Select
        label={t("label_type")}
        options={FEEDING_TYPE_OPTIONS}
        value={feedingType}
        onChange={(e) => setFeedingType(e.target.value as FeedingType)}
        required
      />
      <Input
        label={t("label_time")}
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        required
      />
      {showAmount && (
        <Input label={t("label_amount")} type="number" value={amountMl} onChange={(e) => setAmountMl(e.target.value)} min={0} max={1000} placeholder="0" />
      )}
      {showFoodType && (
        <Input label={t("label_food_type")} value={foodType} onChange={(e) => setFoodType(e.target.value)} placeholder={t("food_type_placeholder")} maxLength={100} />
      )}
      <Input label={tc("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tc("notes_placeholder")} maxLength={2000} />
      <div className="pt-3 border-t border-surface1">
        {entry ? (
          <TagSelector entryType="feeding" entryId={entry.id} />
        ) : (
          <TagSelector entryType="feeding" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
        )}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{tc("cancel")}</Button>}
        <Button type="submit" disabled={isPending || !startTime}>
          {isPending ? tc("saving") : entry ? tc("update") : tc("add")}
        </Button>
      </div>
    </form>
  );
}
