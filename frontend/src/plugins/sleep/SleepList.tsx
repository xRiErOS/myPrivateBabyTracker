/** Sleep entry list with inline edit (running entries excluded). */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Moon, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { ListSummaryBar, MetricPill } from "../../components/ListSummaryBar";
import { TagBadges } from "../../components/TagBadges";
import { Select } from "../../components/Select";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteSleep, useSleepEntries } from "../../hooks/useSleep";
import { formatDateTime, formatDuration, formatTimeSince, daysAgoISO } from "../../lib/dateUtils";
import { berlinDayBounds, splitSleepByDay, toBerlinDate } from "../../lib/timelineUtils";
import { SleepForm } from "./SleepForm";

export function SleepList() {
  const { t } = useTranslation("sleep");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();

  const TYPE_OPTIONS = [
    { value: "", label: t("type_filter.all") },
    { value: "nap", label: t("type.nap") },
    { value: "night", label: t("type.night") },
  ];
  const [typeFilter, setTypeFilter] = useState("");
  const [searchParams] = useSearchParams();
  const specificDate = searchParams.get("date");
  const [dateRange, setDateRange] = useState<DateRange>(
    specificDate ? "today" : (searchParams.get("range") as DateRange) ?? "week"
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMut = useDeleteSleep();

  // Compute date range using Berlin timezone — avoids UTC-midnight bug for post-midnight entries
  const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
    today: berlinDayBounds(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })).min,
    week: daysAgoISO(7),
    twoWeeks: daysAgoISO(14),
    all: undefined,
  };
  const dateFrom = specificDate ? berlinDayBounds(specificDate).min : DATE_RANGE_MAP[dateRange];
  const dateTo = specificDate ? berlinDayBounds(specificDate).max : undefined;

  const { data: allEntries = [], isLoading } = useSleepEntries({
    child_id: activeChild?.id,
    sleep_type: typeFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  });

  // Filter out running entries — those are shown in SleepForm timer
  const entries = allEntries.filter((e) => e.end_time != null);

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">{tc("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      <div data-tutorial="sleep-filter">
        <Select
          label="Filter"
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        />
      </div>

      {entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
          <Moon className="h-8 w-8" />
          <p className="font-body text-sm">{t("empty")}</p>
        </div>
      )}

      {entries.length > 0 && dateRange !== "all" && (() => {
        const maxDays = dateRange === "twoWeeks" ? 13 : 6;

        // Split sleep entries at Berlin midnight for correct per-day aggregation
        const splitMap = splitSleepByDay(entries);

        const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
        // Only include days within the actual fetch range — overnight entries create
        // partial fragments for the day before dateFrom which must be excluded
        const rangeStartDay = dateFrom ? toBerlinDate(dateFrom) : undefined;
        const fullDays = Object.entries(splitMap)
          .filter(([day]) => day !== todayStr)
          .filter(([day]) => !rangeStartDay || day >= rangeStartDay)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, maxDays);

        const n = fullDays.length;
        const fmtMinutes = (mins: number) => {
          const h = Math.floor(mins / 60);
          const m = Math.round(mins % 60);
          return `${h}:${String(m).padStart(2, "0")} h`;
        };
        const segMinutes = (seg: { _splitStart: string; _splitEnd: string }) =>
          (new Date(seg._splitEnd).getTime() - new Date(seg._splitStart).getTime()) / 60000;
        const avgTotalMin = n > 0
          ? fullDays.reduce((s, [, segs]) => s + segs.reduce((a, seg) => a + segMinutes(seg), 0), 0) / n
          : null;
        const avgNightMin = n > 0
          ? fullDays.reduce((s, [, segs]) => s + segs.filter((seg) => seg.sleep_type === "night").reduce((a, seg) => a + segMinutes(seg), 0), 0) / n
          : null;
        const avgNapMin = n > 0
          ? fullDays.reduce((s, [, segs]) => s + segs.filter((seg) => seg.sleep_type === "nap").reduce((a, seg) => a + segMinutes(seg), 0), 0) / n
          : null;

        // Average interval between consecutive sleep entries
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
          avgInterval = `${h}:${String(m).padStart(2, "0")} h`;
        }

        return (
          <ListSummaryBar data-tutorial="sleep-stats">
            <div className="flex gap-1.5">
              {avgTotalMin != null && <MetricPill label={t("avg.hours")} value={fmtMinutes(avgTotalMin)} />}
              {avgNightMin != null && <MetricPill label={t("avg.night")} value={fmtMinutes(avgNightMin)} />}
              {avgNapMin != null && <MetricPill label={t("avg.naps")} value={fmtMinutes(avgNapMin)} />}
              {avgInterval != null && <MetricPill label={t("avg.interval")} value={avgInterval} />}
            </div>
            {entries[0] && (
              <p className="font-body text-xs text-subtext0">
                {t("summary.last_sleep")}: {formatTimeSince(entries[0].end_time ?? entries[0].start_time)}
              </p>
            )}
          </ListSummaryBar>
        );
      })()}

      {entries.map((entry, idx) => (
        <Card key={entry.id} className={`flex flex-col gap-1 p-3${editingId === entry.id ? " overflow-hidden" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-mauve" />
              <span className="font-label text-sm font-medium">
                {entry.sleep_type === "nap" ? t("type.nap") : t("type.night")}
              </span>
            </div>
            <div data-tutorial={idx === 0 ? "sleep-actions" : undefined} className="flex gap-1">
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
            {entry.end_time ? ` - ${formatDateTime(entry.end_time)}` : ""}
          </p>
          <p className="font-body text-sm text-overlay0">
            {t("duration", { duration: formatDuration(entry.duration_minutes) })}
          </p>
          {entry.location && (
            <span className="inline-block font-body text-xs text-lavender bg-lavender/10 px-1.5 py-0.5 rounded mt-1">
              {t(`location.${entry.location}`, { defaultValue: entry.location })}
            </span>
          )}
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
          <TagBadges entryType="sleep" entryId={entry.id} />
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <SleepForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
