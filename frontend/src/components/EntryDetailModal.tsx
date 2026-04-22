/** Entry detail modal — read-only view with editable notes field. */

import { useEffect, useState } from "react";
import { X, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { TagBadges } from "./TagBadges";
import { getEntry, updateEntryNotes, type AnyEntry } from "../api/entries";
import { formatDateTime, formatDuration } from "../lib/dateUtils";
import type {
  SleepEntry,
  FeedingEntry,
  DiaperEntry,
  TemperatureEntry,
  WeightEntry,
  MedicationEntry,
  TodoEntry,
  VitaminD3Entry,
  MilestoneEntry,
} from "../api/types";

interface EntryDetailModalProps {
  entryType: string;
  entryId: number;
  onClose: () => void;
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  sleep: "entry_detail.type_sleep",
  feeding: "entry_detail.type_feeding",
  diaper: "entry_detail.type_diaper",
  temperature: "entry_detail.type_temperature",
  weight: "entry_detail.type_weight",
  medication: "entry_detail.type_medication",
  vitamind3: "entry_detail.type_vitamind3",
  todo: "entry_detail.type_todo",
  milestone: "entry_detail.type_milestone",
};

/** Check if notes field is supported for this entry type. */
function supportsNotes(entryType: string): boolean {
  return !["vitamind3"].includes(entryType);
}

/** Get the notes value from an entry (todo uses 'details' instead). */
function getNotesValue(entryType: string, entry: AnyEntry): string {
  if (entryType === "todo") return (entry as TodoEntry).details ?? "";
  if ("notes" in entry) return (entry as { notes: string | null }).notes ?? "";
  return "";
}

/** Render type-specific detail rows. */
function EntryFields({ entryType, entry }: { entryType: string; entry: AnyEntry }) {
  const { t: tc } = useTranslation("common");
  const { t: tSleep } = useTranslation("sleep");
  const { t: tFeeding } = useTranslation("feeding");
  const { t: tDiaper } = useTranslation("diaper");
  const rows: Array<{ label: string; value: string }> = [];

  switch (entryType) {
    case "sleep": {
      const e = entry as SleepEntry;
      rows.push({ label: tc("entry_detail.label_type"), value: tSleep(`type.${e.sleep_type}`, { defaultValue: e.sleep_type }) });
      rows.push({ label: tc("entry_detail.label_start"), value: formatDateTime(e.start_time) });
      if (e.end_time) rows.push({ label: tc("entry_detail.label_end"), value: formatDateTime(e.end_time) });
      if (e.duration_minutes != null) rows.push({ label: tc("entry_detail.label_duration"), value: formatDuration(e.duration_minutes) });
      break;
    }
    case "feeding": {
      const e = entry as FeedingEntry;
      rows.push({ label: tc("entry_detail.label_type"), value: tFeeding(`type.${e.feeding_type}`, { defaultValue: e.feeding_type }) });
      rows.push({ label: tc("entry_detail.label_time"), value: formatDateTime(e.start_time) });
      if (e.amount_ml != null) rows.push({ label: tc("entry_detail.label_amount"), value: `${e.amount_ml} ml` });
      if (e.food_type) rows.push({ label: tc("entry_detail.label_food"), value: e.food_type });
      if (e.duration_minutes != null) rows.push({ label: tc("entry_detail.label_duration"), value: formatDuration(e.duration_minutes) });
      break;
    }
    case "diaper": {
      const e = entry as DiaperEntry;
      rows.push({ label: tc("entry_detail.label_type"), value: tDiaper(`type_short.${e.diaper_type}`, { defaultValue: e.diaper_type }) });
      rows.push({ label: tc("entry_detail.label_time"), value: formatDateTime(e.time) });
      if (e.has_rash) rows.push({ label: tc("entry_detail.label_rash"), value: tc("entry_detail.label_rash_yes") });
      break;
    }
    case "temperature": {
      const e = entry as TemperatureEntry;
      rows.push({ label: tc("entry_detail.label_temperature"), value: `${e.temperature_celsius.toFixed(1)} °C` });
      rows.push({ label: tc("entry_detail.label_time"), value: formatDateTime(e.measured_at) });
      break;
    }
    case "weight": {
      const e = entry as WeightEntry;
      rows.push({ label: tc("entry_detail.label_weight"), value: `${(e.weight_grams / 1000).toFixed(2)} kg` });
      rows.push({ label: tc("entry_detail.label_time"), value: formatDateTime(e.measured_at) });
      break;
    }
    case "medication": {
      const e = entry as MedicationEntry;
      rows.push({ label: tc("entry_detail.label_medication"), value: e.medication_name });
      if (e.dose) rows.push({ label: tc("entry_detail.label_dose"), value: e.dose });
      rows.push({ label: tc("entry_detail.label_time"), value: formatDateTime(e.given_at) });
      break;
    }
    case "vitamind3": {
      const e = entry as VitaminD3Entry;
      rows.push({ label: tc("entry_detail.label_date"), value: e.date });
      rows.push({ label: tc("entry_detail.label_given_at"), value: formatDateTime(e.given_at) });
      break;
    }
    case "todo": {
      const e = entry as TodoEntry;
      rows.push({ label: tc("entry_detail.label_title"), value: e.title });
      rows.push({ label: tc("entry_detail.label_status"), value: e.is_done ? tc("entry_detail.status_done") : tc("entry_detail.status_open") });
      if (e.due_date) rows.push({ label: tc("entry_detail.label_due"), value: e.due_date });
      if (e.completed_at) rows.push({ label: tc("entry_detail.label_completed_at"), value: formatDateTime(e.completed_at) });
      break;
    }
    case "milestone": {
      const e = entry as MilestoneEntry;
      rows.push({ label: tc("entry_detail.label_title"), value: e.title });
      rows.push({ label: tc("entry_detail.label_status"), value: e.completed ? tc("entry_detail.status_completed") : tc("entry_detail.status_open") });
      if (e.completed_date) rows.push({ label: tc("entry_detail.label_completed_date"), value: e.completed_date });
      rows.push({ label: tc("entry_detail.label_confidence"), value: e.confidence === "exact" ? tc("entry_detail.confidence_exact") : e.confidence === "approximate" ? tc("entry_detail.confidence_approximate") : tc("entry_detail.confidence_uncertain") });
      if (e.photos?.length > 0) rows.push({ label: tc("entry_detail.label_photos"), value: tc("entry_detail.photos_count", { count: e.photos.length }) });
      break;
    }
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4">
          <span className="font-label text-sm text-subtext0 flex-shrink-0">{r.label}</span>
          <span className="font-body text-sm text-text text-right">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function EntryDetailModal({ entryType, entryId, onClose }: EntryDetailModalProps) {
  const { t: tc } = useTranslation("common");
  const [entry, setEntry] = useState<AnyEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEntry(entryType, entryId)
      .then((data) => {
        if (cancelled) return;
        setEntry(data);
        setNotes(getNotesValue(entryType, data));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? tc("error_loading"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entryType, entryId]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateEntryNotes(entryType, entryId, notes);
      setEntry(updated);
      setEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tc("error_saving");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (entry) setNotes(getNotesValue(entryType, entry));
    setEditing(false);
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const notesSupported = supportsNotes(entryType);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-ground rounded-[12px] shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface0">
          <h3 className="font-headline text-base font-semibold text-text">
            {tc(TYPE_LABEL_KEYS[entryType] ?? entryType)}
          </h3>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {loading && (
            <p className="font-body text-sm text-overlay0 text-center py-4">{tc("loading")}</p>
          )}

          {error && (
            <p className="font-body text-sm text-red text-center py-2">{error}</p>
          )}

          {entry && !loading && (
            <>
              <EntryFields entryType={entryType} entry={entry} />

              {/* Tags */}
              <TagBadges entryType={entryType} entryId={entryId} />

              {/* Notes section */}
              {notesSupported && (
                <div className="space-y-2 pt-2 border-t border-surface0">
                  <div className="flex items-center justify-between">
                    <span className="font-label text-sm text-subtext0">
                      {entryType === "todo" ? tc("details") : tc("notes")}
                    </span>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-peach transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <div className="space-y-3">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="w-full rounded-[8px] border border-surface1 bg-ground text-text font-body text-base p-3 focus:outline-none focus:ring-2 focus:ring-peach resize-y"
                        placeholder={tc("notes_add_placeholder")}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                          {tc("cancel")}
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                          {saving ? tc("saving") : tc("save")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-body text-sm text-text whitespace-pre-wrap">
                      {getNotesValue(entryType, entry) || (
                        <span className="text-overlay0">{tc("no_notes")}</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
