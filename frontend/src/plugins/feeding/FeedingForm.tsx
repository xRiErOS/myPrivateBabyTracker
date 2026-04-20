/** Feeding entry form — type-switch changes visible fields. */

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateFeeding, useFeedingEntries, useUpdateFeeding } from "../../hooks/useFeeding";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import type { FeedingEntry, FeedingType } from "../../api/types";

const FEEDING_TYPE_OPTIONS = [
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
  const [createdId, setCreatedId] = useState<number | null>(null);

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
      setFeedingType(lastFeedingType);
      presetApplied.current = true;
    }
  }, [lastFeedingType]);

  const [startTime, setStartTime] = useState(
    entry?.start_time ? isoToLocalInput(entry.start_time) : isoToLocalInput(nowISO()),
  );
  const [amountMl, setAmountMl] = useState(entry?.amount_ml?.toString() ?? "");
  const [foodType, setFoodType] = useState(entry?.food_type ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");

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
      setCreatedId(result.id);
    }
  }

  if (createdId && !entry) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[8px] border-2 border-green bg-green/10 p-3">
          <p className="font-label text-base font-semibold text-green">Eintrag gespeichert</p>
        </div>
        <div>
          <p className="font-label text-sm font-medium text-text mb-2">Tags hinzufuegen (optional)</p>
          <TagSelector entryType="feeding" entryId={createdId} />
        </div>
        <Button variant="primary" onClick={() => onDone?.()}>Fertig</Button>
      </div>
    );
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
      {entry && (
        <div className="pt-3 border-t border-surface1">
          <TagSelector entryType="feeding" entryId={entry.id} />
        </div>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>}
        <Button type="submit" disabled={isPending || !startTime}>
          {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Nachtragen"}
        </Button>
      </div>
    </form>
  );
}
