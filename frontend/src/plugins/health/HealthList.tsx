/** Health entry list with inline edit. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Activity, Droplets, Pencil, Trash2, Utensils, X } from "lucide-react";
import { Card } from "../../components/Card";
import { ListSummaryBar, MetricPill } from "../../components/ListSummaryBar";
import { TagBadges } from "../../components/TagBadges";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { Select } from "../../components/Select";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteHealth, useHealthEntries, useUpdateHealth } from "../../hooks/useHealth";
import { useFeedingEntries } from "../../hooks/useFeeding";
import { formatDateTime, formatTime, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import { HealthForm } from "./HealthForm";
import type { FeedingType } from "../../api/types";

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "text-green",
  moderate: "text-peach",
  severe: "text-red",
};

function EntryIcon({ type }: { type: string }) {
  if (type === "spit_up") {
    return <Droplets className="h-4 w-4 text-sapphire" />;
  }
  return <Activity className="h-4 w-4 text-mauve" />;
}

export function HealthList() {
  const { t } = useTranslation("health");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();

  const FEEDING_TYPE_LABELS: Record<FeedingType, string> = {
    breast_left: t("feeding_type.breast_left"),
    breast_right: t("feeding_type.breast_right"),
    bottle: t("feeding_type.bottle"),
    solid: t("feeding_type.solid"),
  };

  const TYPE_OPTIONS = [
    { value: "", label: t("type_filter.all") },
    { value: "spit_up", label: t("entry_type.spit_up") },
    { value: "tummy_ache", label: t("entry_type.tummy_ache") },
  ];

  const SEVERITY_LABELS: Record<string, string> = {
    mild: t("severity.mild"),
    moderate: t("severity.moderate"),
    severe: t("severity.severe"),
  };

  const DURATION_LABELS: Record<string, string> = {
    short: t("duration.short"),
    medium: t("duration.medium"),
    long: t("duration.long"),
  };

  const [typeFilter, setTypeFilter] = useState("");
  const [searchParams] = useSearchParams();
  const specificDate = searchParams.get("date");
  const [dateRange, setDateRange] = useState<DateRange>(
    specificDate ? "today" : (searchParams.get("range") as DateRange) ?? "week"
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const deleteMut = useDeleteHealth();
  const updateMut = useUpdateHealth();

  const dateFrom = specificDate ? `${specificDate}T00:00:00Z` : DATE_RANGE_MAP[dateRange];
  const dateTo = specificDate ? `${specificDate}T23:59:59Z` : undefined;

  const { data: entries = [], isLoading } = useHealthEntries({
    child_id: activeChild?.id,
    entry_type: typeFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  });

  // Today's feedings for linking shortcut
  const { data: todayFeedings = [] } = useFeedingEntries({
    child_id: activeChild?.id,
    date_from: startOfTodayISO(),
  });
  const sortedTodayFeedings = [...todayFeedings]
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">{tc("loading")}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Activity className="h-8 w-8" />
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
        const spitUps = entries.filter((e) => e.entry_type === "spit_up");
        const tummyAches = entries.filter((e) => e.entry_type === "tummy_ache");
        return (
          <ListSummaryBar>
            <div className="flex gap-1.5">
              <MetricPill label={t("summary.total")} value={entries.length} />
              {spitUps.length > 0 && (
                <MetricPill
                  label={t("summary.spit_up")}
                  value={<span className="flex items-center justify-center gap-1"><Droplets className="h-3 w-3 text-sapphire" />{spitUps.length}x</span>}
                />
              )}
              {tummyAches.length > 0 && (
                <MetricPill
                  label={t("summary.tummy_ache")}
                  value={<span className="flex items-center justify-center gap-1"><Activity className="h-3 w-3 text-mauve" />{tummyAches.length}x</span>}
                />
              )}
            </div>
            {entries[0] && (
              <p className="font-body text-xs text-subtext0">
                {t("summary.last")}: {formatTime(entries[0].time)}
              </p>
            )}
          </ListSummaryBar>
        );
      })()}

      {entries.map((entry) => (
        <Card key={entry.id} className={`flex flex-col gap-1 p-3${editingId === entry.id ? " overflow-hidden" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EntryIcon type={entry.entry_type} />
              <span className="font-label text-sm font-medium">
                {entry.entry_type === "spit_up" ? t("entry_type.spit_up") : t("entry_type.tummy_ache")}
              </span>
              <span className={`font-label text-xs font-medium ${SEVERITY_COLORS[entry.severity] ?? "text-text"}`}>
                {SEVERITY_LABELS[entry.severity] ?? entry.severity}
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
            {formatDateTime(entry.time)}
          </p>
          {entry.duration && (
            <p className="font-body text-xs text-overlay0">
              {t("label_duration")}: {DURATION_LABELS[entry.duration] ?? entry.duration}
            </p>
          )}
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
          <TagBadges entryType="health" entryId={entry.id} />
          {/* Feeding link row — peach if linked, grey if not + tap to link */}
          {linkingId !== entry.id && (
            <div className="flex mt-1.5">
              <button
                type="button"
                onClick={() => { if (!entry.feeding_id) setLinkingId(entry.id); }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-label transition-colors ${
                  entry.feeding_id != null
                    ? "text-peach bg-peach/10"
                    : "text-overlay0 bg-surface1 hover:bg-surface2"
                }`}
              >
                <Utensils className="h-3.5 w-3.5" />
                {t("feeding")}
              </button>
            </div>
          )}
          {linkingId === entry.id && (
            <div className="border-t border-surface1 mt-2 pt-2">
              <p className="font-label text-xs font-medium text-text mb-2">{t("assign_feeding")}</p>
              <div className="flex flex-col gap-1.5">
                {sortedTodayFeedings.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    disabled={updateMut.isPending}
                    onClick={async () => {
                      await updateMut.mutateAsync({ id: entry.id, data: { feeding_id: f.id } });
                      setLinkingId(null);
                    }}
                    className="min-h-[44px] rounded-[8px] px-3 text-left font-body text-sm bg-surface1 text-text hover:bg-surface2 transition-colors"
                  >
                    <span className="font-medium">
                      {FEEDING_TYPE_LABELS[f.feeding_type as FeedingType] ?? f.feeding_type}
                    </span>
                    {f.amount_ml ? ` ${f.amount_ml} ml` : ""}
                    <span className="text-xs text-subtext0 ml-2">{formatTime(f.start_time)}</span>
                  </button>
                ))}
                {sortedTodayFeedings.length === 0 && (
                  <p className="font-body text-xs text-overlay0">{t("no_feedings_today")}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLinkingId(null)}
                className="mt-2 font-body text-xs text-overlay0 hover:text-text transition-colors"
              >
                {t("cancel_link")}
              </button>
            </div>
          )}
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <HealthForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
