/** Health dashboard widget — today's entries count + last entry. */

import { useTranslation } from "react-i18next";
import { Activity, Droplets } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useHealthEntries } from "../../hooks/useHealth";
import { formatTime, startOfTodayISO } from "../../lib/dateUtils";

interface HealthWidgetProps {
  childId: number;
}

export function HealthWidget({ childId }: HealthWidgetProps) {
  const { t } = useTranslation("health");
  const navigate = useNavigate();
  const { data: entries = [], isLoading } = useHealthEntries({
    child_id: childId,
    date_from: startOfTodayISO(),
  });

  const spitUps = entries.filter((e) => e.entry_type === "spit_up");
  const tummyAches = entries.filter((e) => e.entry_type === "tummy_ache");
  const lastEntry = entries[0];

  return (
    <Card
      className="h-full cursor-pointer hover:bg-surface1/50 transition-colors"
      onClick={() => navigate("/health?range=today")}
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-mauve" />
        <p className="font-label text-sm font-medium text-subtext0">{t("widget_title")}</p>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-subtext0">{t("loading")}</p>
      ) : entries.length === 0 ? (
        <p className="font-body text-sm text-overlay0">{t("no_entries_today")}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            {spitUps.length > 0 && (
              <div className="flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-sapphire" />
                <span className="font-body text-sm">{spitUps.length}x</span>
              </div>
            )}
            {tummyAches.length > 0 && (
              <div className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-mauve" />
                <span className="font-body text-sm">{tummyAches.length}x</span>
              </div>
            )}
          </div>
          {lastEntry && (
            <p className="font-body text-xs text-subtext0">
              {t("last_entry", { time: formatTime(lastEntry.time) })}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
