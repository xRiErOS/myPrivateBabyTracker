/** Dashboard today summary — 2x3 grid with feeding, diaper, sleep tiles. */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Droplets, Moon, Pencil, Play, Square, Sun, Utensils, X } from "lucide-react";
import type { FeedingEntry, DiaperEntry } from "../../api/types";
import { useCreateSleep, useUpdateSleep, useSleepEntries } from "../../hooks/useSleep";
import { formatDuration, formatTime, isoToLocalInput, localInputToISO, nowISO, daysAgoISO } from "../../lib/dateUtils";
import {
  hoursAgo,
  isWet,
  todayBerlin,
  groupByDay,
  splitSleepByDay,
} from "../../lib/timelineUtils";
import { isBreastfeedingEnabled, isFeedingHybrid } from "../../lib/breastfeedingMode";
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

function TileValue({ value, sub, sub2 }: { value: React.ReactNode; sub?: React.ReactNode; sub2?: string | null }) {
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
  const { t: tDiaper } = useTranslation("diaper");
  const total = diapers.length;
  if (total === 0) return null;

  const wet = diapers.filter(isWet).length;
  const dirty = diapers.filter((d) => d.diaper_type === "dirty").length;
  const mixed = diapers.filter((d) => d.diaper_type === "mixed").length;
  const dry = total - wet - dirty - mixed;

  const segments = [
    { count: wet, color: "bg-sapphire", label: tDiaper("type_short.wet") },
    { count: dirty, color: "bg-peach", label: tDiaper("type_short.dirty") },
    { count: mixed, color: "bg-mauve", label: tDiaper("type_short.mixed") },
    { count: dry, color: "bg-overlay0", label: tDiaper("type_short.dry") },
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

function changeTypeLabel(d: DiaperEntry | undefined, tDiaper: (key: string) => string): string {
  if (!d) return "\u2014";
  switch (d.diaper_type) {
    case "mixed": return tDiaper("type_short.mixed");
    case "wet": return tDiaper("type_short.wet");
    case "dirty": return tDiaper("type_short.dirty");
    case "dry": return tDiaper("type_short.dry");
    default: return "\u2014";
  }
}


/** Compact sleep tile with timer start/stop + start-time adjust overlay. */
function SleepTile({ childId, onClick }: { childId: number; onClick?: () => void }) {
  const { t: tSleep } = useTranslation("sleep");
  // Fetch from yesterday to catch overnight sleep that extends into today
  const { data: entries = [] } = useSleepEntries({
    child_id: childId,
    date_from: daysAgoISO(1),
  });
  const createMut = useCreateSleep();
  const updateMut = useUpdateSleep();

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustStart, setAdjustStart] = useState("");

  // Use splitSleepByDay to correctly count only today's portion of overnight sleep
  const today = todayBerlin();
  const todaySegments = splitSleepByDay(entries)[today] ?? [];
  const totalMinutes = Math.round(todaySegments.reduce((sum, seg) => {
    const start = new Date(seg._splitStart).getTime();
    const end = new Date(seg._splitEnd).getTime();
    return sum + (end - start) / 60000;
  }, 0));
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

  function openAdjust(e: React.MouseEvent) {
    e.stopPropagation();
    if (!running) return;
    setAdjustStart(isoToLocalInput(running.start_time));
    setShowAdjust(true);
  }

  function handleAdjustSave() {
    if (!running || !adjustStart) return;
    updateMut.mutate(
      { id: running.id, data: { start_time: localInputToISO(adjustStart) } },
      { onSuccess: () => setShowAdjust(false) },
    );
  }

  if (running) {
    return (
      <>
        <Tile
          label={tSleep("summary_sleep")}
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
                {tSleep("since", { time: formatTime(running.start_time) })}
                <button
                  onClick={openAdjust}
                  className="text-green/60 hover:text-green transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -my-3"
                  aria-label="Startzeit anpassen"
                >
                  <Pencil size={11} />
                </button>
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

        {/* Startzeit-Anpassen Overlay */}
        {showAdjust && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-ground/80 backdrop-blur-sm"
              onClick={() => setShowAdjust(false)}
            />
            <div className="relative w-full max-w-xs bg-surface0 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-sm font-semibold text-text">Startzeit anpassen</h3>
                <button
                  onClick={() => setShowAdjust(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text"
                >
                  <X size={18} />
                </button>
              </div>
              <input
                type="datetime-local"
                value={adjustStart}
                onChange={(e) => setAdjustStart(e.target.value)}
                className="w-full min-h-[44px] rounded-[8px] bg-surface1 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdjust(false)}
                  className="px-4 py-2 rounded-lg font-label text-sm text-subtext0 hover:text-text transition-colors min-h-[44px]"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleAdjustSave}
                  disabled={updateMut.isPending || !adjustStart}
                  className="px-4 py-2 rounded-lg bg-green text-ground font-label text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[44px]"
                >
                  {updateMut.isPending ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Tile label={tSleep("summary_sleep")} icon={<Moon className="h-3 w-3 text-subtext0" />} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <TileValue
            value={formatDuration(totalMinutes)}
            sub={entries[0] ? tSleep("last_entry_sub", { time: hoursAgo(entries[0].end_time ?? entries[0].start_time) }) : null}
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
  const { t: tFeeding } = useTranslation("feeding");
  const { t: tDiaper } = useTranslation("diaper");
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

  // 7-day average (excluding today)
  const avg7days = (() => {
    const past7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (i + 1) * 86400000);
      return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    });
    const totals = past7
      .map((day) => (feedByDay[day] ?? []).reduce((s, f) => s + (f.amount_ml ?? 0), 0))
      .filter((t) => t > 0);
    return totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
  })();

  const trend =
    todayTotal > yesterdayTotal ? "\u2191" : todayTotal < yesterdayTotal ? "\u2193" : "\u2194";
  const trendColor = todayTotal >= yesterdayTotal ? "text-green" : "text-red";

  // Last breast feeding across ALL feedings (not just today)
  const allSortedFeedings = [...feedings].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
  const lastBreast = allSortedFeedings.find(
    (f) => f.feeding_type === "breast_left" || f.feeding_type === "breast_right",
  );
  const lastBreastSide = lastBreast?.feeding_type === "breast_left" ? tFeeding("side_left") : lastBreast?.feeding_type === "breast_right" ? tFeeding("side_right") : null;
  const nextBreastSide = lastBreast?.feeding_type === "breast_left" ? tFeeding("side_right") : lastBreast?.feeding_type === "breast_right" ? tFeeding("side_left") : null;

  // Last bottle across ALL feedings (for non-breastfeeding mode)
  const lastBottleAll = allSortedFeedings.find((f) => f.feeding_type === "bottle");
  const breastfeedingEnabled = isBreastfeedingEnabled();
  const hybridMode = breastfeedingEnabled && isFeedingHybrid();

  // Breast stats for today (used in breast & hybrid mode)
  const todayBreast = todayFeedings.filter(
    (f) => f.feeding_type === "breast_left" || f.feeding_type === "breast_right",
  );
  const lastTodayBreast = todayBreast[0];

  // Last diaper across ALL fetched diapers (not just today)
  const allSortedDiapers = [...diapers].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  const lastDiaper = allSortedDiapers[0];

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* --- Feeding tiles: breast / bottle / hybrid --- */}
      {(breastfeedingEnabled || hybridMode) && (
        <Tile label={tFeeding("last_breast")} icon={<Utensils className="h-3 w-3 text-peach" />} onClick={() => onTileClick?.("feeding")}>
          <TileValue
            value={lastBreastSide ?? "\u2014"}
            sub={lastBreast ? hoursAgo(lastBreast.start_time) : null}
            sub2={nextBreastSide ? tFeeding("next_side", { side: nextBreastSide }) : null}
          />
        </Tile>
      )}

      {(breastfeedingEnabled || hybridMode) && (
        <Tile label={tFeeding("today_nursed")} icon={<Utensils className="h-3 w-3 text-peach" />} onClick={() => onTileClick?.("feeding")}>
          <TileValue
            value={`${todayBreast.length}x`}
            sub={lastTodayBreast ? tFeeding("last_entry", { time: hoursAgo(lastTodayBreast.start_time) }) : tFeeding("not_nursed_yet")}
          />
        </Tile>
      )}

      {(!breastfeedingEnabled || hybridMode) && (
        <Tile label={tFeeding("last_bottle")} icon={<Utensils className="h-3 w-3 text-peach" />} onClick={() => onTileClick?.("feeding")}>
          <TileValue
            value={lastBottleAll?.amount_ml ? `${lastBottleAll.amount_ml} ml` : "\u2014"}
            sub={lastBottleAll ? hoursAgo(lastBottleAll.start_time) : null}
          />
        </Tile>
      )}

      {(!breastfeedingEnabled || hybridMode) && (
        <Tile label={tFeeding("today_total")} icon={<Utensils className="h-3 w-3 text-subtext0" />} onClick={() => onTileClick?.("feeding")}>
          <TileValue
            value={
              <>
                {todayTotal} ml{" "}
                <span className={`text-[12px] ${trendColor}`}>{trend}</span>
              </>
            }
            sub={
              <div className="flex gap-2">
                <span>{tFeeding("yesterday_short", { amount: yesterdayTotal })}</span>
                {avg7days != null && <span className="text-mauve">{tFeeding("avg_7days_short", { amount: avg7days })}</span>}
              </div>
            }
          />
        </Tile>
      )}

      <Tile label={tDiaper("last_diaper")} icon={<Droplets className="h-3 w-3 text-sapphire" />} onClick={() => onTileClick?.("diaper")}>
        <TileValue
          value={changeTypeLabel(lastDiaper, tDiaper)}
          sub={lastDiaper ? hoursAgo(lastDiaper.time) : null}
        />
      </Tile>

      <Tile label={tDiaper("today_count")} icon={<Droplets className="h-3 w-3 text-sapphire" />} onClick={() => onTileClick?.("diaper")}>
        <div className="flex gap-1.5">
          {[
            { value: todayDiapers.length, label: tDiaper("summary_total_short") },
            { value: todayDiapers.filter(isWet).length, label: tDiaper("summary_wet_short") },
            { value: todayDiapers.filter(d => d.diaper_type === "mixed").length, label: tDiaper("summary_both_short") },
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
  const { t: tVitD3 } = useTranslation("vitamind3");
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
      const time = new Date(todayEntry.given_at).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
      return tVitD3("today_at", { time });
    }
    if (lastEntry) {
      const diffMs = new Date(today).getTime() - new Date(lastEntry.date).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return tVitD3("last_yesterday");
      return tVitD3("last_days_ago", { count: diffDays });
    }
    return tVitD3("never_given");
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
      <Tile label={tVitD3("tile_title")} icon={<Sun className="h-3 w-3 text-yellow" />} onClick={() => setModalOpen(true)}>
        <TileValue
          value={<span className={givenToday ? "text-green" : "text-peach"}>{givenToday ? tVitD3("given") : tVitD3("pending")}</span>}
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
                <h3 className="font-headline text-base font-semibold text-text">{tVitD3("title")}</h3>
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
                {givenToday ? tVitD3("given") : tVitD3("pending")}
              </p>
              <p className="font-body text-sm text-subtext0 mt-1">{subLabel()}</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-label text-sm text-text">{tVitD3("given_today")}</span>
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
