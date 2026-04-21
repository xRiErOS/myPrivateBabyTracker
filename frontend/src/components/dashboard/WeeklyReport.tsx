/** 7-day weekly report — expandable DayCards.
 *  Collapsed: 3-column tiles (Flasche, Windeln, Schlaf).
 *  Expanded: MiniTimeline with axis + clickable category buttons.
 *  Ported from home-dashboard WeeklyReport.jsx. */

import { useState } from "react";
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
  onEntityClick?: (category: string, date?: string) => void;
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
  const [expanded, setExpanded] = useState(false);

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

  const dryCount = diapers.filter((dd) => dd.diaper_type === "dry").length;
  const wParts: string[] = [];
  if (wet) wParts.push(`${wet} nass`);
  if (solid) wParts.push(`${solid} dreckig`);
  if (dryCount) wParts.push(`${dryCount} trocken`);
  const windelDetail = `${changeCount}${wParts.length > 0 ? ` (${wParts.join(", ")})` : ""}`;

  let trend: { arrow: string; color: string } | null = null;
  if (prevTotal !== null) {
    if (totalMl > prevTotal) trend = { arrow: "\u2191", color: "text-green" };
    else if (totalMl < prevTotal)
      trend = { arrow: "\u2193", color: "text-red" };
    else trend = { arrow: "\u2194", color: "text-subtext0" };
  }

  return (
    <div className="bg-surface0 rounded-card p-4">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between mb-2">
          <div
            className={`font-label font-semibold text-sm ${isToday ? "text-peach" : "text-text"}`}
          >
            {isToday ? "Heute" : dayLabel}
          </div>
          <div className="text-subtext0 text-[12px]">
            {expanded ? "\u25B2" : "\u25BC"}
          </div>
        </div>
        {!expanded && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface1 rounded-lg px-2 py-1.5 text-center">
              <div className="text-[11px] text-subtext0 font-label">
                Flasche
              </div>
              <div className="text-sm font-medium text-text">
                {totalMl} ml{" "}
                {trend && (
                  <span className={`text-[11px] ${trend.color}`}>
                    {trend.arrow}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-surface1 rounded-lg px-2 py-1.5 text-center">
              <div className="text-[11px] text-subtext0 font-label">
                Windeln
              </div>
              <div className="text-sm font-medium text-text">{changeCount}</div>
            </div>
            <div className="bg-surface1 rounded-lg px-2 py-1.5 text-center">
              <div className="text-[11px] text-subtext0 font-label">Schlaf</div>
              <div className="text-sm font-medium text-text">
                {sleepDisplay}
              </div>
            </div>
          </div>
        )}
      </button>

      {expanded && (
        <div>
          <MiniTimeline
            feedings={feedings}
            diapers={diapers}
            sleepSegments={sleepSegments}
            showAxis
            isToday={isToday}
          />
          <div className="flex flex-col gap-2 mt-3">
            <button
              type="button"
              onClick={() => onEntityClick?.("feeding", date)}
              className="flex items-center justify-between px-4 py-3 rounded-card text-sm transition-all bg-surface1 text-text active:bg-peach active:text-ground min-h-[44px]"
            >
              <span className="font-label font-medium">Flasche</span>
              <span className="text-[13px]">
                {totalMl} ml ({feedCount}x)
                {trend && (
                  <span className={`ml-1 ${trend.color}`}>{trend.arrow}</span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onEntityClick?.("diaper", date)}
              className="flex items-center justify-between px-4 py-3 rounded-card text-sm transition-all bg-surface1 text-text active:bg-peach active:text-ground min-h-[44px]"
            >
              <span className="font-label font-medium">Windeln</span>
              <span className="text-[13px]">{windelDetail}</span>
            </button>
            <button
              type="button"
              onClick={() => onEntityClick?.("sleep", date)}
              className="flex items-center justify-between px-4 py-3 rounded-card text-sm transition-all bg-surface1 text-text active:bg-peach active:text-ground min-h-[44px]"
            >
              <span className="font-label font-medium">Schlaf</span>
              <span className="text-[13px]">{sleepDisplay}</span>
            </button>
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
  onEntityClick?: (category: string, date?: string) => void;
}

export function WeeklyReport({
  feedings,
  diapers,
  sleeps,
  onEntityClick,
}: WeeklyReportProps) {
  const today = todayBerlin();
  const days = lastNDays(7).reverse();

  const feedByDay = groupByDay(feedings, "start_time");
  const diaperByDay = groupByDay(diapers, "time");
  const sleepMap = splitSleepByDay(sleeps);

  return (
    <div className="flex flex-col gap-3">
      {days.map((date, i) => {
        const dayFeedings = feedByDay[date] ?? [];
        const dayDiapers = diaperByDay[date] ?? [];
        const daySegments = sleepMap[date] ?? [];

        const prevDate = i < days.length - 1 ? days[i + 1] : null;
        const prevTotal = prevDate
          ? (feedByDay[prevDate] ?? []).reduce(
              (s, f) => s + (f.amount_ml ?? 0),
              0,
            )
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
