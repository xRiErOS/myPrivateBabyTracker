/** Health entry form — create/edit spit-up and tummy ache entries. */

import { type FormEvent, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateHealth, useUpdateHealth } from "../../hooks/useHealth";
import { useFeedingEntries } from "../../hooks/useFeeding";
import { formatDateTime, isoToLocalInput, localInputToISO, nowISO, daysAgoISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import { attachTag } from "../../api/tags";
import type { HealthEntry, HealthEntryType, HealthSeverity, HealthDuration } from "../../api/types";

const ENTRY_TYPES: { value: HealthEntryType; label: string }[] = [
  { value: "spit_up", label: "Spucken" },
  { value: "tummy_ache", label: "Bauchschmerzen" },
];

const SEVERITIES: { value: HealthSeverity; label: string }[] = [
  { value: "mild", label: "Wenig" },
  { value: "moderate", label: "Mittel" },
  { value: "severe", label: "Stark" },
];

const DURATIONS: { value: HealthDuration; label: string }[] = [
  { value: "short", label: "Kurz (~1h)" },
  { value: "medium", label: "Mittel (1-2h)" },
  { value: "long", label: "Lang (>2h)" },
];

const FEEDING_TYPE_LABELS: Record<string, string> = {
  breast_left: "Brust L",
  breast_right: "Brust R",
  bottle: "Flasche",
  solid: "Beikost",
};

interface HealthFormProps {
  entry?: HealthEntry;
  /** Pre-select a feeding (when opened from FeedingForm). */
  defaultFeedingId?: number;
  onDone?: () => void;
  onCancel?: () => void;
}

export function HealthForm({ entry, defaultFeedingId, onDone, onCancel }: HealthFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateHealth();
  const updateMut = useUpdateHealth();

  const [entryType, setEntryType] = useState<HealthEntryType>(entry?.entry_type ?? "spit_up");
  const [severity, setSeverity] = useState<HealthSeverity>(entry?.severity ?? "mild");
  const [duration, setDuration] = useState<HealthDuration | null>(entry?.duration ?? null);
  const [time, setTime] = useState(
    entry?.time ? isoToLocalInput(entry.time) : isoToLocalInput(nowISO()),
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [feedingId, setFeedingId] = useState<number | null>(entry?.feeding_id ?? defaultFeedingId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

  // Fetch last 4 feedings for linking
  const { data: recentFeedings = [] } = useFeedingEntries({
    child_id: activeChild?.id,
    date_from: daysAgoISO(2),
  });
  const last4Feedings = [...recentFeedings]
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 4);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  function handleApiError(err: unknown) {
    if (err instanceof ApiError) {
      const msg = err.message.replace(/^API \d+: /, "");
      setError(msg);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("Unbekannter Fehler");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeChild) return;
    setError(null);

    const payload = {
      child_id: activeChild.id,
      entry_type: entryType,
      severity: severity,
      duration: entryType === "tummy_ache" ? duration : null,
      time: localInputToISO(time),
      notes: notes || null,
      feeding_id: feedingId,
    };

    try {
      if (entry) {
        const { child_id: _, ...updateData } = payload;
        await updateMut.mutateAsync({ id: entry.id, data: updateData });
        onDone?.();
      } else {
        const result = await createMut.mutateAsync(payload);
        if (pendingTagIds.length > 0) {
          await Promise.all(pendingTagIds.map(tagId =>
            attachTag({ tag_id: tagId, entry_type: "health", entry_id: result.id })
          ));
        }
        onDone?.();
      }
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Error display */}
      {error && (
        <div className="rounded-[8px] border border-red bg-red/10 p-3 text-sm text-red">
          {error}
        </div>
      )}

      {/* Entry type selector */}
      <div>
        <label className="font-label text-sm font-medium text-text block mb-1">
          Typ *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setEntryType(t.value);
                if (t.value !== "tummy_ache") setDuration(null);
              }}
              className={`min-h-[44px] rounded-[8px] font-label text-sm font-medium transition-colors ${
                entryType === t.value
                  ? "bg-mauve text-ground"
                  : "bg-surface1 text-text hover:bg-surface2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity selector */}
      <div>
        <label className="font-label text-sm font-medium text-text block mb-1">
          Intensitaet *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`min-h-[44px] rounded-[8px] font-label text-sm font-medium transition-colors ${
                severity === s.value
                  ? s.value === "mild"
                    ? "bg-green text-ground"
                    : s.value === "moderate"
                      ? "bg-peach text-ground"
                      : "bg-red text-ground"
                  : "bg-surface1 text-text hover:bg-surface2"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration selector — only for tummy_ache */}
      {entryType === "tummy_ache" && (
        <div>
          <label className="font-label text-sm font-medium text-text block mb-1">
            Dauer
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(duration === d.value ? null : d.value)}
                className={`min-h-[44px] rounded-[8px] font-label text-sm font-medium transition-colors ${
                  duration === d.value
                    ? "bg-mauve text-ground"
                    : "bg-surface1 text-text hover:bg-surface2"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time input */}
      <Input
        label="Zeitpunkt *"
        type="datetime-local"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
      />

      {/* Feeding link — last 4 feedings */}
      {last4Feedings.length > 0 && (
        <div>
          <label className="font-label text-sm font-medium text-text block mb-1">
            Mahlzeit zuordnen
          </label>
          <div className="flex flex-col gap-1.5">
            {last4Feedings.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFeedingId(feedingId === f.id ? null : f.id)}
                className={`min-h-[44px] rounded-[8px] px-3 text-left font-body text-sm transition-colors ${
                  feedingId === f.id
                    ? "bg-peach text-ground"
                    : "bg-surface1 text-text hover:bg-surface2"
                }`}
              >
                <span className="font-medium">{FEEDING_TYPE_LABELS[f.feeding_type] ?? f.feeding_type}</span>
                {f.amount_ml ? ` ${f.amount_ml} ml` : ""}
                <span className="text-xs opacity-70 ml-2">{formatDateTime(f.start_time)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <Input
        label="Notizen"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optionale Notizen..."
        maxLength={2000}
      />

      {/* Tags */}
      <div className="pt-3 border-t border-surface1">
        {isEditing ? (
          <TagSelector entryType="health" entryId={entry!.id} />
        ) : (
          <TagSelector entryType="health" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>}
        <Button type="submit" disabled={isPending || !time}>
          {isPending ? "Speichern..." : isEditing ? "Aktualisieren" : "Eintragen"}
        </Button>
      </div>
    </form>
  );
}
