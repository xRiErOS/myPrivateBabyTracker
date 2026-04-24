/** Checkup dashboard widget — shows next upcoming U-Untersuchung. */

import { ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useNextCheckup } from "../../hooks/useCheckup";

export function CheckupWidget() {
  const navigate = useNavigate();
  const { t } = useTranslation("checkup");
  const { activeChild } = useActiveChild();
  const { data: next } = useNextCheckup(activeChild?.id);

  return (
    <Card
      className="h-full flex flex-col gap-2 p-3 cursor-pointer active:bg-surface1 transition-colors"
      onClick={() => navigate("/checkup")}
    >
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">{t("widget_title")}</span>
      </div>

      {next ? (
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-sm font-semibold text-text">
            {next.checkup_type.name}
          </span>
          <span className={`font-body text-xs ${next.is_overdue ? "text-red" : next.is_due ? "text-peach" : "text-subtext0"}`}>
            {next.is_overdue
              ? t("overdue")
              : next.is_due
                ? t("due_now")
                : next.days_until_due != null
                  ? t("days_until", { days: next.days_until_due })
                  : ""}
          </span>
        </div>
      ) : (
        <p className="font-body text-sm text-green">{t("all_done")}</p>
      )}
    </Card>
  );
}
