/** Dashboard today summary — 2x3 grid with feeding, diaper, sleep tiles. */

import { useEffect, useState } from "react";
import { Droplets, Moon, Play, Square, Sun, Utensils, X } from "lucide-react";
import type { FeedingEntry, DiaperEntry } from "../../api/types";
import { useCreateSleep, useUpdateSleep, useSleepEntries } from "../../hooks/useSleep";
import { formatDuration, formatTime, nowISO, startOfTodayISO } from "../../lib/dateUtils";
import {
  hoursAgo,
  isWet,
  todayBerlin,
  groupByDay,
} from "../../lib/timelineUtils";
import { isBreastfeedingEnabled } from "../../lib/breastfeedingMode";
import {
  useVitaminD3Entries,
  useCreateVitaminD3,
  useDeleteVitaminD3,
} from "../../hooks/useVitaminD3";
import { isVisibleOnDashboard } from "../../lib/pluginConfig";

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

/** Proportional color bar for diaper type distribution. */
function DiaperBar({ diapers }: { diapers: DiaperEntry[] }) {
  const total = diapers.length;
  if (total === 0) return null;

  const wet = diapers.filter(isWet).length;
  const dirty = diapers.filter((d) => d.diaper_type === "dirty").length;
  const mixed = diapers.filter((d) => d.diaper_type === "mixed").length;
  const dry = total - wet - dirty - mixed;

  const segments = [
    { count: wet, color: "bg-sapphire", label: "Nass" },
    { count: dirty, color: "bg-peach", label: "Dreckig" },
    { count: mixed, color: "bg-mauve", label: "Beides" },
    { count: dry, color: "bg-overlay0", label: "Trocken" },
  ].filter((s) => s.count > 0);

  return (
    <div className="mt-1.5 flex h-2 w-full rounded-full overflow-hidden">
      {segments.map((s) => (
        <div
          key={s.label}
          className={`${s.color} h-full`}
          style={{ width: `${(s.count / total) * 100}%` }}
          title={`${s.label}: ${s.count}`}
        />
      ))}
    </div>
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

      <Tile label="Letzte Windel" icon={<Droplets className="h-3 w-3 text-sapphire" />} onClick={() => onTileClick?.("diaper")}>
        <TileValue
          value={changeTypeLabel(lastDiaper)}
          sub={lastDiaper ? hoursAgo(lastDiaper.time) : null}
        />
      </Tile>

      <Tile label="Windeln heute" icon={<Droplets className="h-3 w-3 text-sapphire" />} onClick={() => onTileClick?.("diaper")}>
        <div className="flex gap-1.5">
          {[
            { value: todayDiapers.length, label: "Ges." },
            { value: todayDiapers.filter(isWet).length, label: "Nass" },
            { value: todayDiapers.filter(d => d.diaper_type === "mixed").length, label: "Beid." },
          ].map(({ value, label }) => (
            <div key={label} className="bg-surface1 rounded-lg px-1.5 py-1 text-center flex-1">
              <p className="font-headline text-sm font-semibold">{value}</p>
              <p className="font-body text-[9px] text-subtext0">{label}</p>
            </div>
          ))}
        </div>
        <DiaperBar diapers={todayDiapers} />
      </Tile>

      <SleepTile childId={childId} onClick={() => onTileClick?.("sleep")} />

      {isVisibleOnDashboard("vitamind3") && <VitD3Tile childId={childId} />}
    </div>
  );
}

/** Vitamin D3 tile — tap opens modal with toggle. */
function VitD3Tile({ childId }: { childId: number }) {
  const [modalOpen, setModalOpen] = useState(false);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = todayBerlin();

  const { data: entries = [] } = useVitaminD3Entries({ child_id: childId, month });
  const createMut = useCreateVitaminD3();
  const deleteMut = useDeleteVitaminD3();

  const todayEntry = entries.find((e) => e.date === today);
  const givenToday = !!todayEntry;

  const lastEntry = entries
    .filter((e) => e.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  function subLabel(): string {
    if (givenToday && todayEntry) {
      return `Heute ${new Date(todayEntry.given_at).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })}`;
    }
    if (lastEntry) {
      const diffMs = new Date(today).getTime() - new Date(lastEntry.date).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return "Zuletzt: gestern";
      return `Zuletzt: vor ${diffDays} Tagen`;
    }
    return "Noch nie gegeben";
  }

  function handleToggle() {
    if (givenToday && todayEntry) {
      deleteMut.mutate(todayEntry.id);
    } else {
      createMut.mutate({ child_id: childId, date: today });
    }
  }

  return (
    <>
      <Tile label="Vit. D3" icon={<Sun className="h-3 w-3 text-yellow" />} onClick={() => setModalOpen(true)}>
        <TileValue
          value={<span className={givenToday ? "text-green" : "text-peach"}>{givenToday ? "Gegeben" : "Ausstehend"}</span>}
          sub={subLabel()}
        />
      </Tile>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div className="absolute inset-0 bg-ground/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xs bg-surface0 rounded-2xl p-5 space-y-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow" />
                <h3 className="font-headline text-base font-semibold text-text">Vitamin D3</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-surface1 text-subtext0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center py-2">
              <p className={`font-headline text-xl font-semibold ${givenToday ? "text-green" : "text-peach"}`}>
                {givenToday ? "Gegeben" : "Ausstehend"}
              </p>
              <p className="font-body text-sm text-subtext0 mt-1">{subLabel()}</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-label text-sm text-text">Heute gegeben</span>
              <button
                type="button"
                role="switch"
                aria-checked={givenToday}
                onClick={handleToggle}
                disabled={createMut.isPending || deleteMut.isPending}
                className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${givenToday ? "bg-green" : "bg-surface2"}`}
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${givenToday ? "translate-x-[26px]" : "translate-x-[2px]"}`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
