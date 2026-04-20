/** Dashboard today summary — 2x3 grid with feeding, diaper, sleep tiles. */

import { useEffect, useState } from "react";
import { Droplets, Moon, Play, Square, Utensils } from "lucide-react";
import type { FeedingEntry, DiaperEntry } from "../../api/types";
import { useCreateSleep, useUpdateSleep, useSleepEntries } from "../../hooks/useSleep";
import { formatDuration, formatTime, nowISO, startOfTodayISO } from "../../lib/dateUtils";
import {
  hoursAgo,
  isWet,
  isSolid,
  todayBerlin,
  groupByDay,
} from "../../lib/timelineUtils";
import { isBreastfeedingEnabled } from "../../lib/breastfeedingMode";

function Tile({
  label,
  icon,
  children,
  className = "",
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-surface0 rounded-card p-3 ${onClick ? "cursor-pointer active:bg-surface1 transition-colors" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider text-subtext0 font-label">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function TileValue({ value, sub, sub2 }: { value: React.ReactNode; sub?: string | null; sub2?: string | null }) {
  return (
    <>
      <div className="font-headline text-lg font-semibold text-text">{value}</div>
      {sub && <div className="font-body text-xs text-subtext0">{sub}</div>}
      {sub2 && <div className="font-body text-xs text-mauve">{sub2}</div>}
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

/** Compact sleep tile with timer start/stop. */
function SleepTile({ childId, onClick }: { childId: number; onClick?: () => void }) {
  const { data: entries = [] } = useSleepEntries({
    child_id: childId,
    date_from: startOfTodayISO(),
  });
  const createMut = useCreateSleep();
  const updateMut = useUpdateSleep();

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const running = entries.find((e) => !e.end_time);

  // Live elapsed seconds for running timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running?.start_time) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(running.start_time).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running?.start_time]);

  function formatElapsed(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")} h`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function handleStart(e: React.MouseEvent) {
    e.stopPropagation();
    createMut.mutate({ child_id: childId, start_time: nowISO(), sleep_type: "nap" });
  }

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation();
    if (running) updateMut.mutate({ id: running.id, data: { end_time: nowISO() } });
  }

  if (running) {
    return (
      <Tile
        label="Schlaf"
        icon={<Moon className="h-3 w-3 text-green" />}
        className="ring-1 ring-green/30 bg-green/5"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-headline text-lg font-semibold text-green">
              {formatElapsed(elapsed)}
            </div>
            <div className="font-body text-xs text-green flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
              seit {formatTime(running.start_time)}
            </div>
          </div>
          <button
            onClick={handleStop}
            disabled={updateMut.isPending}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-green text-ground hover:opacity-90 transition-opacity"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </Tile>
    );
  }

  return (
    <Tile label="Schlaf" icon={<Moon className="h-3 w-3 text-subtext0" />} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <TileValue
            value={formatDuration(totalMinutes)}
            sub={entries[0] ? `Letzter: ${hoursAgo(entries[0].end_time ?? entries[0].start_time)}` : null}
          />
        </div>
        <button
          onClick={handleStart}
          disabled={createMut.isPending}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-mauve text-ground hover:opacity-90 transition-opacity"
        >
          <Play className="h-4 w-4" />
        </button>
      </div>
    </Tile>
  );
}

interface BabySummaryProps {
  feedings: FeedingEntry[];
  diapers: DiaperEntry[];
  childId: number;
  onTileClick?: (category: string) => void;
}

export function BabySummary({
  feedings,
  diapers,
  childId,
  onTileClick,
}: BabySummaryProps) {
  const today = todayBerlin();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  });

  const feedByDay = groupByDay(feedings, "start_time");
  const diaperByDay = groupByDay(diapers, "time");

  const todayFeedings = feedByDay[today] ?? [];
  const yesterdayFeedings = feedByDay[yesterday] ?? [];
  const todayDiapers = diaperByDay[today] ?? [];

  const todayTotal = todayFeedings.reduce((s, f) => s + (f.amount_ml ?? 0), 0);
  const yesterdayTotal = yesterdayFeedings.reduce((s, f) => s + (f.amount_ml ?? 0), 0);
  const trend =
    todayTotal > yesterdayTotal ? "\u2191" : todayTotal < yesterdayTotal ? "\u2193" : "\u2194";
  const trendColor = todayTotal >= yesterdayTotal ? "text-green" : "text-red";

  const sortedFeedings = [...todayFeedings].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );

  // Last breast feeding across ALL feedings (not just today)
  const allSortedFeedings = [...feedings].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
  const lastBreast = allSortedFeedings.find(
    (f) => f.feeding_type === "breast_left" || f.feeding_type === "breast_right",
  );
  const lastBreastSide = lastBreast?.feeding_type === "breast_left" ? "Links" : lastBreast?.feeding_type === "breast_right" ? "Rechts" : null;
  const nextBreastSide = lastBreastSide === "Links" ? "Rechts" : lastBreastSide === "Rechts" ? "Links" : null;

  // Last bottle feeding for sub-info in "Heute gesamt"
  const lastBottle = sortedFeedings.find((f) => f.feeding_type === "bottle");

  // Last bottle across ALL feedings (for non-breastfeeding mode)
  const lastBottleAll = allSortedFeedings.find((f) => f.feeding_type === "bottle");
  const breastfeedingEnabled = isBreastfeedingEnabled();

  const sortedDiapers = [...todayDiapers].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  const lastDiaper = sortedDiapers[0];

  return (
    <div className="grid grid-cols-2 gap-3">
      {breastfeedingEnabled ? (
        <Tile label="Stillseite" icon={<Utensils className="h-3 w-3 text-peach" />} onClick={() => onTileClick?.("feeding")}>
          <TileValue
            value={lastBreastSide ?? "\u2014"}
            sub={lastBreast ? hoursAgo(lastBreast.start_time) : null}
            sub2={nextBreastSide ? `N\u00e4chste: ${nextBreastSide}` : null}
          />
        </Tile>
      ) : (
        <Tile label="Letzte Flasche" icon={<Utensils className="h-3 w-3 text-peach" />} onClick={() => onTileClick?.("feeding")}>
          <TileValue
            value={lastBottleAll?.amount_ml ? `${lastBottleAll.amount_ml} ml` : "\u2014"}
            sub={lastBottleAll ? hoursAgo(lastBottleAll.start_time) : null}
          />
        </Tile>
      )}

      <Tile label="Heute gesamt" icon={<Utensils className="h-3 w-3 text-subtext0" />} onClick={() => onTileClick?.("feeding")}>
        <TileValue
          value={
            <>
              {todayTotal} ml{" "}
              <span className={`text-[12px] ${trendColor}`}>{trend}</span>
            </>
          }
          sub={lastBottle ? `Letzte Flasche: ${lastBottle.amount_ml ?? 0} ml` : `Gestern: ${yesterdayTotal} ml`}
        />
      </Tile>

      <Tile label="Windeln heute" icon={<Droplets className="h-3 w-3 text-sapphire" />} onClick={() => onTileClick?.("diaper")} className="col-span-2">
        <div className="flex items-center gap-4">
          <div className="flex gap-2 flex-1">
            {[
              { value: todayDiapers.length, label: "Ges." },
              { value: todayDiapers.filter(isWet).length, label: "Nass" },
              { value: todayDiapers.filter(d => d.diaper_type === "mixed").length, label: "Beid." },
            ].map(({ value, label }) => (
              <div key={label} className="bg-surface1 rounded-lg px-2 py-1 text-center flex-1">
                <p className="font-headline text-base font-semibold">{value}</p>
                <p className="font-body text-[10px] text-subtext0">{label}</p>
              </div>
            ))}
          </div>
          <div className="text-right shrink-0">
            <div className="font-body text-xs text-subtext0">
              {lastDiaper ? `${changeTypeLabel(lastDiaper)} — ${hoursAgo(lastDiaper.time)}` : "\u2014"}
            </div>
            <div className="font-body text-[10px] text-subtext0">
              {diaperSummary(todayDiapers)}
            </div>
          </div>
        </div>
      </Tile>

      <SleepTile childId={childId} onClick={() => onTileClick?.("sleep")} />

      <Tile label="Mahlzeiten" icon={<Utensils className="h-3 w-3 text-subtext0" />} onClick={() => onTileClick?.("feeding")}>
        <TileValue
          value={`${todayFeedings.length}`}
          sub={`${sortedFeedings.length > 0 ? `Letzte: ${new Date(sortedFeedings[0].start_time).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })}` : ""}`}
        />
      </Tile>
    </div>
  );
}
