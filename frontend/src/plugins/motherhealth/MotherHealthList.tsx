/** MotherHealthList — chronologische Wochenbett-Einträge mit Typ-Badges + Filter. */

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HeartPulse, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import {
  useDeleteMotherHealthEntry,
  useMotherHealthEntries,
} from "../../hooks/useMotherHealth";
import type { EntryType, MotherHealthEntry } from "../../api/motherhealth";
import { MotherHealthForm } from "./MotherHealthForm";

const TYPE_ORDER: EntryType[] = ["lochia", "pain", "mood", "note"];

const TYPE_BADGE: Record<EntryType, string> = {
  lochia: "bg-mauve/15 text-mauve",
  pain: "bg-red/15 text-red",
  mood: "bg-sapphire/15 text-sapphire",
  note: "bg-surface1 text-subtext0",
};

export function MotherHealthList() {
  const { t } = useTranslation("motherhealth");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [filter, setFilter] = useState<EntryType | "all">("all");
  const { data: entries = [], isLoading } = useMotherHealthEntries(
    activeChild?.id,
    filter === "all" ? undefined : filter,
  );
  const deleteMut = useDeleteMotherHealthEntry();
  const [editingId, setEditingId] = useState<number | null>(null);

  const filterTabs = useMemo(
    () =>
      [
        { key: "all", label: t("filter_all") },
        ...TYPE_ORDER.map((k) => ({ key: k, label: t(`type_${k}`) })),
      ] as { key: EntryType | "all"; label: string }[],
    [t],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Filter-Tabs */}
      <div
        className="flex gap-1 rounded-lg bg-surface0 p-1 overflow-x-auto"
        role="tablist"
      >
        {filterTabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 min-w-[72px] rounded-md px-3 py-2 font-label text-sm transition-colors ${
                active
                  ? "bg-peach text-ground font-semibold"
                  : "text-subtext0 hover:bg-surface1"
              }`}
              style={{ minHeight: 44 }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p className="font-body text-sm text-overlay0">{tc("loading")}</p>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
          <HeartPulse className="h-8 w-8" />
          <p className="font-body text-sm">{t("empty")}</p>
        </div>
      )}

      {entries.map((entry) => (
        <Card key={entry.id} className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editingId !== entry.id && (
                <>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 font-label text-xs font-semibold ${TYPE_BADGE[entry.entry_type]}`}
                    >
                      {t(`type_${entry.entry_type}`)}
                    </span>
                    <span className="text-xs text-subtext0">
                      {new Date(entry.created_at).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <EntrySummary entry={entry} />
                  {entry.notes && (
                    <p className="mt-1.5 font-body text-sm text-text whitespace-pre-wrap">
                      {entry.notes}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() =>
                  setEditingId(editingId === entry.id ? null : entry.id)
                }
                className={`rounded p-1.5 ${
                  editingId === entry.id
                    ? "text-peach bg-peach/10"
                    : "text-overlay0 hover:bg-surface1"
                }`}
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label={tc("edit")}
              >
                {editingId === entry.id ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm(t("confirm_delete"))) deleteMut.mutate(entry.id);
                }}
                className="rounded p-1.5 text-overlay0 hover:bg-red/10 hover:text-red"
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label={tc("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <MotherHealthForm
                entry={entry}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary pro Eintragstyp
// ---------------------------------------------------------------------------

function EntrySummary({ entry }: { entry: MotherHealthEntry }) {
  const { t } = useTranslation("motherhealth");
  if (entry.entry_type === "lochia") {
    const parts = [
      entry.lochia_amount && t(`amount_${entry.lochia_amount}`),
      entry.lochia_color && t(`color_${entry.lochia_color}`),
      entry.lochia_smell && t(`smell_${entry.lochia_smell}`),
      entry.lochia_clots ? t("clots_yes") : null,
    ].filter(Boolean);
    return (
      <p className="font-body text-sm text-subtext0">
        {parts.join(" · ")}
      </p>
    );
  }
  if (entry.entry_type === "pain") {
    return (
      <ul className="font-body text-sm text-subtext0 space-y-0.5">
        <li>
          {t("pain_perineum")}:{" "}
          <span className="font-semibold text-text tabular-nums">
            {entry.pain_perineum?.toFixed(1)}
          </span>
        </li>
        <li>
          {t("pain_abdominal")}:{" "}
          <span className="font-semibold text-text tabular-nums">
            {entry.pain_abdominal?.toFixed(1)}
          </span>
        </li>
        <li>
          {t("pain_breast")}:{" "}
          <span className="font-semibold text-text tabular-nums">
            {entry.pain_breast?.toFixed(1)}
          </span>
        </li>
        <li>
          {t("pain_urination")}:{" "}
          <span className="font-semibold text-text tabular-nums">
            {entry.pain_urination?.toFixed(1)}
          </span>
        </li>
      </ul>
    );
  }
  if (entry.entry_type === "mood") {
    return (
      <p className="font-body text-sm text-subtext0">
        {t("mood_level")}: <strong className="text-text">{entry.mood_level}/5</strong>
        {" · "}
        {t("wellbeing")}: <strong className="text-text">{entry.wellbeing}/5</strong>
        {" · "}
        {t("exhaustion")}: <strong className="text-text">{entry.exhaustion}/5</strong>
        {entry.activity_level && (
          <>
            {" · "}
            {t(`activity_${entry.activity_level}`)}
          </>
        )}
      </p>
    );
  }
  return null;
}
