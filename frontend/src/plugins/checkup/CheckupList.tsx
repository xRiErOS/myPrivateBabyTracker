/** Checkup list — shows completed and upcoming U-Untersuchungen. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Circle, ClipboardCheck, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useCheckupEntries, useCheckupTypes, useCreateCheckup, useDeleteCheckup } from "../../hooks/useCheckup";
import { CheckupForm } from "./CheckupForm";

function formatWeight(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}

/**
 * Calculate calendar date range for a U-Untersuchung based on birth_date.
 * Uses estimated_birth_date (corrected age) if available for premature babies.
 */
function getCheckupDateRange(
  birthDate: string,
  estimatedBirthDate: string | null | undefined,
  minWeeks: number,
  maxWeeks: number,
): string {
  const refDate = new Date(estimatedBirthDate ?? birthDate);
  const MS_PER_WEEK = 7 * 24 * 3600 * 1000;
  const minDate = new Date(refDate.getTime() + minWeeks * MS_PER_WEEK);
  const maxDate = new Date(refDate.getTime() + maxWeeks * MS_PER_WEEK);
  const fmt = (d: Date) =>
    d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
  return `${fmt(minDate)} – ${fmt(maxDate)}`;
}

export function CheckupList() {
  const { t } = useTranslation("checkup");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const { data: entries = [], isLoading } = useCheckupEntries(activeChild?.id);
  const { data: types = [] } = useCheckupTypes();
  const deleteMut = useDeleteCheckup();
  const createMut = useCreateCheckup();
  const [editingId, setEditingId] = useState<number | null>(null);

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">{tc("loading")}</p>;
  }

  // Build complete list: all types with their entries
  const completedTypeIds = new Set(entries.filter((e) => e.is_completed).map((e) => e.checkup_type_id));

  return (
    <div className="flex flex-col gap-3">
      {types.map((ct) => {
        const entry = entries.find((e) => e.checkup_type_id === ct.id);
        const isCompleted = completedTypeIds.has(ct.id);

        return (
          <Card key={ct.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green mt-0.5 shrink-0" />
                ) : (
                  <button
                    type="button"
                    title={t("mark_done")}
                    disabled={createMut.isPending}
                    onClick={() => {
                      createMut.mutate({
                        child_id: activeChild!.id,
                        checkup_type_id: ct.id,
                        date: new Date().toISOString().slice(0, 10),
                        is_completed: true,
                      });
                    }}
                    className="mt-0.5 shrink-0 rounded text-overlay0 hover:text-green transition-colors"
                    style={{ minWidth: 20, minHeight: 20 }}
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <h3 className="font-headline text-sm font-semibold text-text">
                    {ct.display_name}
                  </h3>
                  {ct.description && (
                    <p className="font-body text-xs text-subtext0 mt-0.5">
                      {ct.description}
                    </p>
                  )}
                  <p className="font-body text-xs text-overlay0 mt-1">
                    {t("recommended_age")}: {ct.recommended_age_weeks_min}-{ct.recommended_age_weeks_max} {t("weeks")}
                    {activeChild?.birth_date && (
                      <span className="ml-1 text-subtext0">
                        ({getCheckupDateRange(
                          activeChild.birth_date,
                          activeChild.estimated_birth_date,
                          ct.recommended_age_weeks_min,
                          ct.recommended_age_weeks_max,
                        )})
                      </span>
                    )}
                  </p>
                  {entry && (
                    <div className="mt-2 space-y-1">
                      <p className="font-body text-xs text-text">
                        {t("date_label")}: {new Date(entry.date).toLocaleDateString("de-DE")}
                      </p>
                      {entry.doctor && (
                        <p className="font-body text-xs text-subtext0">
                          {t("doctor_label")}: {entry.doctor}
                        </p>
                      )}
                      <div className="flex gap-3 text-xs text-subtext0">
                        {entry.weight_grams && <span>{formatWeight(entry.weight_grams)}</span>}
                        {entry.height_cm && <span>{entry.height_cm} cm</span>}
                        {entry.head_circumference_cm && <span>{t("head_short")}: {entry.head_circumference_cm} cm</span>}
                      </div>
                      {entry.notes && (
                        <p className="font-body text-xs text-overlay0">{entry.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {entry && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                    className={`rounded p-1.5 ${editingId === entry.id ? "text-peach bg-peach/10" : "text-overlay0 hover:bg-surface1"}`}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    {editingId === entry.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { if (confirm(t("confirm_delete"))) deleteMut.mutate(entry.id); }}
                    className="rounded p-1.5 text-overlay0 hover:bg-red/10 hover:text-red"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {entry && editingId === entry.id && (
              <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
                <CheckupForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
              </div>
            )}
          </Card>
        );
      })}

      {/* Show entries without matching types (edge case) */}
      {entries
        .filter((e) => !types.some((ct) => ct.id === e.checkup_type_id))
        .map((entry) => (
          <Card key={entry.id} className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green shrink-0" />
              <div>
                <h3 className="font-headline text-sm font-semibold text-text">
                  {entry.checkup_type_display_name}
                </h3>
                <p className="font-body text-xs text-text">
                  {new Date(entry.date).toLocaleDateString("de-DE")}
                </p>
              </div>
            </div>
          </Card>
        ))}

      {types.length === 0 && entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
          <ClipboardCheck className="h-8 w-8" />
          <p className="font-body text-sm">{t("empty")}</p>
        </div>
      )}
    </div>
  );
}
