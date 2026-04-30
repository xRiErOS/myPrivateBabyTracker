/** MotherHealthForm — strukturierte Erfassung im /health-Layout.
 *
 * Pill-Button-Group für "Art" (Wochenfluss / Schmerzen / Stimmung / Notiz).
 * Pro Typ eigene Sub-Form. Notes-Feld optional auf allen Typen. TagSelector
 * polymorph für entry_type="motherhealth".
 */

import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { Slider } from "../../components/Slider";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import {
  useCreateMotherHealthEntry,
  useUpdateMotherHealthEntry,
} from "../../hooks/useMotherHealth";
import { useEntryToast } from "../../hooks/useEntryToast";
import { formatApiError } from "../../lib/errorMessages";
import { attachTag } from "../../api/tags";
import type {
  ActivityLevel,
  EntryType,
  LochiaAmount,
  LochiaColor,
  LochiaSmell,
  MotherHealthCreate,
  MotherHealthEntry,
} from "../../api/motherhealth";

interface MotherHealthFormProps {
  entry?: MotherHealthEntry;
  onDone?: () => void;
  onCancel?: () => void;
  /** Vorausgewählter Typ beim Öffnen ohne `entry`. */
  defaultType?: EntryType;
}

const MAX_NOTES = 4000;

export function MotherHealthForm({
  entry,
  onDone,
  onCancel,
  defaultType = "note",
}: MotherHealthFormProps) {
  const { t } = useTranslation("motherhealth");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const createMut = useCreateMotherHealthEntry();
  const updateMut = useUpdateMotherHealthEntry();
  const toast = useEntryToast();
  const isEditing = entry != null;

  const [type, setType] = useState<EntryType>(entry?.entry_type ?? defaultType);

  // Gemeinsam: Notes (alle Typen)
  const [notes, setNotes] = useState<string>(entry?.notes ?? "");

  // Lochia
  const [lochiaAmount, setLochiaAmount] = useState<LochiaAmount>(
    entry?.lochia_amount ?? "light",
  );
  const [lochiaColor, setLochiaColor] = useState<LochiaColor>(
    entry?.lochia_color ?? "red",
  );
  const [lochiaSmell, setLochiaSmell] = useState<LochiaSmell>(
    entry?.lochia_smell ?? "normal",
  );
  const [lochiaClots, setLochiaClots] = useState<boolean>(
    entry?.lochia_clots ?? false,
  );

  // Pain (VAS) — null = untouched, kein Default-Wert
  const [painPerineum, setPainPerineum] = useState<number | null>(
    entry?.pain_perineum ?? null,
  );
  const [painAbdominal, setPainAbdominal] = useState<number | null>(
    entry?.pain_abdominal ?? null,
  );
  const [painBreast, setPainBreast] = useState<number | null>(
    entry?.pain_breast ?? null,
  );
  const [painUrination, setPainUrination] = useState<number | null>(
    entry?.pain_urination ?? null,
  );

  // Mood — null = untouched
  const [moodLevel, setMoodLevel] = useState<number | null>(
    entry?.mood_level ?? null,
  );
  const [wellbeing, setWellbeing] = useState<number | null>(
    entry?.wellbeing ?? null,
  );
  const [exhaustion, setExhaustion] = useState<number | null>(
    entry?.exhaustion ?? null,
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">(
    entry?.activity_level ?? "",
  );

  const [error, setError] = useState<string | null>(null);
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);
  const isPending = createMut.isPending || updateMut.isPending;
  const notesTooLong = notes.length > MAX_NOTES;
  const noteRequired = type === "note" && notes.trim().length === 0;
  // Untouched-Validation: bei Pain/Mood mind. ein Wert gesetzt sein.
  const painEmpty =
    type === "pain" &&
    painPerineum === null &&
    painAbdominal === null &&
    painBreast === null &&
    painUrination === null;
  const moodEmpty =
    type === "mood" &&
    moodLevel === null &&
    wellbeing === null &&
    exhaustion === null &&
    activityLevel === "";

  const ENTRY_TYPES: { value: EntryType; label: string }[] = [
    { value: "lochia", label: t("type_lochia") },
    { value: "pain", label: t("type_pain") },
    { value: "mood", label: t("type_mood") },
    { value: "note", label: t("type_note") },
  ];

  function buildCreatePayload(): MotherHealthCreate {
    const trimmedNotes = notes.trim() ? notes : undefined;
    if (type === "lochia") {
      return {
        entry_type: "lochia",
        child_id: activeChild!.id,
        lochia_amount: lochiaAmount,
        lochia_color: lochiaColor,
        lochia_smell: lochiaSmell,
        lochia_clots: lochiaClots,
        notes: trimmedNotes,
      };
    }
    if (type === "pain") {
      return {
        entry_type: "pain",
        child_id: activeChild!.id,
        pain_perineum: painPerineum ?? undefined,
        pain_abdominal: painAbdominal ?? undefined,
        pain_breast: painBreast ?? undefined,
        pain_urination: painUrination ?? undefined,
        notes: trimmedNotes,
      };
    }
    if (type === "mood") {
      return {
        entry_type: "mood",
        child_id: activeChild!.id,
        mood_level: moodLevel ?? undefined,
        wellbeing: wellbeing ?? undefined,
        exhaustion: exhaustion ?? undefined,
        activity_level: activityLevel === "" ? undefined : activityLevel,
        notes: trimmedNotes,
      };
    }
    return {
      entry_type: "note",
      child_id: activeChild!.id,
      notes: notes,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (notesTooLong || noteRequired || painEmpty || moodEmpty) return;

    try {
      if (isEditing) {
        // Im Edit-Modus aktualisieren wir nur Felder des bestehenden Typs.
        const updateData: Record<string, unknown> = {
          notes: notes.trim() ? notes : null,
        };
        if (type === "lochia") {
          updateData.lochia_amount = lochiaAmount;
          updateData.lochia_color = lochiaColor;
          updateData.lochia_smell = lochiaSmell;
          updateData.lochia_clots = lochiaClots;
        } else if (type === "pain") {
          updateData.pain_perineum = painPerineum;
          updateData.pain_abdominal = painAbdominal;
          updateData.pain_breast = painBreast;
          updateData.pain_urination = painUrination;
        } else if (type === "mood") {
          updateData.mood_level = moodLevel;
          updateData.wellbeing = wellbeing;
          updateData.exhaustion = exhaustion;
          updateData.activity_level = activityLevel === "" ? null : activityLevel;
        }
        await updateMut.mutateAsync({ id: entry.id, data: updateData });
        toast.saved();
        onDone?.();
      } else {
        const result = await createMut.mutateAsync(buildCreatePayload());
        if (pendingTagIds.length > 0) {
          await Promise.all(
            pendingTagIds.map((tagId) =>
              attachTag({
                tag_id: tagId,
                entry_type: "motherhealth",
                entry_id: result.id,
              }),
            ),
          );
        }
        toast.saved();
        onDone?.();
      }
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <div className="rounded-[8px] border border-red bg-red/10 p-3 text-sm text-red">
          {error}
        </div>
      )}

      {/* Art-Selector (Pill-Buttons im /health-Stil) */}
      <div>
        <label className="font-label text-sm font-medium text-text block mb-1">
          {t("label_type")} *
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ENTRY_TYPES.map((et) => {
            const active = type === et.value;
            const disabled = isEditing && !active;
            return (
              <button
                key={et.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => !disabled && setType(et.value)}
                className={`min-h-[44px] rounded-[8px] font-label text-sm font-medium transition-colors ${
                  active
                    ? "bg-mauve text-ground"
                    : disabled
                      ? "bg-surface0 text-overlay0 cursor-not-allowed"
                      : "bg-surface1 text-text hover:bg-surface2"
                }`}
              >
                {et.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Form je nach Typ */}
      <div className="flex flex-col gap-4">
        {type === "lochia" && (
          <LochiaFields
            amount={lochiaAmount}
            color={lochiaColor}
            smell={lochiaSmell}
            clots={lochiaClots}
            onAmount={setLochiaAmount}
            onColor={setLochiaColor}
            onSmell={setLochiaSmell}
            onClots={setLochiaClots}
          />
        )}

        {type === "pain" && (
          <div className="flex flex-col gap-3">
            <Slider
              label={t("pain_perineum")}
              value={painPerineum}
              onChange={setPainPerineum}
            />
            <Slider
              label={t("pain_abdominal")}
              value={painAbdominal}
              onChange={setPainAbdominal}
            />
            <Slider
              label={t("pain_breast")}
              value={painBreast}
              onChange={setPainBreast}
            />
            <Slider
              label={t("pain_urination")}
              value={painUrination}
              onChange={setPainUrination}
            />
            <p className="font-body text-xs text-overlay0">
              {t("pain_scale_hint")}
            </p>
          </div>
        )}

        {type === "mood" && (
          <MoodFields
            mood={moodLevel}
            wellbeing={wellbeing}
            exhaustion={exhaustion}
            activity={activityLevel}
            onMood={setMoodLevel}
            onWellbeing={setWellbeing}
            onExhaustion={setExhaustion}
            onActivity={setActivityLevel}
          />
        )}
      </div>

      {/* Notizen — alle Typen */}
      <div>
        <label
          htmlFor="mh-notes"
          className="font-label text-sm font-medium text-text block mb-1"
        >
          {type === "note" ? t("label_content") : tc("notes")}
          {type === "note" && <span className="text-red ml-0.5">*</span>}
        </label>
        <textarea
          id="mh-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={type === "note" ? 6 : 3}
          placeholder={
            type === "note" ? t("content_placeholder") : tc("notes_placeholder")
          }
          className="w-full min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve resize-y"
        />
        {(notesTooLong || notes.length > MAX_NOTES * 0.75) && (
          <div className="flex justify-end mt-1">
            <span
              className={`font-body text-xs ${
                notesTooLong ? "text-red" : "text-subtext0"
              }`}
            >
              {notes.length} / {MAX_NOTES}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="pt-3 border-t border-surface1">
        {isEditing ? (
          <TagSelector entryType="motherhealth" entryId={entry!.id} />
        ) : (
          <TagSelector
            entryType="motherhealth"
            pendingTagIds={pendingTagIds}
            onPendingChange={setPendingTagIds}
          />
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {tc("cancel")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            isPending || notesTooLong || noteRequired || painEmpty || moodEmpty
          }
        >
          {isPending ? tc("saving") : isEditing ? tc("update") : tc("add")}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Sub-Forms
// ---------------------------------------------------------------------------

interface LochiaFieldsProps {
  amount: LochiaAmount;
  color: LochiaColor;
  smell: LochiaSmell;
  clots: boolean;
  onAmount: (v: LochiaAmount) => void;
  onColor: (v: LochiaColor) => void;
  onSmell: (v: LochiaSmell) => void;
  onClots: (v: boolean) => void;
}

function LochiaFields({
  amount,
  color,
  smell,
  clots,
  onAmount,
  onColor,
  onSmell,
  onClots,
}: LochiaFieldsProps) {
  const { t } = useTranslation("motherhealth");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select
        label={t("lochia_amount")}
        value={amount}
        onChange={(e) => onAmount(e.target.value as LochiaAmount)}
        options={[
          { value: "none", label: t("amount_none") },
          { value: "traces", label: t("amount_traces") },
          { value: "light", label: t("amount_light") },
          { value: "moderate", label: t("amount_moderate") },
          { value: "heavy", label: t("amount_heavy") },
        ]}
      />
      <Select
        label={t("lochia_color")}
        value={color}
        onChange={(e) => onColor(e.target.value as LochiaColor)}
        options={[
          { value: "red", label: t("color_red") },
          { value: "brown", label: t("color_brown") },
          { value: "pink", label: t("color_pink") },
          { value: "yellow", label: t("color_yellow") },
          { value: "white", label: t("color_white") },
        ]}
      />
      <Select
        label={t("lochia_smell")}
        value={smell}
        onChange={(e) => onSmell(e.target.value as LochiaSmell)}
        options={[
          { value: "normal", label: t("smell_normal") },
          { value: "abnormal", label: t("smell_abnormal") },
        ]}
      />
      <label className="flex items-center gap-3 rounded-[8px] bg-surface0 px-3 py-2 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={clots}
          onChange={(e) => onClots(e.target.checked)}
          className="h-5 w-5 accent-peach"
        />
        <span className="font-label text-sm text-text">
          {t("lochia_clots")}
        </span>
      </label>
    </div>
  );
}

interface MoodFieldsProps {
  mood: number | null;
  wellbeing: number | null;
  exhaustion: number | null;
  activity: ActivityLevel | "";
  onMood: (v: number) => void;
  onWellbeing: (v: number) => void;
  onExhaustion: (v: number) => void;
  onActivity: (v: ActivityLevel | "") => void;
}

function MoodFields({
  mood,
  wellbeing,
  exhaustion,
  activity,
  onMood,
  onWellbeing,
  onExhaustion,
  onActivity,
}: MoodFieldsProps) {
  const { t } = useTranslation("motherhealth");
  return (
    <div className="flex flex-col gap-3">
      <Slider
        label={t("mood_level")}
        value={mood}
        onChange={onMood}
        min={1}
        max={5}
        step={1}
        endpoints={{ min: t("mood_min"), max: t("mood_max") }}
      />
      <Slider
        label={t("wellbeing")}
        value={wellbeing}
        onChange={onWellbeing}
        min={1}
        max={5}
        step={1}
        endpoints={{ min: t("wellbeing_min"), max: t("wellbeing_max") }}
      />
      <Slider
        label={t("exhaustion")}
        value={exhaustion}
        onChange={onExhaustion}
        min={1}
        max={5}
        step={1}
        endpoints={{ min: t("exhaustion_min"), max: t("exhaustion_max") }}
      />
      <Select
        label={t("activity_level")}
        value={activity}
        onChange={(e) =>
          onActivity(e.target.value as ActivityLevel | "")
        }
        options={[
          { value: "", label: t("activity_unset") },
          { value: "bedrest", label: t("activity_bedrest") },
          { value: "light", label: t("activity_light") },
          { value: "normal", label: t("activity_normal") },
        ]}
      />
    </div>
  );
}
