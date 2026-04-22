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
import { formatDateTime, formatDuration, formatTimeSince, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import { SleepForm } from "./SleepForm";

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

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

  const dateFrom = specificDate ? `${specificDate}T00:00:00Z` : DATE_RANGE_MAP[dateRange];
  const dateTo = specificDate ? `${specificDate}T23:59:59Z` : undefined;

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

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Moon className="h-8 w-8" />
        <p className="font-body text-sm">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      <Select
        label="Filter"
        options={TYPE_OPTIONS}
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
      />

      {entries.length > 0 && (() => {
        const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
        const napCount = entries.filter((e) => e.sleep_type === "nap").length;
        const nightCount = entries.filter((e) => e.sleep_type === "night").length;
        return (
          <ListSummaryBar>
            <div className="flex gap-1.5">
              <MetricPill label={t("summary.total")} value={formatDuration(totalMinutes)} />
              <MetricPill label={t("summary.sessions")} value={entries.length} />
              {napCount > 0 && <MetricPill label={t("type.nap")} value={napCount} />}
              {nightCount > 0 && <MetricPill label={t("summary.night")} value={nightCount} />}
            </div>
            {entries[0] && (
              <p className="font-body text-xs text-subtext0">
                {t("summary.last_sleep")}: {formatTimeSince(entries[0].end_time ?? entries[0].start_time)}
              </p>
            )}
          </ListSummaryBar>
        );
      })()}

      {entries.map((entry) => (
        <Card key={entry.id} className={`flex flex-col gap-1 p-3${editingId === entry.id ? " overflow-hidden" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-mauve" />
              <span className="font-label text-sm font-medium">
                {entry.sleep_type === "nap" ? t("type.nap") : t("type.night")}
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
            {entry.end_time ? ` - ${formatDateTime(entry.end_time)}` : ""}
          </p>
          <p className="font-body text-sm text-overlay0">
            {t("duration")}: {formatDuration(entry.duration_minutes)}
          </p>
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
