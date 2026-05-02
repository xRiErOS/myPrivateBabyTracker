/** Timeline utilities — sleep splitting, time→position conversion, day grouping. */

import type { SleepEntry, FeedingEntry, DiaperEntry } from "../api/types";

const TZ = "Europe/Berlin";

/** Sleep segment after splitting at midnight boundaries. */
export interface SleepSegment extends SleepEntry {
  _splitStart: string;
  _splitEnd: string;
  _ongoing?: boolean;
}

/** Get Berlin timezone offset in ms for a given date. */
function berlinOffset(date: Date): number {
  const utc = date.toLocaleString("en-US", { timeZone: "UTC" });
  const berlin = date.toLocaleString("en-US", { timeZone: TZ });
  return new Date(berlin).getTime() - new Date(utc).getTime();
}

/** Get Berlin date string (YYYY-MM-DD) for a UTC ISO string. */
export function toBerlinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** Get today's Berlin date string. */
export function todayBerlin(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** Get Berlin day boundaries as ISO strings. */
export function berlinDayBounds(dateStr: string): { min: string; max: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const offset = berlinOffset(noon);
  const min = new Date(Date.UTC(y, m - 1, d) - offset);
  const max = new Date(Date.UTC(y, m - 1, d + 1) - offset - 1);
  return { min: min.toISOString(), max: max.toISOString() };
}

/**
 * Split sleep entries at midnight boundaries (Berlin time).
 * Returns a map of date→SleepSegment[].
 */
export function splitSleepByDay(
  sleeps: SleepEntry[],
): Record<string, SleepSegment[]> {
  const map: Record<string, SleepSegment[]> = {};
  sleeps.forEach((sl) => {
    if (!sl.start_time) return;
    const isOngoing = !sl.end_time;
    const start = new Date(sl.start_time);
    const end = isOngoing ? new Date() : new Date(sl.end_time!);
    let cursor = start;
    while (cursor < end) {
      const cursorDay = cursor.toLocaleDateString("sv-SE", { timeZone: TZ });
      const [y, m, d] = cursorDay.split("-").map(Number);
      const nextDayUtcNoon = Date.UTC(y, m - 1, d + 1, 12, 0, 0);
      const offset = berlinOffset(new Date(nextDayUtcNoon));
      const nextMidnight = new Date(Date.UTC(y, m - 1, d + 1) - offset);
      const segEnd = end < nextMidnight ? end : nextMidnight;
      if (!map[cursorDay]) map[cursorDay] = [];
      map[cursorDay].push({
        ...sl,
        _splitStart: cursor.toISOString(),
        _splitEnd: segEnd.toISOString(),
        ...(isOngoing ? { _ongoing: true } : {}),
      });
      cursor = segEnd;
    }
  });
  return map;
}

/** Convert ISO timestamp to minutes since midnight (Berlin time). */
export function toMinutes(isoStr: string): number {
  const d = new Date(isoStr);
  // Mobile Safari (WebKit) returns '24:XX' for midnight with hour12:false;
  // formatToParts + % 24 normalises this cross-browser.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === "hour")!.value) % 24;
  const m = parseInt(parts.find((p) => p.type === "minute")!.value);
  return h * 60 + m;
}

/** Convert minutes to percentage of 24h (1440 minutes). */
export function pct(minutes: number): number {
  return (minutes / 1440) * 100;
}

/** Group items by Berlin date. */
export function groupByDay<T>(
  items: T[],
  timeField: keyof T,
): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  items.forEach((item) => {
    const t = item[timeField];
    if (!t || typeof t !== "string") return;
    const day = toBerlinDate(t);
    if (!map[day]) map[day] = [];
    map[day].push(item);
  });
  return map;
}

/** Hours ago string like "vor 02:15". */
export function hoursAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `vor ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format minutes as "H:MM h" string. */
export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}:${String(m).padStart(2, "0")} h`;
}

/** Check if diaper entry is wet. */
export function isWet(d: DiaperEntry): boolean {
  return d.diaper_type === "wet" || d.diaper_type === "mixed";
}

/** Check if diaper entry is solid/dirty. */
export function isSolid(d: DiaperEntry): boolean {
  return d.diaper_type === "dirty" || d.diaper_type === "mixed";
}

/** Build timeline items from data — returns positioned items for rendering. */
export interface TimelineItem {
  startPct: number;
  widthPct: number;
  label?: string;
  ongoing?: boolean;
}

export interface TimelinePoint {
  posPct: number;
  label?: string;
}

export function buildTimelineItems(
  feedings: FeedingEntry[],
  diapers: DiaperEntry[],
  sleepSegments: SleepSegment[],
) {
  const sleepItems: TimelineItem[] = sleepSegments.map((s) => {
    const startMin = toMinutes(s._splitStart);
    const endMin = toMinutes(s._splitEnd);
    const width = endMin > startMin ? endMin - startMin : 1440 - startMin + endMin;
    return { startPct: pct(startMin), widthPct: pct(width), ongoing: s._ongoing };
  });

  const feedItems: TimelinePoint[] = feedings.map((f) => ({
    posPct: pct(toMinutes(f.start_time)),
    label: f.amount_ml ? `${f.amount_ml} ml` : undefined,
  }));

  const changeItems: TimelinePoint[] = diapers.map((c) => ({
    posPct: pct(toMinutes(c.time)),
  }));

  return { sleepItems, feedItems, changeItems };
}

/** Get sorted date keys for the last N days ending today. */
export function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toLocaleDateString("sv-SE", { timeZone: TZ }));
  }
  return days;
}
