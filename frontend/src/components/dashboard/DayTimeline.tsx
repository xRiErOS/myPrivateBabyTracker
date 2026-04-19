/** 24h day timeline — sleep blocks, feeding/diaper dots, now marker.
 *  Ported from home-dashboard Timeline.jsx — bg-surface1 track bands,
 *  labels on all modes, sapphire diaper dots, axis at bottom. */

import type { FeedingEntry, DiaperEntry } from "../../api/types";
import {
  buildTimelineItems,
  pct,
  toMinutes,
  type SleepSegment,
  type TimelineItem,
  type TimelinePoint,
} from "../../lib/timelineUtils";

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
  items,
  compact = false,
}: {
  label: string;
  color: string;
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
      <div className="text-[11px] uppercase tracking-wider text-subtext0 font-label mb-2">
        Tagesverlauf
      </div>
      <div className="relative">
        <TrackRow label="Schlaf" color="bg-lavender" items={sleepItems} />
        <DotRow label="Flasche" color="bg-peach" items={feedItems} />
        <DotRow label="Windeln" color="bg-sapphire" items={changeItems} />

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
      <TrackRow label="Schlaf" color="bg-lavender" items={sleepItems} compact />
      <DotRow label="Flasche" color="bg-peach" items={feedItems} compact />
      <DotRow
        label="Windeln"
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
