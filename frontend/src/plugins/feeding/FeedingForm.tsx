/** Feeding entry form — type-switch changes visible fields. */

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Droplets } from "lucide-react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateFeeding, useFeedingEntries, useUpdateFeeding } from "../../hooks/useFeeding";
import { useCreateHealth } from "../../hooks/useHealth";
import { isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { attachTag } from "../../api/tags";
import type { FeedingEntry, FeedingType, HealthSeverity } from "../../api/types";
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

const SPIT_SEVERITIES: { value: HealthSeverity; label: string; color: string }[] = [
  { value: "mild", label: "Wenig", color: "bg-green text-ground" },
  { value: "moderate", label: "Mittel", color: "bg-peach text-ground" },
  { value: "severe", label: "Stark", color: "bg-red text-ground" },
];

export function FeedingForm({ entry, onDone, onCancel }: FeedingFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateFeeding();
  const updateMut = useUpdateFeeding();
  const createHealthMut = useCreateHealth();
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);
  const [showSpitOverlay, setShowSpitOverlay] = useState(false);
  const [savedFeedingId, setSavedFeedingId] = useState<number | null>(entry?.id ?? null);

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
  const justSaved = savedFeedingId != null && !entry;

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
      setSavedFeedingId(result.id);
      if (pendingTagIds.length > 0) {
        await Promise.all(pendingTagIds.map(tagId =>
          attachTag({ tag_id: tagId, entry_type: "feeding", entry_id: result.id })
        ));
      }
      // Don't close — show success state with spit-up option
    }
  }

  // After saving a new entry: show success view with spit-up option
  if (justSaved) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-[8px] border border-green bg-green/10 p-3 text-sm text-green font-label">
          Mahlzeit gespeichert
        </div>

        {!showSpitOverlay ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSpitOverlay(true)}
              className="flex-1 flex items-center justify-center gap-1.5"
            >
              <Droplets className="h-3.5 w-3.5" />
              Spucken erfassen
            </Button>
            <Button type="button" onClick={() => onDone?.()} className="flex-1">
              Fertig
            </Button>
          </div>
        ) : (
          <div>
            <p className="font-label text-sm font-medium text-text mb-2">Spucken erfassen</p>
            <div className="grid grid-cols-3 gap-2">
              {SPIT_SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={createHealthMut.isPending}
                  onClick={async () => {
                    await createHealthMut.mutateAsync({
                      child_id: activeChild!.id,
                      entry_type: "spit_up",
                      severity: s.value,
                      time: nowISO(),
                      feeding_id: savedFeedingId,
                    });
                    onDone?.();
                  }}
                  className={`min-h-[44px] rounded-[8px] font-label text-sm font-medium transition-colors ${s.color} hover:opacity-90 disabled:opacity-50`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setShowSpitOverlay(false); onDone?.(); }}
              className="mt-2 font-body text-xs text-overlay0 hover:text-text transition-colors"
            >
              Abbrechen
            </button>
          </div>
        )}
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
