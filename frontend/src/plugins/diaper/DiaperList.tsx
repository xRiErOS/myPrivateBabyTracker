/** Diaper entry list with inline edit. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Droplets, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { ListSummaryBar, MetricPill } from "../../components/ListSummaryBar";
import { TagBadges } from "../../components/TagBadges";
import { Select } from "../../components/Select";
import { DateRangeFilter, type DateRange } from "../../components/DateRangeFilter";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteDiaper, useDiaperEntries } from "../../hooks/useDiaper";
import { formatDateTime, formatTimeSince, startOfTodayISO, daysAgoISO } from "../../lib/dateUtils";
import { isWet } from "../../lib/timelineUtils";
import { DiaperForm } from "./DiaperForm";
import type { DiaperEntry, DiaperType } from "../../api/types";

const DATE_RANGE_MAP: Record<DateRange, string | undefined> = {
  today: startOfTodayISO(),
  week: daysAgoISO(7),
  all: undefined,
};

function DiaperBar({ diapers }: { diapers: DiaperEntry[] }) {
  const { t } = useTranslation("diaper");
  const total = diapers.length;
  if (total === 0) return null;

  const wet = diapers.filter(isWet).length;
  const dirty = diapers.filter((d) => d.diaper_type === "dirty").length;
  const mixed = diapers.filter((d) => d.diaper_type === "mixed").length;
  const dry = total - wet - dirty - mixed;

  const segments = [
    { count: wet, color: "bg-sapphire", label: t("type.wet") },
    { count: dirty, color: "bg-peach", label: t("type.dirty") },
    { count: mixed, color: "bg-mauve", label: t("change.mixed") },
    { count: dry, color: "bg-overlay0", label: t("type.dry") },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden">
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

export function DiaperList() {
  const { t } = useTranslation("diaper");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();

  const TYPE_OPTIONS = [
    { value: "", label: t("type_filter.all") },
    { value: "wet", label: t("type.wet") },
    { value: "dirty", label: t("type.dirty") },
    { value: "mixed", label: t("type.mixed") },
    { value: "dry", label: t("type.dry") },
  ];

  const TYPE_LABELS: Record<DiaperType, string> = {
    wet: t("type.wet"),
    dirty: t("type.dirty"),
    mixed: t("type.mixed"),
    dry: t("type.dry"),
  };

  const CHANGE_LABELS: Record<DiaperType, string> = {
    wet: t("type.wet"),
    dirty: t("type.dirty"),
    mixed: t("change.mixed"),
    dry: t("type.dry"),
  };
  const [typeFilter, setTypeFilter] = useState("");
  const [searchParams] = useSearchParams();
  const specificDate = searchParams.get("date");
  const [dateRange, setDateRange] = useState<DateRange>(
    specificDate ? "today" : (searchParams.get("range") as DateRange) ?? "week"
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMut = useDeleteDiaper();

  const dateFrom = specificDate ? `${specificDate}T00:00:00Z` : DATE_RANGE_MAP[dateRange];
  const dateTo = specificDate ? `${specificDate}T23:59:59Z` : undefined;

  const { data: entries = [], isLoading } = useDiaperEntries({
    child_id: activeChild?.id,
    diaper_type: typeFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  });

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">{tc("loading")}</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Droplets className="h-8 w-8" />
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

      {entries.length > 0 && (
        <ListSummaryBar>
          <div className="flex gap-1.5">
            <MetricPill label={t("summary.total")} value={entries.length} />
            <MetricPill label={t("type.wet")} value={entries.filter(isWet).length} />
            <MetricPill label={t("type.dirty")} value={entries.filter((e) => e.diaper_type === "dirty").length} />
            <MetricPill label={t("change.mixed")} value={entries.filter((e) => e.diaper_type === "mixed").length} />
          </div>
          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-subtext0">
              {t("type.dry")}: {entries.filter((e) => e.diaper_type === "dry").length}
            </p>
            {entries[0] && (
              <p className="font-body text-xs text-subtext0">
                {t("summary.last")}: {CHANGE_LABELS[entries[0].diaper_type] ?? entries[0].diaper_type} — {formatTimeSince(entries[0].time)}
              </p>
            )}
          </div>
          <DiaperBar diapers={entries} />
          {entries.some((e) => e.has_rash) && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red" />
              <span className="font-body text-xs text-red font-medium">{t("rash_observed")}</span>
            </div>
          )}
        </ListSummaryBar>
      )}

      {entries.map((entry) => (
        <Card key={entry.id} className={`flex flex-col gap-1 p-3${editingId === entry.id ? " overflow-hidden" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue" />
              <span className="font-label text-sm font-medium">
                {TYPE_LABELS[entry.diaper_type] ?? entry.diaper_type}
              </span>
              {entry.has_rash && (
                <span className="flex items-center gap-1 text-red">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-label text-xs">{t("rash")}</span>
                </span>
              )}
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
          {entry.color && (
            <p className="font-body text-sm text-overlay0">{t("color")}: {entry.color}</p>
          )}
          {entry.notes && (
            <p className="font-body text-xs text-overlay0 mt-1">{entry.notes}</p>
          )}
          <TagBadges entryType="diaper" entryId={entry.id} />
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <DiaperForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
