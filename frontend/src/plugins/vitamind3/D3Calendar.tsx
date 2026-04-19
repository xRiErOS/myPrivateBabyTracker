/** Vitamin D3 monthly calendar — grid with green dots for given days. */

import type { VitaminD3Entry } from "../../api/types";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

interface D3CalendarProps {
  entries: VitaminD3Entry[];
}

export function D3Calendar({ entries }: D3CalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);

  const monthStr = now.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  const d3Days = new Set<number>();
  entries.forEach((e) => {
    const [y, m, d] = e.date.split("-").map(Number);
    if (y === year && m === month + 1) {
      d3Days.add(d);
    }
  });

  const today = now.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-surface0 rounded-card p-4">
      <div className="font-label font-semibold text-text text-sm mb-3">
        Vitamin D3 — {monthStr}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[11px] text-subtext0 font-label py-1">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null)
            return <div key={`empty-${i}`} className="w-8 h-8" />;

          const isGiven = d3Days.has(day);
          const isToday = day === today;

          let classes =
            "w-8 h-8 rounded-full flex items-center justify-center text-[12px] mx-auto ";
          if (isGiven) {
            classes += "bg-green/20 text-green font-semibold";
          } else if (isToday) {
            classes += "ring-2 ring-peach text-text font-semibold";
          } else {
            classes += "text-subtext0";
          }

          return (
            <div key={day} className={classes}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
