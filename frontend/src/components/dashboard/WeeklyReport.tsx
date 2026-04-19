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
  formatDuration,
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
  onEntityClick?: (category: string) => void;
}

function DayCard({
  date,
  feedings,
  diapers,
  sleepSegments,
  prevTotal,
  isToday,
  onEntityClick,
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
  const sleepDisplay = formatDuration(sleepMinutes);
  const dryCount = diapers.filter((d) => d.diaper_type === "dry").length;
  const wParts: string[] = [];
  if (wet) wParts.push(`${wet} nass`);
  if (solid) wParts.push(`${solid} dreckig`);
  if (dryCount) wParts.push(`${dryCount} trocken`);
  const windelBreakdown = wParts.length > 0 ? ` (${wParts.join(", ")})` : "";

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
          <span>{sleepDisplay}</span>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <MiniTimeline
            feedings={feedings}
            diapers={diapers}
            sleepSegments={sleepSegments}
            showAxis
            isToday={isToday}
          />

          <div className="space-y-1">
            <div
              className="flex items-center justify-between bg-ground rounded-lg px-3 py-2 min-h-[44px] cursor-pointer active:bg-surface1 transition-colors"
              onClick={() => onEntityClick?.("feeding")}
            >
              <span className="text-xs font-label text-text">Flasche</span>
              <span className="text-xs font-semibold text-text">
                {totalMl} ml ({feedCount}x)
                {trend && <span className={`ml-1 ${trend.color}`}>{trend.arrow}</span>}
              </span>
            </div>
            <div
              className="flex items-center justify-between bg-ground rounded-lg px-3 py-2 min-h-[44px] cursor-pointer active:bg-surface1 transition-colors"
              onClick={() => onEntityClick?.("diaper")}
            >
              <span className="text-xs font-label text-text">Windeln</span>
              <span className="text-xs font-semibold text-text">
                {changeCount}{windelBreakdown}
              </span>
            </div>
            <div
              className="flex items-center justify-between bg-ground rounded-lg px-3 py-2 min-h-[44px] cursor-pointer active:bg-surface1 transition-colors"
              onClick={() => onEntityClick?.("sleep")}
            >
              <span className="text-xs font-label text-text">Schlaf</span>
              <span className="text-xs font-semibold text-text">{sleepDisplay}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WeeklyReportProps {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleeps: SleepEntry[];
  onEntityClick?: (category: string) => void;
}

export function WeeklyReport({ feedings, diapers, sleeps, onEntityClick }: WeeklyReportProps) {
  const today = todayBerlin();
  const days = lastNDays(7).reverse();

  const feedByDay = groupByDay(feedings, "start_time");
  const diaperByDay = groupByDay(diapers, "time");
  const sleepMap = splitSleepByDay(sleeps);

  return (
    <div className="space-y-2">
      {days.map((date, i) => {
        const dayFeedings = feedByDay[date] ?? [];
        const dayDiapers = diaperByDay[date] ?? [];
        const daySegments = sleepMap[date] ?? [];

        const prevDate = i < days.length - 1 ? days[i + 1] : null;
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
            onEntityClick={onEntityClick}
          />
        );
      })}
    </div>
  );
}
