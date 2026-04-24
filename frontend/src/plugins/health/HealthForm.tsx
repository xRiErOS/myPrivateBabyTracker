/** Health entry form — create/edit spit-up and tummy ache entries. */

import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateHealth, useUpdateHealth } from "../../hooks/useHealth";
import { useFeedingEntries } from "../../hooks/useFeeding";
import { formatTime, isoToLocalInput, localInputToISO, nowISO, startOfTodayISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import { attachTag } from "../../api/tags";
import type { HealthEntry, HealthEntryType, HealthSeverity, HealthDuration, SoothingMethod } from "../../api/types";

interface HealthFormProps {
  entry?: HealthEntry;
  /** Pre-select a feeding (when opened from FeedingForm). */
  defaultFeedingId?: number;
  onDone?: () => void;
  onCancel?: () => void;
}

export function HealthForm({ entry, defaultFeedingId, onDone, onCancel }: HealthFormProps) {
  const { t } = useTranslation("health");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const createMut = useCreateHealth();
  const updateMut = useUpdateHealth();

  const ENTRY_TYPES: { value: HealthEntryType; label: string }[] = [
    { value: "spit_up", label: t("entry_type.spit_up") },
    { value: "tummy_ache", label: t("entry_type.tummy_ache") },
    { value: "crying", label: t("entry_type.crying") },
  ];

  const SOOTHING_METHODS: { value: SoothingMethod; label: string }[] = [
    { value: "nursing", label: t("soothing_method.nursing") },
    { value: "rocking", label: t("soothing_method.rocking") },
    { value: "carrying", label: t("soothing_method.carrying") },
    { value: "pacifier", label: t("soothing_method.pacifier") },
    { value: "singing", label: t("soothing_method.singing") },
    { value: "white_noise", label: t("soothing_method.white_noise") },
    { value: "swaddling", label: t("soothing_method.swaddling") },
    { value: "other", label: t("soothing_method.other") },
  ];

  const SEVERITIES: { value: HealthSeverity; label: string }[] = [
    { value: "mild", label: t("severity.mild") },
    { value: "moderate", label: t("severity.moderate") },
    { value: "severe", label: t("severity.severe") },
  ];

  const DURATIONS: { value: HealthDuration; label: string }[] = [
    { value: "short", label: t("duration.short") },
    { value: "medium", label: t("duration.medium") },
    { value: "long", label: t("duration.long") },
  ];

  const FEEDING_TYPE_LABELS: Record<string, string> = {
    breast_left: t("feeding_type.breast_left"),
    breast_right: t("feeding_type.breast_right"),
    bottle: t("feeding_type.bottle"),
    solid: t("feeding_type.solid"),
  };

  const [entryType, setEntryType] = useState<HealthEntryType>(entry?.entry_type ?? "spit_up");
  const [severity, setSeverity] = useState<HealthSeverity>(entry?.severity ?? "mild");
  const [duration, setDuration] = useState<HealthDuration | null>(entry?.duration ?? null);
  const [durationMinutes, setDurationMinutes] = useState(entry?.duration_minutes?.toString() ?? "");
  const [soothingMethod, setSoothingMethod] = useState<SoothingMethod | null>(entry?.soothing_method ?? null);
  const [time, setTime] = useState(
    entry?.time ? isoToLocalInput(entry.time) : isoToLocalInput(nowISO()),
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [feedingId, setFeedingId] = useState<number | null>(entry?.feeding_id ?? defaultFeedingId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

  // Fetch today's feedings for linking
  const { data: todayFeedings = [] } = useFeedingEntries({
    child_id: activeChild?.id,
    date_from: startOfTodayISO(),
  });
  const sortedTodayFeedings = [...todayFeedings]
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  function handleApiError(err: unknown) {
    if (err instanceof ApiError) {
      const msg = err.message.replace(/^API \d+: /, "");
      setError(msg);
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError(tc("errors.unknown"));
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
      duration: (entryType === "tummy_ache" || entryType === "crying") ? duration : null,
      duration_minutes: entryType === "crying" && durationMinutes ? parseInt(durationMinutes) : null,
      soothing_method: entryType === "crying" ? soothingMethod : null,
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
          {t("label_type")} *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setEntryType(t.value);
                if (t.value !== "tummy_ache" && t.value !== "crying") setDuration(null);
                if (t.value !== "crying") { setSoothingMethod(null); setDurationMinutes(""); }
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
          {t("label_intensity")} *
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

      {/* Duration selector — for tummy_ache and crying */}
      {(entryType === "tummy_ache" || entryType === "crying") && (
        <div>
          <label className="font-label text-sm font-medium text-text block mb-1">
            {t("label_duration")}
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

      {/* Crying-specific: duration in minutes */}
      {entryType === "crying" && (
        <Input
          label={t("label_duration_minutes")}
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          min="1"
          max="1440"
          placeholder="Min"
        />
      )}

      {/* Crying-specific: soothing method */}
      {entryType === "crying" && (
        <div>
          <label className="font-label text-sm font-medium text-text block mb-1">
            {t("soothing_method.label")}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {SOOTHING_METHODS.map((sm) => (
              <button
                key={sm.value}
                type="button"
                onClick={() => setSoothingMethod(soothingMethod === sm.value ? null : sm.value)}
                className={`min-h-[44px] rounded-[8px] font-label text-xs font-medium transition-colors px-1 ${
                  soothingMethod === sm.value
                    ? "bg-lavender text-ground"
                    : "bg-surface1 text-text hover:bg-surface2"
                }`}
              >
                {sm.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time input */}
      <Input
        label={`${t("label_time")} *`}
        type="datetime-local"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        required
      />

      {/* Feeding link — today's feedings as buttons */}
      {sortedTodayFeedings.length > 0 && (
        <div>
          <label className="font-label text-sm font-medium text-text block mb-1">
            {t("label_assign_feeding")}
          </label>
          <div className="flex flex-col gap-1.5">
            {sortedTodayFeedings.map((f) => (
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
                <span className="font-medium">
                  {FEEDING_TYPE_LABELS[f.feeding_type] ?? f.feeding_type}
                </span>
                {f.amount_ml ? ` ${f.amount_ml} ml` : ""}
                <span className="text-xs opacity-70 ml-2">{formatTime(f.start_time)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <Input
        label={tc("notes")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={tc("notes_placeholder")}
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
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{tc("cancel")}</Button>}
        <Button type="submit" disabled={isPending || !time}>
          {isPending ? tc("saving") : isEditing ? tc("update") : tc("add")}
        </Button>
      </div>
    </form>
  );
}
