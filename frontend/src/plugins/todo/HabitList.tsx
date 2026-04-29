/** Habit list with daily check-off, streak display and CRUD. */

import { useState } from "react";
import { CheckCircle2, Circle, Flame, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../../components/Card";
import { MarkdownDisplay } from "../../components/MarkdownEditor";
import { useActiveChild } from "../../context/ChildContext";
import {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useCompleteHabit,
  useUncompleteHabit,
} from "../../hooks/useTodos";
import type { Habit, HabitCreate, HabitUpdate } from "../../api/types";
import { HabitForm } from "./HabitForm";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function weekdayLabel(days: number[] | null): string {
  if (!days || days.length === 0) return "";
  if (days.length === 7) return "Täglich";
  return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
}

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDetailsChange?: (id: number, details: string) => void;
}

function HabitCard({ habit, onEdit, onDetailsChange }: HabitCardProps) {
  const completeMut = useCompleteHabit();
  const uncompleteMut = useUncompleteHabit();
  const deleteMut = useDeleteHabit();

  function handleToggle() {
    if (habit.completed_today) {
      uncompleteMut.mutate(habit.id);
    } else {
      completeMut.mutate(habit.id);
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface1 last:border-0">
      <button
        onClick={handleToggle}
        className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors"
        aria-label={habit.completed_today ? "Als unerledigt markieren" : "Als erledigt markieren"}
      >
        {habit.completed_today ? (
          <CheckCircle2 className="h-7 w-7 text-green" />
        ) : (
          <Circle className="h-7 w-7 text-overlay0" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-body text-sm font-medium truncate ${habit.completed_today ? "line-through text-subtext0" : "text-text"}`}>
          {habit.title}
        </p>
        <p className="font-body text-xs text-subtext0 mt-0.5">
          {habit.recurrence === "weekly" ? weekdayLabel(habit.weekdays) : "Täglich"}
        </p>
        {habit.details && (
          <div className="mt-1 text-xs text-subtext0">
            <MarkdownDisplay
              content={habit.details}
              onContentChange={onDetailsChange ? (updated) => onDetailsChange(habit.id, updated) : undefined}
            />
          </div>
        )}
      </div>

      {habit.streak > 0 && (
        <div className="flex items-center gap-1 text-peach shrink-0">
          <Flame className="h-4 w-4" />
          <span className="font-label text-sm font-semibold">{habit.streak}</span>
        </div>
      )}

      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => onEdit(habit)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-surface1 transition-colors"
          aria-label="Habit bearbeiten"
        >
          <Pencil className="h-4 w-4 text-subtext0" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Habit "${habit.title}" löschen?`)) {
              deleteMut.mutate(habit.id);
            }
          }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red/10 transition-colors"
          aria-label="Habit löschen"
        >
          <Trash2 className="h-4 w-4 text-red" />
        </button>
      </div>
    </div>
  );
}

export function HabitList() {
  const { activeChild } = useActiveChild();
  const { data: habits = [], isLoading } = useHabits(activeChild?.id);
  const createMut = useCreateHabit();
  const updateMut = useUpdateHabit();

  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  function handleCreate(data: HabitCreate | HabitUpdate) {
    if (!activeChild) return;
    createMut.mutate({ ...(data as HabitCreate), child_id: activeChild.id }, {
      onSuccess: () => setShowForm(false),
    });
  }

  function handleUpdate(data: HabitCreate | HabitUpdate) {
    if (!editingHabit) return;
    updateMut.mutate({ id: editingHabit.id, data: data as HabitUpdate }, {
      onSuccess: () => setEditingHabit(null),
    });
  }

  // Filter: only show weekly habits if today matches their weekday
  // JS getDay(): 0=Sun..6=Sat → convert to Mon=0..Sun=6 to match our weekday model
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Tue=1, ..., Sun=6
  const todayHabits = habits.filter((h) => {
    if (h.recurrence === "weekly" && h.weekdays && h.weekdays.length > 0) {
      return h.weekdays.includes(todayIdx);
    }
    return true; // daily habits always shown
  });
  const todayDone = todayHabits.filter((h) => h.completed_today).length;
  const total = todayHabits.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-sm text-subtext0">
            {isLoading ? "..." : `${todayDone} / ${total} heute`}
          </p>
        </div>
        {!showForm && !editingHabit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-peach px-3 py-2 text-sm font-semibold text-ground"
          >
            <Plus className="h-4 w-4" />
            Neu
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && activeChild && (
        <Card className="p-4">
          <HabitForm
            childId={activeChild.id}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createMut.isPending}
          />
        </Card>
      )}

      {/* Habit cards */}
      {isLoading ? (
        <p className="font-body text-sm text-subtext0">Lade Habits...</p>
      ) : todayHabits.length === 0 ? (
        <p className="font-body text-sm text-overlay0">Heute keine Habits faellig.</p>
      ) : (
        <Card className="divide-y-0">
          {todayHabits.map((habit) =>
            editingHabit?.id === habit.id ? (
              <div key={habit.id} className="py-3 border-b border-surface1">
                <HabitForm
                  childId={habit.child_id}
                  initial={habit}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingHabit(null)}
                  isLoading={updateMut.isPending}
                />
              </div>
            ) : (
              <HabitCard
                key={habit.id}
                habit={habit}
                onEdit={setEditingHabit}
                onDetailsChange={(id, details) =>
                  updateMut.mutate({ id, data: { details } })
                }
              />
            )
          )}
        </Card>
      )}
    </div>
  );
}
