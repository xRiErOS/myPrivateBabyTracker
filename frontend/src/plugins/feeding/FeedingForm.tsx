/** Feeding entry form — type-switch changes visible fields. */

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateFeeding, useFeedingEntries, useUpdateFeeding } from "../../hooks/useFeeding";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { attachTag } from "../../api/tags";
import type { FeedingEntry, FeedingType } from "../../api/types";
import { isBreastfeedingEnabled } from "../../lib/breastfeedingMode";

const ALL_FEEDING_TYPE_OPTIONS = [
  { value: "breast_left", label: "Brust links" },
  { value: "breast_right", label: "Brust rechts" },
  { value: "bottle", label: "Flasche" },
  { value: "solid", label: "Beikost" },
];

interface FeedingFormProps {
  entry?: FeedingEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

export function FeedingForm({ entry, onDone, onCancel }: FeedingFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateFeeding();
  const updateMut = useUpdateFeeding();
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
      if (isBreastfeedingEnabled()) {
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
  }, [lastFeedingType]);

  const [startTime, setStartTime] = useState(
    entry?.start_time ? isoToLocalInput(entry.start_time) : isoToLocalInput(nowISO()),
  );
  const [amountMl, setAmountMl] = useState(entry?.amount_ml?.toString() ?? "");
  const [foodType, setFoodType] = useState(entry?.food_type ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");

  const breastfeedingOn = isBreastfeedingEnabled();
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
      onDone?.();
    } else {
      const result = await createMut.mutateAsync(payload);
      if (pendingTagIds.length > 0) {
        await Promise.all(pendingTagIds.map(tagId =>
          attachTag({ tag_id: tagId, entry_type: "feeding", entry_id: result.id })
        ));
      }
      onDone?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Select
        label="Typ"
        options={FEEDING_TYPE_OPTIONS}
        value={feedingType}
        onChange={(e) => setFeedingType(e.target.value as FeedingType)}
        required
      />
      <Input
        label="Zeitpunkt"
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        required
      />
      {showAmount && (
        <Input label="Menge (ml)" type="number" value={amountMl} onChange={(e) => setAmountMl(e.target.value)} min={0} max={1000} placeholder="0" />
      )}
      {showFoodType && (
        <Input label="Beikost" value={foodType} onChange={(e) => setFoodType(e.target.value)} placeholder="z.B. Karotten, Brei" maxLength={100} />
      )}
      <Input label="Notizen" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionale Notizen..." maxLength={2000} />
      <div className="pt-3 border-t border-surface1">
        {entry ? (
          <TagSelector entryType="feeding" entryId={entry.id} />
        ) : (
          <TagSelector entryType="feeding" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
        )}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>}
        <Button type="submit" disabled={isPending || !startTime}>
          {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Eintragen"}
        </Button>
      </div>
    </form>
  );
}
