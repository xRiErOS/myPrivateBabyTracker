/** Dashboard today summary — tiles with last entry, totals, yesterday comparison. */

import type { FeedingEntry, DiaperEntry, SleepEntry } from "../../api/types";
import {
  hoursAgo,
  isWet,
  isSolid,
  splitSleepByDay,
  todayBerlin,
  groupByDay,
  formatDuration,
  type SleepSegment,
} from "../../lib/timelineUtils";

function Tile({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-surface0 rounded-card p-3 ${onClick ? "cursor-pointer active:bg-surface1 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="text-[11px] uppercase tracking-wider text-subtext0 font-label mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function TileValue({ value, sub }: { value: React.ReactNode; sub?: string | null }) {
  return (
    <>
      <div className="font-headline text-lg font-semibold text-text">{value}</div>
      {sub && <div className="font-body text-xs text-subtext0">{sub}</div>}
    </>
  );
}

function changeTypeLabel(d: DiaperEntry | undefined): string {
  if (!d) return "\u2014";
  switch (d.diaper_type) {
    case "mixed": return "Beides";
    case "wet": return "Nass";
    case "dirty": return "Dreckig";
    case "dry": return "Trocken";
    default: return "\u2014";
  }
}

function diaperSummary(diapers: DiaperEntry[]): string {
  const wet = diapers.filter(isWet).length;
  const solid = diapers.filter(isSolid).length;
  const dry = diapers.filter((d) => d.diaper_type === "dry").length;
  const parts: string[] = [];
  if (wet) parts.push(`${wet}x nass`);
  if (solid) parts.push(`${solid}x dreckig`);
  if (dry) parts.push(`${dry}x trocken`);
  return parts.join(", ") || "keine";
}

interface BabySummaryProps {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  sleeps: SleepEntry[];
  onTileClick?: (category: string) => void;
}

export function BabySummary({
  feedings,
  diapers,
  sleeps,
  onTileClick,
}: BabySummaryProps) {
  const today = todayBerlin();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  });

  const feedByDay = groupByDay(feedings, "start_time");
  const diaperByDay = groupByDay(diapers, "time");
  const sleepMap = splitSleepByDay(sleeps);

  const todayFeedings = feedByDay[today] ?? [];
  const yesterdayFeedings = feedByDay[yesterday] ?? [];
  const todayDiapers = diaperByDay[today] ?? [];
  const todaySleepSegs: SleepSegment[] = sleepMap[today] ?? [];

  const todayTotal = todayFeedings.reduce((s, f) => s + (f.amount_ml ?? 0), 0);
  const yesterdayTotal = yesterdayFeedings.reduce((s, f) => s + (f.amount_ml ?? 0), 0);
  const trend =
    todayTotal > yesterdayTotal ? "\u2191" : todayTotal < yesterdayTotal ? "\u2193" : "\u2194";
  const trendColor = todayTotal >= yesterdayTotal ? "text-green" : "text-red";

  const sortedFeedings = [...todayFeedings].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
  const lastFeeding = sortedFeedings[0];

  const sortedDiapers = [...todayDiapers].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  const lastDiaper = sortedDiapers[0];

  const sleepMinutes = todaySleepSegs.reduce((s, seg) => {
    const start = new Date(seg._splitStart).getTime();
    const end = new Date(seg._splitEnd).getTime();
    return s + (end - start) / 60000;
  }, 0);
  const sleepDisplay = formatDuration(sleepMinutes);

  const running = sleeps.find((s) => !s.end_time);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile label="Letzte Flasche" onClick={() => onTileClick?.("feeding")}>
        <TileValue
          value={lastFeeding ? `${lastFeeding.amount_ml ?? 0} ml` : "\u2014"}
          sub={lastFeeding ? hoursAgo(lastFeeding.start_time) : null}
        />
      </Tile>

      <Tile label="Heute gesamt" onClick={() => onTileClick?.("feeding")}>
        <TileValue
          value={
            <>
              {todayTotal} ml{" "}
              <span className={`text-[12px] ${trendColor}`}>{trend}</span>
            </>
          }
          sub={`Gestern: ${yesterdayTotal} ml`}
        />
      </Tile>

      <Tile label="Letzte Windel" onClick={() => onTileClick?.("diaper")}>
        <TileValue
          value={changeTypeLabel(lastDiaper)}
          sub={lastDiaper ? hoursAgo(lastDiaper.time) : null}
        />
      </Tile>

      <Tile label="Windeln heute" onClick={() => onTileClick?.("diaper")}>
        <TileValue
          value={`${todayDiapers.length}`}
          sub={diaperSummary(todayDiapers)}
        />
      </Tile>

      <Tile label="Schlaf heute" onClick={() => onTileClick?.("sleep")}>
        <TileValue
          value={
            <>
              {running && (
                <span className="inline-block w-2 h-2 bg-green rounded-full mr-1 animate-pulse" />
              )}
              {sleepDisplay}
            </>
          }
          sub={running ? "Schlaeft gerade" : null}
        />
      </Tile>

      <Tile label="Mahlzeiten" onClick={() => onTileClick?.("feeding")}>
        <TileValue
          value={`${todayFeedings.length}x`}
          sub={`${sortedFeedings.length > 0 ? `Letzte: ${new Date(sortedFeedings[0].start_time).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })}` : ""}`}
        />
      </Tile>
    </div>
  );
}
