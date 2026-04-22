/** Tummy time dashboard widget -- shows today's total duration. */

import { useTranslation } from "react-i18next";
import { Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useTummyTimeEntries } from "../../hooks/useTummyTime";
import { startOfTodayISO, formatDuration } from "../../lib/dateUtils";

export function TummyTimeWidget() {
  const { t } = useTranslation("tummytime");
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: entries = [] } = useTummyTimeEntries({
    child_id: activeChild?.id,
    date_from: startOfTodayISO(),
  });

  const todayEntries = entries.filter((e) => e.end_time != null);
  const totalMinutes = todayEntries.reduce(
    (sum, e) => sum + (e.duration_minutes ?? 0),
    0,
  );
  const sessionCount = todayEntries.length;

  return (
    <Card
      className="h-full flex flex-col gap-2 p-3 cursor-pointer active:bg-surface1 transition-colors"
      onClick={() => navigate("/tummy-time")}
    >
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">{t("widget_title")}</span>
      </div>

      <span className="font-heading text-lg font-semibold text-text">
        {formatDuration(totalMinutes)}
      </span>

      <p className="font-body text-xs text-overlay0">
        {sessionCount === 0
          ? t("no_session")
          : sessionCount === 1
            ? t("session_today")
            : t("sessions_today", { count: sessionCount })}
      </p>
    </Card>
  );
}
