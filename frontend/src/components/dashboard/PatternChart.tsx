/** 14-day pattern chart — ultra-compact daily rows + entity filter toggles.
 *  Ported from home-dashboard PatternView.jsx — uses PatternBarRow/PatternDotRow
 *  (h-2.5, bg-surface1), sapphire for diapers, opacity-80 on past days. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FeedingEntry, DiaperEntry, SleepEntry } from "../../api/types";
import {
  groupByDay,
  splitSleepByDay,
  lastNDays,
  todayBerlin,
  pct,
  buildTimelineItems,
  type TimelineItem,
  type TimelinePoint,
} from "../../lib/timelineUtils";

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

function PatternBarRow({
  color,
  items,
}: {
  color: string;
  items: TimelineItem[];
}) {
  return (
    <div className="relative h-2.5 mb-px">
      <div className="absolute inset-0 bg-surface1 rounded-sm overflow-hidden">
        {items.map((it, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 rounded-sm ${color}`}
            style={{
              left: `${it.startPct}%`,
              width: `${Math.max(it.widthPct, 0.5)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PatternDotRow({
  color,
  items,
}: {
  color: string;
  items: TimelinePoint[];
}) {
  return (
    <div className="relative h-2.5 mb-px">
      <div className="absolute inset-0 bg-surface1 rounded-sm overflow-hidden">
        {items.map((it, i) => (
          <div
            key={i}
            className={`absolute top-0.5 w-1.5 h-1.5 rounded-full ${color} -translate-x-1/2`}
            style={{ left: `${it.posPct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface PatternChartProps {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleeps: SleepEntry[];
}

export function PatternChart({ feedings, diapers, sleeps }: PatternChartProps) {
  const { t } = useTranslation("dashboard");
  const today = todayBerlin();
  const days = lastNDays(14).reverse();

  const feedByDay = groupByDay(feedings, "start_time");
  const diaperByDay = groupByDay(diapers, "time");
  const sleepMap = splitSleepByDay(sleeps);

  const [visible, setVisible] = useState({
    sleep: true,
    feeding: true,
    diaper: true,
  });

  function toggleEntity(key: "sleep" | "feeding" | "diaper") {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="bg-surface0 rounded-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-subtext0 font-label mb-3">
        {t("14_day_pattern")}
      </div>

      <div className="flex gap-1 mb-2 ml-16">
        <button
          type="button"
          onClick={() => toggleEntity("sleep")}
          className={`flex items-center gap-1 text-[10px] text-subtext0 font-label transition-opacity ${visible.sleep ? "opacity-100" : "opacity-30"}`}
        >
          <span className="w-2 h-2 rounded-full bg-lavender inline-block" />{" "}
          {t("track_sleep")}
        </button>
        <button
          type="button"
          onClick={() => toggleEntity("feeding")}
          className={`flex items-center gap-1 text-[10px] text-subtext0 font-label ml-2 transition-opacity ${visible.feeding ? "opacity-100" : "opacity-30"}`}
        >
          <span className="w-2 h-2 rounded-full bg-peach inline-block" />{" "}
          {t("track_bottle")}
        </button>
        <button
          type="button"
          onClick={() => toggleEntity("diaper")}
          className={`flex items-center gap-1 text-[10px] text-subtext0 font-label ml-2 transition-opacity ${visible.diaper ? "opacity-100" : "opacity-30"}`}
        >
          <span className="w-2 h-2 rounded-full bg-sapphire inline-block" />{" "}
          {t("track_diaper")}
        </button>
      </div>

      <SharedAxis />

      {days.map((date) => {
        const dd = new Date(date + "T12:00:00");
        const dayLabel = WEEKDAYS[dd.getDay()];
        const dateShort = dd.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        });
        const isToday = date === today;

        const dayFeedings = feedByDay[date] ?? [];
        const dayDiapers = diaperByDay[date] ?? [];
        const daySegments = sleepMap[date] ?? [];

        const { sleepItems, feedItems, changeItems } = buildTimelineItems(
          dayFeedings,
          dayDiapers,
          daySegments,
        );

        const hasData =
          sleepItems.length > 0 ||
          feedItems.length > 0 ||
          changeItems.length > 0;

        return (
          <div
            key={date}
            className={`flex items-start gap-2 ${isToday ? "opacity-100" : "opacity-80"}`}
          >
            <div
              className={`text-[11px] font-label w-16 text-right shrink-0 pt-0.5 ${isToday ? "text-peach font-semibold" : "text-subtext0"}`}
            >
              {isToday ? t("today_label") : `${dayLabel} ${dateShort}`}
            </div>
            <div className="flex-1">
              {hasData ? (
                <div className="relative">
                  {visible.sleep && sleepItems.length > 0 && (
                    <PatternBarRow color="bg-lavender" items={sleepItems} />
                  )}
                  {visible.feeding && feedItems.length > 0 && (
                    <PatternDotRow color="bg-peach" items={feedItems} />
                  )}
                  {visible.diaper && changeItems.length > 0 && (
                    <PatternDotRow color="bg-sapphire" items={changeItems} />
                  )}
                </div>
              ) : (
                <div className="h-3 bg-surface1 rounded-sm opacity-30 my-0.5" />
              )}
            </div>
          </div>
        );
      })}

      <SharedAxis />
    </div>
  );
}
