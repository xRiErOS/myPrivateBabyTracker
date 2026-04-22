/** ToDo dashboard widget — open count + progress bar. */

import { useTranslation } from "react-i18next";
import { CheckSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useTodos } from "../../hooks/useTodos";
import { useActiveChild } from "../../context/ChildContext";

export function TodoWidget() {
  const { t } = useTranslation("todo");
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: entries = [], isLoading } = useTodos(activeChild?.id);

  const open = entries.filter((e) => !e.completed_at);
  const done = entries.filter((e) => e.completed_at);
  const total = entries.length;
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  return (
    <Card
      className="h-full cursor-pointer hover:bg-surface1/50 transition-colors"
      onClick={() => navigate("/todo")}
    >
      <div className="flex items-center gap-2 mb-3">
        <CheckSquare className="h-5 w-5 text-green" />
        <p className="font-label text-sm font-medium text-subtext0">{t("widget_title")}</p>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-subtext0">{t("widget_loading")}</p>
      ) : total === 0 ? (
        <p className="font-body text-sm text-overlay0">{t("widget_no_tasks")}</p>
      ) : open.length === 0 ? (
        <p className="font-body text-sm text-green">{t("widget_all_done")}</p>
      ) : open.length === 1 ? (
        <p className="font-body text-sm text-text truncate">{open[0].title}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm">
            <span className="font-semibold text-peach">{open.length}</span>
            <span className="text-subtext0"> {t("widget_open_count")}</span>
          </p>
          {/* Progress bar */}
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-green rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-body text-xs text-subtext0">{t("widget_done_pct", { pct })}</p>
        </div>
      )}
    </Card>
  );
}
