/** MotherHealthList — chronological postpartum / midwife notes (MBT-109). */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HeartPulse, Pencil, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { MarkdownDisplay } from "../../components/MarkdownEditor";
import { useActiveChild } from "../../context/ChildContext";
import {
  useDeleteMotherHealthEntry,
  useMotherHealthEntries,
} from "../../hooks/useMotherHealth";
import { MotherHealthForm } from "./MotherHealthForm";

export function MotherHealthList() {
  const { t } = useTranslation("motherhealth");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const { data: entries = [], isLoading } = useMotherHealthEntries(activeChild?.id);
  const deleteMut = useDeleteMotherHealthEntry();
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
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
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {editingId !== entry.id && (
                <>
                  <div className="text-xs text-subtext0 mb-1.5">
                    {new Date(entry.created_at).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <MarkdownDisplay content={entry.content} />
                </>
              )}
            </div>
            <div className="flex gap-1 ml-2">
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
