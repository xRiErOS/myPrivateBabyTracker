/** 14-day pattern chart — daily rows with mini timelines + shared axis + entity filter. */

import { useState } from "react";
import type { FeedingEntry, DiaperEntry, SleepEntry } from "../../api/types";
import {
  groupByDay,
  splitSleepByDay,
  lastNDays,
  todayBerlin,
  pct,
} from "../../lib/timelineUtils";
import { MiniTimeline } from "./DayTimeline";

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const AXIS_HOURS = [0, 6, 12, 18];

function SharedAxis() {
  return (
    <div className="flex items-center gap-2 mt-1 mb-2">
      <div className="w-16 shrink-0" />
      <div className="flex-1 relative h-4">
        {AXIS_HOURS.map((h) => (
          <div
            key={h}
            className="absolute text-[10px] text-subtext0 font-label -translate-x-1/2"
            style={{ left: `${pct(h * 60)}%` }}
          >
            {h}
          </div>
        ))}
        <div className="absolute right-0 text-[10px] text-subtext0 font-label">
          24
        </div>
      </div>
    </div>
  );
}

interface PatternChartProps {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleeps: SleepEntry[];
}

export function PatternChart({
  feedings,
  diapers,
  sleeps,
}: PatternChartProps) {
  const today = todayBerlin();
  const days = lastNDays(14).reverse();

  const feedByDay = groupByDay(feedings, "start_time");
  const diaperByDay = groupByDay(diapers, "time");
  const sleepMap = splitSleepByDay(sleeps);

  const [visible, setVisible] = useState({ sleep: true, feeding: true, diaper: true });

  function toggleEntity(key: "sleep" | "feeding" | "diaper") {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="bg-surface0 rounded-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-subtext0 font-label mb-3">
        14-Tage Muster
      </div>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => toggleEntity("sleep")}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-label transition-opacity ${visible.sleep ? "opacity-100" : "opacity-30"}`}
        >
          <span className="inline-block w-3 h-2 bg-lavender rounded-sm" /> Schlaf
        </button>
        <button
          type="button"
          onClick={() => toggleEntity("feeding")}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-label transition-opacity ${visible.feeding ? "opacity-100" : "opacity-30"}`}
        >
          <span className="inline-block w-2 h-2 bg-peach rounded-full" /> Flasche
        </button>
        <button
          type="button"
          onClick={() => toggleEntity("diaper")}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-label transition-opacity ${visible.diaper ? "opacity-100" : "opacity-30"}`}
        >
          <span className="inline-block w-2 h-2 bg-yellow rounded-full" /> Windel
        </button>
      </div>

      <SharedAxis />

      <div className="space-y-1">
        {days.map((date) => {
          const d = new Date(date + "T12:00:00");
          const dayLabel = WEEKDAYS[d.getDay()];
          const dateShort = d.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          });
          const isToday = date === today;

          const dayFeedings = feedByDay[date] ?? [];
          const dayDiapers = diaperByDay[date] ?? [];
          const daySegments = sleepMap[date] ?? [];

          return (
            <div key={date} className="flex items-center gap-2">
              <div
                className={`w-16 shrink-0 text-[11px] font-label ${isToday ? "text-peach font-semibold" : "text-subtext0"}`}
              >
                {isToday ? "Heute" : `${dayLabel} ${dateShort}`}
              </div>
              <div className="flex-1">
                {dayFeedings.length > 0 ||
                dayDiapers.length > 0 ||
                daySegments.length > 0 ? (
                  <MiniTimeline
                    feedings={visible.feeding ? dayFeedings : []}
                    diapers={visible.diaper ? dayDiapers : []}
                    sleepSegments={visible.sleep ? daySegments : []}
                    isToday
                  />
                ) : (
                  <div className="h-6 flex items-center">
                    <span className="text-[10px] text-subtext0 font-label italic">
                      keine Daten
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend replaced by interactive filter buttons above */}
    </div>
  );
}
