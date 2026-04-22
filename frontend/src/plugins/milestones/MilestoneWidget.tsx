/** Milestones dashboard widget — active leap + recent milestone + progress. */

import { useTranslation } from "react-i18next";
import { CloudLightning, CloudSun, Star, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useLeapStatus, useMilestoneEntries, useSuggestions } from "../../hooks/useMilestones";

interface MilestoneWidgetProps {
  childId: number;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

export function MilestoneWidget({ childId }: MilestoneWidgetProps) {
  const { t } = useTranslation("milestones");
  const navigate = useNavigate();
  const { data: leapStatus } = useLeapStatus(childId);
  const { data: entries = [] } = useMilestoneEntries({
    child_id: childId,
    completed: true,
  });
  const { data: suggestions = [] } = useSuggestions(childId);

  const activeLeap = leapStatus?.active_leap;
  const lastCompleted = entries[0];

  // Find next upcoming leap
  const upcomingLeap = leapStatus?.leaps.find((l) => l.status === "upcoming") ?? null;
  const countdown = upcomingLeap ? daysUntil(upcomingLeap.storm_start_date) : null;

  // Suggestions progress
  const total = suggestions.length;
  const completed = suggestions.filter((s) => s.is_completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Determine status for icon/colors
  const isStorm = activeLeap?.status === "active_storm";
  const isSun = activeLeap?.status === "active_sun";
  const hasUpcoming = !activeLeap && !!upcomingLeap;
  const isCalm = !activeLeap && !upcomingLeap;

  function StatusIcon() {
    if (isStorm) return <CloudLightning className="h-4 w-4 text-peach" />;
    if (isSun) return <Sun className="h-4 w-4 text-green" />;
    if (hasUpcoming) return <CloudSun className="h-4 w-4 text-sapphire" />;
    return <Sun className="h-4 w-4 text-green" />;
  }

  return (
    <Card
      className="h-full cursor-pointer hover:bg-surface1/50 transition-colors"
      onClick={() => navigate("/milestones")}
    >
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-5 w-5 text-peach" />
        <p className="font-label text-sm font-medium text-subtext0">{t("widget_title")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Leap status line */}
        <div className="flex items-center gap-2">
          <StatusIcon />
          {activeLeap ? (
            <span className={`font-body text-sm truncate ${isStorm ? "text-peach" : "text-green"}`}>
              {isStorm ? t("widget_leap_storm", { number: activeLeap.leap_number }) : t("widget_leap_sun", { number: activeLeap.leap_number })}
            </span>
          ) : (
            <span className={`font-body text-sm ${hasUpcoming ? "text-sapphire" : "text-green"}`}>
              {isCalm ? t("widget_no_leap") : t("widget_next_leap", { number: upcomingLeap!.leap_number })}
            </span>
          )}
        </div>

        {/* Countdown for upcoming */}
        {!activeLeap && countdown !== null && (
          <p className="font-body text-xs text-sapphire">
            {t("widget_next_leap_in_days", { count: countdown })}
          </p>
        )}

        {/* Suggestions progress bar */}
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-surface1 rounded-full overflow-hidden">
              <div
                className="h-full bg-peach rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-body text-xs text-subtext0">
              {completed}/{total}
            </span>
          </div>
        )}

        {/* Last completed milestone */}
        {lastCompleted ? (
          <p className="font-body text-xs text-subtext0 truncate">
            {t("widget_last_completed", { title: lastCompleted.title })}
          </p>
        ) : (
          <p className="font-body text-xs text-overlay0">{t("widget_no_milestones_yet")}</p>
        )}
      </div>
    </Card>
  );
}
