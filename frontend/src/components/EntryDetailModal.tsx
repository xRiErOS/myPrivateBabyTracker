/** Entry detail modal — read-only view with editable notes field. */

import { useEffect, useState } from "react";
import { X, Pencil } from "lucide-react";
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
} from "../api/types";

interface EntryDetailModalProps {
  entryType: string;
  entryId: number;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  sleep: "Schlaf",
  feeding: "Mahlzeit",
  diaper: "Windel",
  temperature: "Temperatur",
  weight: "Gewicht",
  medication: "Medikament",
  vitamind3: "Vitamin D3",
  todo: "ToDo",
};

const SLEEP_TYPE_LABELS: Record<string, string> = {
  nap: "Nickerchen",
  night: "Nachtschlaf",
};

const FEEDING_TYPE_LABELS: Record<string, string> = {
  breast_left: "Brust links",
  breast_right: "Brust rechts",
  bottle: "Flasche",
  solid: "Beikost",
};

const DIAPER_TYPE_LABELS: Record<string, string> = {
  wet: "Nass",
  dirty: "Dreckig",
  mixed: "Beides",
  dry: "Trocken",
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
  const rows: Array<{ label: string; value: string }> = [];

  switch (entryType) {
    case "sleep": {
      const e = entry as SleepEntry;
      rows.push({ label: "Typ", value: SLEEP_TYPE_LABELS[e.sleep_type] ?? e.sleep_type });
      rows.push({ label: "Start", value: formatDateTime(e.start_time) });
      if (e.end_time) rows.push({ label: "Ende", value: formatDateTime(e.end_time) });
      if (e.duration_minutes != null) rows.push({ label: "Dauer", value: formatDuration(e.duration_minutes) });
      break;
    }
    case "feeding": {
      const e = entry as FeedingEntry;
      rows.push({ label: "Typ", value: FEEDING_TYPE_LABELS[e.feeding_type] ?? e.feeding_type });
      rows.push({ label: "Zeitpunkt", value: formatDateTime(e.start_time) });
      if (e.amount_ml != null) rows.push({ label: "Menge", value: `${e.amount_ml} ml` });
      if (e.food_type) rows.push({ label: "Nahrung", value: e.food_type });
      if (e.duration_minutes != null) rows.push({ label: "Dauer", value: formatDuration(e.duration_minutes) });
      break;
    }
    case "diaper": {
      const e = entry as DiaperEntry;
      rows.push({ label: "Typ", value: DIAPER_TYPE_LABELS[e.diaper_type] ?? e.diaper_type });
      rows.push({ label: "Zeitpunkt", value: formatDateTime(e.time) });
      if (e.has_rash) rows.push({ label: "Ausschlag", value: "Ja" });
      break;
    }
    case "temperature": {
      const e = entry as TemperatureEntry;
      rows.push({ label: "Temperatur", value: `${e.temperature_celsius.toFixed(1)} °C` });
      rows.push({ label: "Zeitpunkt", value: formatDateTime(e.measured_at) });
      break;
    }
    case "weight": {
      const e = entry as WeightEntry;
      rows.push({ label: "Gewicht", value: `${(e.weight_grams / 1000).toFixed(2)} kg` });
      rows.push({ label: "Zeitpunkt", value: formatDateTime(e.measured_at) });
      break;
    }
    case "medication": {
      const e = entry as MedicationEntry;
      rows.push({ label: "Medikament", value: e.medication_name });
      if (e.dose) rows.push({ label: "Dosis", value: e.dose });
      rows.push({ label: "Zeitpunkt", value: formatDateTime(e.given_at) });
      break;
    }
    case "vitamind3": {
      const e = entry as VitaminD3Entry;
      rows.push({ label: "Datum", value: e.date });
      rows.push({ label: "Gegeben um", value: formatDateTime(e.given_at) });
      break;
    }
    case "todo": {
      const e = entry as TodoEntry;
      rows.push({ label: "Titel", value: e.title });
      rows.push({ label: "Status", value: e.is_done ? "Erledigt" : "Offen" });
      if (e.due_date) rows.push({ label: "Faellig", value: e.due_date });
      if (e.completed_at) rows.push({ label: "Erledigt am", value: formatDateTime(e.completed_at) });
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
        setError(err.message ?? "Fehler beim Laden");
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
      const msg = err instanceof Error ? err.message : "Fehler beim Speichern";
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
            {TYPE_LABELS[entryType] ?? entryType}
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
            <p className="font-body text-sm text-overlay0 text-center py-4">Laden...</p>
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
                      {entryType === "todo" ? "Details" : "Notizen"}
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
                        placeholder="Notizen hinzufuegen..."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                          Abbrechen
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                          {saving ? "Speichern..." : "Speichern"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-body text-sm text-text whitespace-pre-wrap">
                      {getNotesValue(entryType, entry) || (
                        <span className="text-overlay0">Keine Notizen</span>
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
