/** Note list — shows shared notes with pin toggle and inline edit. */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Pencil, Pin, PinOff, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { MarkdownDisplay } from "../../components/MarkdownEditor";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteNote, useNotes, useUpdateNote } from "../../hooks/useNotes";
import { NoteForm } from "./NoteForm";

export function NoteList() {
  const { t } = useTranslation("notes");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const { data: notes = [], isLoading } = useNotes(activeChild?.id);
  const deleteMut = useDeleteNote();
  const updateMut = useUpdateNote();
  const [editingId, setEditingId] = useState<number | null>(null);

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">{tc("loading")}</p>;
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <FileText className="h-8 w-8" />
        <p className="font-body text-sm">{t("empty")}</p>
      </div>
    );
  }

  // Sort: pinned first, then by updated_at desc
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updated_at.localeCompare(a.updated_at);
  });

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((note) => (
        <Card key={note.id} className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {note.pinned && <Pin className="h-3.5 w-3.5 text-peach shrink-0" />}
                <h3 className="font-headline text-sm font-semibold text-text truncate">
                  {note.title}
                </h3>
              </div>
              <div className="mt-1">
                <MarkdownDisplay
                  content={note.content}
                  onContentChange={(updated) =>
                    updateMut.mutate({ id: note.id, data: { content: updated } })
                  }
                />
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-subtext0">
                {note.author_name && <span>{note.author_name}</span>}
                <span>{new Date(note.updated_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => updateMut.mutate({ id: note.id, data: { pinned: !note.pinned } })}
                className={`rounded p-1.5 ${note.pinned ? "text-peach" : "text-overlay0"} hover:bg-surface1`}
                style={{ minWidth: 44, minHeight: 44 }}
                title={note.pinned ? t("unpin") : t("pin")}
              >
                {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setEditingId(editingId === note.id ? null : note.id)}
                className={`rounded p-1.5 ${editingId === note.id ? "text-peach bg-peach/10" : "text-overlay0 hover:bg-surface1"}`}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {editingId === note.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <button
                onClick={() => { if (confirm(t("confirm_delete"))) deleteMut.mutate(note.id); }}
                className="rounded p-1.5 text-overlay0 hover:bg-red/10 hover:text-red"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {editingId === note.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <NoteForm entry={note} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
