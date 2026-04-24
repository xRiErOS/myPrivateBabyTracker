/** Feeding entry list with inline edit. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Activity, Droplets, Pencil, Trash2, Utensils, X } from "lucide-react";
import { Card } from "../../components/Card";
import { ListSummaryBar, MetricPill } from "../../components/ListSummaryBar";
import { TagBadges } from "../../components/TagBadges";
import { Select } from "../../components/Select";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteFeeding, useFeedingEntries } from "../../hooks/useFeeding";
import { useCreateHealth, useHealthEntries } from "../../hooks/useHealth";
import { formatDateTime, formatTimeSince, nowISO, daysAgoISO } from "../../lib/dateUtils";
import { berlinDayBounds } from "../../lib/timelineUtils";
import { FeedingForm } from "./FeedingForm";
import { isBreastfeedingEnabled } from "../../lib/breastfeedingMode";
import type { FeedingType, HealthSeverity } from "../../api/types";

type HealthOverlay = { feedingId: number; type: "spit_up" | "tummy_ache" };

export function FeedingList() {
  const { t } = useTranslation("feeding");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();

  const TYPE_OPTIONS = [
    { value: "", label: t("type_filter.all") },
    { value: "breast_left", label: t("type.breast_left") },
    { value: "breast_right", label: t("type.breast_right") },
    { value: "bottle", label: t("type.bottle") },
    { value: "solid", label: t("type.solid") },
  ];

  const TYPE_LABELS: Record<FeedingType, string> = {
    breast_left: t("type.breast_left"),
    breast_right: t("type.breast_right"),
    bottle: t("type.bottle"),
    solid: t("type.solid"),
  };

  const SPIT_SEVERITIES: { value: HealthSeverity; label: string; color: string }[] = [
    { value: "mild", label: t("spit.mild"), color: "bg-green text-ground" },
    { value: "moderate", label: t("spit.moderate"), color: "bg-peach text-ground" },
    { value: "severe", label: t("spit.severe"), color: "bg-red text-ground" },
  ];
  const [typeFilter, setTypeFilter] = useState("");
  const [searchParams] = useSearchParams();
  const specificDate = searchParams.get("date");
  const [dateRange, setDateRange] = useState<DateRange>(
    specificDate ? "today" : (searchParams.get("range") as DateRange) ?? "week"
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [healthOverlay, setHealthOverlay] = useState<HealthOverlay | null>(null);
  const deleteMut = useDeleteFeeding();
  const createHealthMut = useCreateHealth();

  // Compute date range using Berlin timezone — avoids UTC-midnight bug for post-midnight feedings
  const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
    today: berlinDayBounds(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })).min,
    week: daysAgoISO(7),
    twoWeeks: daysAgoISO(14),
    all: undefined,
  };
  const dateFrom = specificDate ? berlinDayBounds(specificDate).min : DATE_RANGE_MAP[dateRange];
  const dateTo = specificDate ? berlinDayBounds(specificDate).max : undefined;

  const { data: entries = [], isLoading } = useFeedingEntries({
    child_id: activeChild?.id,
    feeding_type: typeFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  });

  // Load health entries for same date range to show linked icons
  const { data: healthEntries = [] } = useHealthEntries({
    child_id: activeChild?.id,
    date_from: dateFrom,
    date_to: dateTo,
  });

  // Group health entries by feeding_id
  const healthByFeeding = new Map<number, { hasSpit: boolean; hasTummy: boolean }>();
  for (const h of healthEntries) {
    if (h.feeding_id == null) continue;
    const existing = healthByFeeding.get(h.feeding_id) ?? { hasSpit: false, hasTummy: false };
    if (h.entry_type === "spit_up") existing.hasSpit = true;
    if (h.entry_type === "tummy_ache") existing.hasTummy = true;
    healthByFeeding.set(h.feeding_id, existing);
  }

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">{tc("loading")}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Utensils className="h-8 w-8" />
        <p className="font-body text-sm">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {isBreastfeedingEnabled() && (
        <Select
          label="Filter"
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
      )}

      {entries.length > 0 && dateRange !== "all" && (() => {
        const lastEntry = entries[0];
        const maxDays = dateRange === "twoWeeks" ? 13 : 6;

        // Group entries by day (Berlin timezone)
        const byDay = new Map<string, typeof entries>();
        for (const e of entries) {
          const day = new Date(e.start_time).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
          const arr = byDay.get(day) ?? [];
          arr.push(e);
          byDay.set(day, arr);
        }

        // Last N full days (excluding today)
        const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
        const fullDays = [...byDay.entries()]
          .filter(([day]) => day !== todayStr)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, maxDays);

        const avgMeals = fullDays.length > 0
          ? Math.round(fullDays.reduce((s, [, v]) => s + v.length, 0) / fullDays.length * 10) / 10
          : null;
        const avgMl = fullDays.length > 0
          ? Math.round(fullDays.reduce((s, [, v]) => s + v.reduce((a, f) => a + (f.amount_ml ?? 0), 0), 0) / fullDays.length)
          : null;

        // Average interval between consecutive meals (all entries)
        const sorted = [...entries].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        );
        let avgInterval: string | null = null;
        if (sorted.length > 1) {
          let totalMs = 0;
          for (let i = 1; i < sorted.length; i++) {
            totalMs += new Date(sorted[i].start_time).getTime() - new Date(sorted[i - 1].start_time).getTime();
          }
          const avgMs = totalMs / (sorted.length - 1);
          const h = Math.floor(avgMs / 3600000);
          const m = Math.round((avgMs % 3600000) / 60000);
          avgInterval = `${h}:${String(m).padStart(2, "0")}`;
        }

        return (
          <ListSummaryBar>
            <div className="flex gap-1.5">
              {avgMeals != null && <MetricPill label={t("summary.avg_meals")} value={avgMeals} />}
              {avgMl != null && <MetricPill label={t("summary.avg_ml")} value={`${avgMl} ml`} />}
              {avgInterval != null && <MetricPill label={t("summary.avg_interval")} value={avgInterval} />}
            </div>
            {lastEntry && (
              <p className="font-body text-xs text-subtext0">
                {t("summary.last")}: {TYPE_LABELS[lastEntry.feeding_type as FeedingType] ?? lastEntry.feeding_type} — {formatTimeSince(lastEntry.start_time)}
              </p>
            )}
          </ListSummaryBar>
        );
      })()}

      {entries.map((entry) => {
        const linked = healthByFeeding.get(entry.id);
        return (
          <Card key={entry.id} className={`flex flex-col gap-1 p-3${editingId === entry.id ? " overflow-hidden" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-peach" />
                <span className="font-label text-sm font-medium">
                  {TYPE_LABELS[entry.feeding_type as FeedingType] ?? entry.feeding_type}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${editingId === entry.id ? "text-peach" : "text-subtext0 hover:text-text"} transition-colors`}
                >
                  {editingId === entry.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMut.mutate(entry.id); }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-red transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="font-body text-sm text-subtext0">
              {formatDateTime(entry.start_time)}
            </p>
            <p className="font-body text-sm text-overlay0">
              {entry.amount_ml != null && `${entry.amount_ml} ml`}
              {entry.food_type && `${entry.amount_ml != null ? " | " : ""}${entry.food_type}`}
            </p>
            {entry.notes && (
              <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
            )}
            <TagBadges entryType="feeding" entryId={entry.id} />
            {/* Health icons row — always visible, grey=not recorded, color=recorded, tap to record */}
            {healthOverlay?.feedingId !== entry.id && (
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setHealthOverlay({ feedingId: entry.id, type: "spit_up" })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-label transition-colors ${
                    linked?.hasSpit
                      ? "text-sapphire bg-sapphire/10"
                      : "text-overlay0 bg-surface1 hover:bg-surface2"
                  }`}
                >
                  <Droplets className="h-3.5 w-3.5" />
                  {t("health.spit_up")}
                </button>
                <button
                  type="button"
                  onClick={() => setHealthOverlay({ feedingId: entry.id, type: "tummy_ache" })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-label transition-colors ${
                    linked?.hasTummy
                      ? "text-mauve bg-mauve/10"
                      : "text-overlay0 bg-surface1 hover:bg-surface2"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  {t("health.tummy_ache")}
                </button>
              </div>
            )}
            {healthOverlay?.feedingId === entry.id && (
              <div className="border-t border-surface1 mt-2 pt-2">
                <p className="font-label text-xs font-medium text-text mb-2">
                  {healthOverlay.type === "spit_up" ? t("health.spit_up") : t("health.tummy_ache")} {t("health.record")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SPIT_SEVERITIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      disabled={createHealthMut.isPending}
                      onClick={async () => {
                        await createHealthMut.mutateAsync({
                          child_id: activeChild!.id,
                          entry_type: healthOverlay.type,
                          severity: s.value,
                          time: nowISO(),
                          feeding_id: entry.id,
                        });
                        setHealthOverlay(null);
                      }}
                      className={`min-h-[44px] rounded-[8px] font-label text-sm font-medium transition-colors ${s.color} hover:opacity-90 disabled:opacity-50`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHealthOverlay(null)}
                  className="mt-2 font-body text-xs text-overlay0 hover:text-text transition-colors"
                >
                  {tc("cancel")}
                </button>
              </div>
            )}
            {editingId === entry.id && (
              <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
                <FeedingForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
