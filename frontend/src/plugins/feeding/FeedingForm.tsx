/** Feeding entry form — type-switch changes visible fields. */

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
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
}

export function FeedingForm({ entry, onDone }: FeedingFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateFeeding();
  const updateMut = useUpdateFeeding();

  // Letzten Eintrag laden, um feeding_type als Default vorzubelegen
  const { data: recentEntries = [] } = useFeedingEntries({
    child_id: activeChild?.id,
  });
  const lastFeedingType = recentEntries[0]?.feeding_type;

  const [feedingType, setFeedingType] = useState<FeedingType>(
    entry?.feeding_type ?? "breast_left",
  );
  // Einmalig den Typ aus dem letzten Eintrag uebernehmen (nur neues Formular)
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
    } else {
      await createMut.mutateAsync(payload);
    }
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Select
        label="Typ"
        options={FEEDING_TYPE_OPTIONS}
        value={feedingType}
        onChange={(e) => setFeedingType(e.target.value as FeedingType)}
      />

      <Input
        label="Zeitpunkt"
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        required
      />

      {showAmount && (
        <Input
          label="Menge (ml)"
          type="number"
          value={amountMl}
          onChange={(e) => setAmountMl(e.target.value)}
          min={0}
          max={1000}
          placeholder="0"
        />
      )}

      {showFoodType && (
        <Input
          label="Beikost"
          value={foodType}
          onChange={(e) => setFoodType(e.target.value)}
          placeholder="z.B. Karotten, Brei"
          maxLength={100}
        />
      )}

      <Input
        label="Notizen"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optionale Notizen..."
        maxLength={2000}
      />

      <Button type="submit" disabled={isPending || !startTime}>
        {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Speichern"}
      </Button>
    </form>
  );
}
