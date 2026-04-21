/** Milestones dashboard widget — active leap + recent milestone. */

import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useLeapStatus, useMilestoneEntries } from "../../hooks/useMilestones";

interface MilestoneWidgetProps {
  childId: number;
}

export function MilestoneWidget({ childId }: MilestoneWidgetProps) {
  const navigate = useNavigate();
  const { data: leapStatus } = useLeapStatus(childId);
  const { data: entries = [] } = useMilestoneEntries({
    child_id: childId,
    completed: true,
  });

  const activeLeap = leapStatus?.active_leap;
  const lastCompleted = entries[0];

  return (
    <Card
      className="h-full cursor-pointer hover:bg-surface1/50 transition-colors"
      onClick={() => navigate("/milestones")}
    >
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-5 w-5 text-peach" />
        <p className="font-label text-sm font-medium text-subtext0">Meilensteine</p>
      </div>

      <div className="flex flex-col gap-1.5">
        {activeLeap ? (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                activeLeap.status === "active_storm" ? "bg-peach" : "bg-green"
              }`}
            />
            <span className="font-body text-sm text-text truncate">
              Sprung {activeLeap.leap_number}
            </span>
            <span className="font-body text-xs text-subtext0">
              {activeLeap.status === "active_storm" ? "Sturm" : "Sonne"}
            </span>
          </div>
        ) : (
          <p className="font-body text-xs text-overlay0">Kein aktiver Sprung</p>
        )}

        {lastCompleted ? (
          <p className="font-body text-xs text-subtext0 truncate">
            Zuletzt: {lastCompleted.title}
          </p>
        ) : (
          <p className="font-body text-xs text-overlay0">Noch keine Meilensteine</p>
        )}

        <p className="font-body text-xs text-overlay0">
          {entries.length} erreicht
        </p>
      </div>
    </Card>
  );
}
