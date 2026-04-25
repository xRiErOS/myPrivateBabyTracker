/** 24h day timeline — sleep blocks, feeding/diaper dots, now marker.
 *  Ported from home-dashboard Timeline.jsx — bg-surface1 track bands,
 *  labels on all modes, sapphire diaper dots, axis at bottom. */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import type { FeedingEntry, DiaperEntry } from "../../api/types";
import {
  buildTimelineItems,
  pct,
  toMinutes,
  type SleepSegment,
  type TimelineItem,
  type TimelinePoint,
} from "../../lib/timelineUtils";

interface TrackVisibility {
  sleep: boolean;
  feeding: boolean;
  diaper: boolean;
}

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

function TimeAxis() {
  return (
    <div className="relative h-4 mt-1">
      {HOURS.map((h) => (
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
  );
}

function NowMarker() {
  const now = new Date();
  const minutes = toMinutes(now.toISOString());
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red z-10"
      style={{ left: `${pct(minutes)}%` }}
    />
  );
}

function TrackRow({
  label,
  color,
  ongoingColor,
  items,
  compact = false,
}: {
  label: string;
  color: string;
  ongoingColor?: string;
  items: TimelineItem[];
  compact?: boolean;
}) {
  const h = compact ? "h-3" : "h-5";

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "mb-0.5" : "mb-1.5"}`}
    >
      <div
        className={`text-[11px] text-subtext0 font-label ${compact ? "w-10" : "w-14"} text-right shrink-0`}
      >
        {label}
      </div>
      <div
        className={`flex-1 relative ${h} bg-surface1 rounded-sm overflow-hidden`}
      >
        {items.map((it, i) => (
          <div
            key={i}
            className={`absolute top-0 bottom-0 rounded-sm ${it.ongoing && ongoingColor ? ongoingColor : color}`}
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

function DotRow({
  label,
  color,
  items,
  compact = false,
}: {
  label: string;
  color: string;
  items: TimelinePoint[];
  compact?: boolean;
}) {
  const h = compact ? "h-3" : "h-5";
  const dotSize = compact ? "w-2 h-2 top-0.5" : "w-3 h-3 top-1";

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "mb-0.5" : "mb-1.5"}`}
    >
      <div
        className={`text-[11px] text-subtext0 font-label ${compact ? "w-10" : "w-14"} text-right shrink-0`}
      >
        {label}
      </div>
      <div
        className={`flex-1 relative ${h} bg-surface1 rounded-sm overflow-hidden`}
      >
        {items.map((it, i) => (
          <div
            key={i}
            className={`absolute ${dotSize} rounded-full ${color} -translate-x-1/2`}
            style={{ left: `${it.posPct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface DayTimelineProps {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleepSegments: SleepSegment[];
  isToday?: boolean;
}

export function DayTimeline({
  feedings,
  diapers,
  sleepSegments,
  isToday = false,
}: DayTimelineProps) {
  const { t } = useTranslation("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [visibility, setVisibility] = useState<TrackVisibility>(() => {
    try {
      const saved = localStorage.getItem("mybaby-timeline-visibility");
      return saved
        ? JSON.parse(saved)
        : { sleep: true, feeding: true, diaper: true };
    } catch {
      return { sleep: true, feeding: true, diaper: true };
    }
  });

  function toggleTrack(key: keyof TrackVisibility) {
    const next = { ...visibility, [key]: !visibility[key] };
    setVisibility(next);
    localStorage.setItem("mybaby-timeline-visibility", JSON.stringify(next));
  }

  // Re-render every 10 minutes so the ongoing sleep bar grows visually
  const hasOngoing = sleepSegments.some((s) => s._ongoing);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!hasOngoing) return;
    const id = setInterval(() => setTick((t) => t + 1), 600_000);
    return () => clearInterval(id);
  }, [hasOngoing]);

  const { sleepItems, feedItems, changeItems } = buildTimelineItems(
    feedings,
    diapers,
    sleepSegments,
  );

  if (
    sleepItems.length === 0 &&
    feedItems.length === 0 &&
    changeItems.length === 0
  )
    return null;

  return (
    <div className="bg-surface0 rounded-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider text-subtext0 font-label">
          {t("day_timeline")}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 text-subtext0 hover:text-text transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
      {showSettings && (
        <div className="flex gap-3 mb-2">
          {([
            { key: "sleep", label: t("track_sleep"), color: "bg-lavender" },
            { key: "feeding", label: t("track_bottle"), color: "bg-peach" },
            { key: "diaper", label: t("track_diaper"), color: "bg-sapphire" },
          ] as const).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggleTrack(key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-label transition-all ${
                visibility[key]
                  ? `${color}/20 text-text`
                  : "bg-surface1/50 text-overlay0 line-through"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${visibility[key] ? color : "bg-overlay0"}`}
              />
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        {visibility.sleep && (
          <TrackRow label={t("track_sleep")} color="bg-lavender" ongoingColor="bg-green" items={sleepItems} />
        )}
        {visibility.feeding && (
          <DotRow label={t("track_bottle")} color="bg-peach" items={feedItems} />
        )}
        {visibility.diaper && (
          <DotRow label={t("track_diaper")} color="bg-sapphire" items={changeItems} />
        )}

        <div className="flex items-center gap-2">
          <div className="w-14 shrink-0" />
          <div className="flex-1 relative">
            {isToday && <NowMarker />}
            <TimeAxis />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact mini timeline for weekly report — with labels + optional axis. */
export function MiniTimeline({
  feedings,
  diapers,
  sleepSegments,
  showAxis = false,
  isToday = false,
}: {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleepSegments: SleepSegment[];
  showAxis?: boolean;
  isToday?: boolean;
}) {
  const { t: tDash } = useTranslation("dashboard");
  const { sleepItems, feedItems, changeItems } = buildTimelineItems(
    feedings,
    diapers,
    sleepSegments,
  );

  if (
    sleepItems.length === 0 &&
    feedItems.length === 0 &&
    changeItems.length === 0
  )
    return null;

  return (
    <div className="relative mt-2">
      <TrackRow label={tDash("track_sleep")} color="bg-lavender" ongoingColor="bg-green" items={sleepItems} compact />
      <DotRow label={tDash("track_bottle")} color="bg-peach" items={feedItems} compact />
      <DotRow
        label={tDash("track_diaper")}
        color="bg-sapphire"
        items={changeItems}
        compact
      />
      {(showAxis || isToday) && (
        <div className="flex items-center gap-2">
          <div className="w-10 shrink-0" />
          <div className="flex-1 relative">
            {isToday && <NowMarker />}
            {showAxis && <TimeAxis />}
          </div>
        </div>
      )}
    </div>
  );
}
