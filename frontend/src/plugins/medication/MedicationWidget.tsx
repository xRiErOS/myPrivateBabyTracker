/** Medication dashboard widget — shows today's medications (compact). */

import { Pill } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useMedicationEntries } from "../../hooks/useMedication";

export function MedicationWidget() {
  const navigate = useNavigate();
  const { t } = useTranslation("medication");
  const { activeChild } = useActiveChild();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const { data: entries = [] } = useMedicationEntries({
    child_id: activeChild?.id,
    date_from: todayStart,
  });

  return (
    <Card
      className="h-full flex flex-col gap-1 p-3 cursor-pointer active:bg-surface1 transition-colors"
      onClick={() => navigate("/medication")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Pill className="h-3.5 w-3.5 text-overlay0" />
          <span className="font-label text-xs text-overlay0">{t("widget_title")}</span>
        </div>
        {entries.length > 0 && (
          <span className="font-body text-xs text-subtext0 bg-surface1 px-1.5 py-0.5 rounded-full">
            {entries.length}
          </span>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {entries.slice(0, 3).map((entry) => (
            <div key={entry.id} className="flex items-baseline justify-between gap-1 leading-tight">
              <span className="font-body text-xs text-text truncate">{entry.medication_name}</span>
              {entry.dose && (
                <span className="font-body text-[10px] text-subtext0 shrink-0">{entry.dose}</span>
              )}
            </div>
          ))}
          {entries.length > 3 && (
            <span className="font-body text-[10px] text-subtext0">
              +{entries.length - 3} {t("widget_more")}
            </span>
          )}
        </div>
      ) : (
        <p className="font-body text-xs text-overlay0">{t("widget_empty")}</p>
      )}
    </Card>
  );
}
