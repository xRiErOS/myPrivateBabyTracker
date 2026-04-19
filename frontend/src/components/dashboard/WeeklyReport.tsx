/** 7-day weekly report — expandable DayCards with aggregated metrics + MiniTimeline. */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FeedingEntry, DiaperEntry, SleepEntry } from "../../api/types";
import {
  groupByDay,
  splitSleepByDay,
  lastNDays,
  todayBerlin,
  isWet,
  isSolid,
  type SleepSegment,
} from "../../lib/timelineUtils";
import { MiniTimeline } from "./DayTimeline";

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

interface DayCardProps {
  date: string;
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleepSegments: SleepSegment[];
  prevTotal: number | null;
  isToday: boolean;
}

function DayCard({
  date,
  feedings,
  diapers,
  sleepSegments,
  prevTotal,
  isToday,
}: DayCardProps) {
  const [expanded, setExpanded] = useState(isToday);

  const d = new Date(date + "T12:00:00");
  const dayLabel = `${WEEKDAYS[d.getDay()]}, ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;

  const totalMl = feedings.reduce((s, f) => s + (f.amount_ml ?? 0), 0);
  const feedCount = feedings.length;
  const changeCount = diapers.length;
  const wet = diapers.filter(isWet).length;
  const solid = diapers.filter(isSolid).length;

  const sleepMinutes = sleepSegments.reduce((s, seg) => {
    const start = new Date(seg._splitStart).getTime();
    const end = new Date(seg._splitEnd).getTime();
    return s + (end - start) / 60000;
  }, 0);
  const sleepHours = (sleepMinutes / 60).toFixed(1);

  let trend: { arrow: string; color: string } | null = null;
  if (prevTotal !== null) {
    if (totalMl > prevTotal) trend = { arrow: "\u2191", color: "text-green" };
    else if (totalMl < prevTotal) trend = { arrow: "\u2193", color: "text-red" };
    else trend = { arrow: "\u2194", color: "text-subtext0" };
  }

  return (
    <div className="bg-surface0 rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 min-h-[44px]"
      >
        <span
          className={`font-label font-semibold text-sm ${isToday ? "text-peach" : "text-text"}`}
        >
          {isToday ? "Heute" : dayLabel}
        </span>
        <div className="flex items-center gap-3 text-xs text-subtext0 font-body">
          <span>
            {totalMl} ml
            {trend && (
              <span className={`ml-1 ${trend.color}`}>{trend.arrow}</span>
            )}
          </span>
          <span>{changeCount} W</span>
          <span>{sleepHours}h</span>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-ground rounded-lg p-2 text-center">
              <div className="text-[10px] text-subtext0 font-label uppercase">Flasche</div>
              <div className="font-semibold text-text">
                {totalMl} ml ({feedCount}x)
              </div>
            </div>
            <div className="bg-ground rounded-lg p-2 text-center">
              <div className="text-[10px] text-subtext0 font-label uppercase">Windeln</div>
              <div className="font-semibold text-text">
                {changeCount} ({wet}n, {solid}s)
              </div>
            </div>
            <div className="bg-ground rounded-lg p-2 text-center">
              <div className="text-[10px] text-subtext0 font-label uppercase">Schlaf</div>
              <div className="font-semibold text-text">{sleepHours}h</div>
            </div>
          </div>

          <MiniTimeline
            feedings={feedings}
            diapers={diapers}
            sleepSegments={sleepSegments}
            showAxis
            isToday={isToday}
          />
        </div>
      )}
    </div>
  );
}

interface WeeklyReportProps {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleeps: SleepEntry[];
}

export function WeeklyReport({ feedings, diapers, sleeps }: WeeklyReportProps) {
  const today = todayBerlin();
  const days = lastNDays(7);

  const feedByDay = groupByDay(feedings, "start_time");
  const diaperByDay = groupByDay(diapers, "time");
  const sleepMap = splitSleepByDay(sleeps);

  return (
    <div className="space-y-2">
      {days.map((date, i) => {
        const dayFeedings = feedByDay[date] ?? [];
        const dayDiapers = diaperByDay[date] ?? [];
        const daySegments = sleepMap[date] ?? [];

        const prevDate = i > 0 ? days[i - 1] : null;
        const prevTotal = prevDate
          ? (feedByDay[prevDate] ?? []).reduce((s, f) => s + (f.amount_ml ?? 0), 0)
          : null;

        return (
          <DayCard
            key={date}
            date={date}
            feedings={dayFeedings}
            diapers={dayDiapers}
            sleepSegments={daySegments}
            prevTotal={prevTotal}
            isToday={date === today}
          />
        );
      })}
    </div>
  );
}
