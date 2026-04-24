/** Form to create or edit a Habit. */

import { useState } from "react";
import type { Habit, HabitCreate, HabitUpdate } from "../../api/types";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

interface HabitFormProps {
  childId: number;
  initial?: Habit;
  onSubmit: (data: HabitCreate | HabitUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function HabitForm({ childId, initial, onSubmit, onCancel, isLoading }: HabitFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [details, setDetails] = useState(initial?.details ?? "");
  const [recurrence, setRecurrence] = useState<"daily" | "weekly">(initial?.recurrence ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: HabitCreate | HabitUpdate = {
      child_id: childId,
      title: title.trim(),
      details: details.trim() || null,
      recurrence,
      weekdays: recurrence === "weekly" ? weekdays : null,
    };
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="font-label text-sm text-subtext0 block mb-1">
          Titel <span className="text-red">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg bg-surface1 px-3 py-2 text-base text-text focus:outline-none focus:ring-2 focus:ring-peach"
          placeholder="z.B. Spaziergang"
          required
          maxLength={200}
          style={{ fontSize: "16px" }}
        />
      </div>

      <div>
        <label className="font-label text-sm text-subtext0 block mb-1">Details</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="w-full rounded-lg bg-surface1 px-3 py-2 text-base text-text focus:outline-none focus:ring-2 focus:ring-peach resize-none"
          rows={2}
          maxLength={2000}
          style={{ fontSize: "16px" }}
        />
      </div>

      <div>
        <label className="font-label text-sm text-subtext0 block mb-1">Wiederholung</label>
        <div className="flex gap-2">
          {(["daily", "weekly"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecurrence(r)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                recurrence === r
                  ? "bg-peach text-ground"
                  : "bg-surface1 text-subtext0 hover:bg-surface2"
              }`}
            >
              {r === "daily" ? "Taeglich" : "Bestimmte Tage"}
            </button>
          ))}
        </div>
      </div>

      {recurrence === "weekly" && (
        <div>
          <label className="font-label text-sm text-subtext0 block mb-1">Wochentage</label>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleWeekday(i)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  weekdays.includes(i)
                    ? "bg-peach text-ground"
                    : "bg-surface1 text-subtext0 hover:bg-surface2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isLoading || !title.trim() || (recurrence === "weekly" && weekdays.length === 0)}
          className="flex-1 rounded-lg bg-peach py-2.5 text-sm font-semibold text-ground transition-opacity disabled:opacity-50"
        >
          {initial ? "Aktualisieren" : "Eintragen"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-surface1 py-2.5 text-sm font-medium text-text"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
