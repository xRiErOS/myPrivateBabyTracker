/** Habit dashboard widget — today's completion progress bar. */

import { Repeat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useHabits } from "../../hooks/useTodos";
import { useActiveChild } from "../../context/ChildContext";

export function HabitWidget() {
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: habits = [], isLoading } = useHabits(activeChild?.id);

  // JS getDay(): 0=Sun..6=Sat → Mon=0..Sun=6 to match weekday model
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const todayHabits = habits.filter((h) => {
    if (h.recurrence === "weekly" && h.weekdays && h.weekdays.length > 0) {
      return h.weekdays.includes(todayIdx);
    }
    return true;
  });

  const total = todayHabits.length;
  const done = todayHabits.filter((h) => h.completed_today).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card
      className="h-full cursor-pointer hover:bg-surface1/50 transition-colors"
      onClick={() => navigate("/todo?tab=habits")}
    >
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-5 w-5 text-sapphire" />
        <p className="font-label text-sm font-medium text-subtext0">Habits</p>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-subtext0">Lade…</p>
      ) : total === 0 ? (
        <p className="font-body text-sm text-overlay0">Noch keine Habits</p>
      ) : done === total ? (
        <p className="font-body text-sm text-green">Alles erledigt!</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm">
            <span className="font-semibold text-sapphire">{done}/{total}</span>
            <span className="text-subtext0"> heute</span>
          </p>
          {/* Progress bar */}
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-green rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
