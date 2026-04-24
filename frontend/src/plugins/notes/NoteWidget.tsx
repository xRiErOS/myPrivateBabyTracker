/** Notes dashboard widget — shows latest/pinned note. */

import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useNotes } from "../../hooks/useNotes";

export function NoteWidget() {
  const navigate = useNavigate();
  const { t } = useTranslation("notes");
  const { activeChild } = useActiveChild();
  const { data: notes = [] } = useNotes(activeChild?.id);

  // Show pinned note or latest
  const display = notes.find((n) => n.pinned) ?? notes[0];

  return (
    <Card
      className="h-full flex flex-col gap-2 p-3 cursor-pointer active:bg-surface1 transition-colors"
      onClick={() => navigate("/notes")}
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-overlay0" />
        <span className="font-label text-xs text-overlay0">{t("widget_title")}</span>
      </div>

      {display ? (
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-sm font-semibold text-text truncate">
            {display.title}
          </span>
          <span className="font-body text-xs text-subtext0 line-clamp-2">
            {display.content}
          </span>
        </div>
      ) : (
        <p className="font-body text-sm text-overlay0">{t("empty")}</p>
      )}
    </Card>
  );
}
