/** 24h day timeline — sleep blocks, feeding/diaper dots, now marker. */

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
    <div className="absolute inset-0">
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 border-l border-surface1"
          style={{ left: `${pct(h * 60)}%` }}
        >
          <span className="absolute -top-4 -translate-x-1/2 text-[10px] text-subtext0 font-label">
            {h}
          </span>
        </div>
      ))}
    </div>
  );
}

function NowMarker() {
  const now = new Date();
  const minutes = toMinutes(now.toISOString());
  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red z-10"
      style={{ left: `${pct(minutes)}%` }}
    />
  );
}

function TrackRow({
  label,
  color,
  items,
  compact,
}: {
  label: string;
  color: string;
  items: TimelineItem[];
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "h-3" : "h-6"}`}>
      {!compact && (
        <div className="w-12 shrink-0 text-[10px] text-subtext0 font-label text-right">
          {label}
        </div>
      )}
      <div className="flex-1 relative h-full">
        {items.map((it, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full ${color} rounded-sm opacity-70`}
            style={{ left: `${it.startPct}%`, width: `${Math.max(it.widthPct, 0.3)}%` }}
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
  compact,
}: {
  label: string;
  color: string;
  items: TimelinePoint[];
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "h-3" : "h-5"}`}>
      {!compact && (
        <div className="w-12 shrink-0 text-[10px] text-subtext0 font-label text-right">
          {label}
        </div>
      )}
      <div className="flex-1 relative h-full">
        {items.map((it, i) => (
          <div
            key={i}
            className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 ${color} rounded-full`}
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

  if (sleepItems.length === 0 && feedItems.length === 0 && changeItems.length === 0)
    return null;

  return (
    <div className="bg-surface0 rounded-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-subtext0 font-label mb-4">
        Tagesverlauf
      </div>
      <div className="relative pt-5 space-y-1">
        <div className="absolute left-14 right-0 top-0 bottom-0">
          <TimeAxis />
          {isToday && <NowMarker />}
        </div>
        <TrackRow label="Schlaf" color="bg-lavender" items={sleepItems} />
        <DotRow label="Flasche" color="bg-peach" items={feedItems} />
        <DotRow label="Windel" color="bg-yellow" items={changeItems} />
      </div>
    </div>
  );
}

/** Compact mini timeline for weekly/pattern views — no labels, no axis. */
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

  if (sleepItems.length === 0 && feedItems.length === 0 && changeItems.length === 0)
    return null;

  return (
    <div className="relative mt-2">
      <TrackRow label="" color="bg-lavender" items={sleepItems} compact />
      <DotRow label="" color="bg-peach" items={feedItems} compact />
      <DotRow label="" color="bg-yellow" items={changeItems} compact />
      {showAxis && (
        <div className="flex justify-between mt-1">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h} className="text-[9px] text-subtext0 font-label">
              {h}
            </span>
          ))}
        </div>
      )}
      {isToday && <NowMarker />}
    </div>
  );
}
