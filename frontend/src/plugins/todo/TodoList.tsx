/** Todo entry list with checkbox toggle and inline edit. */

import { useState } from "react";
import { CheckSquare, Pencil, Square, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { TagBadges } from "../../components/TagBadges";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteTodo, useTodos, useUpdateTodo } from "../../hooks/useTodos";
import { formatDateTime } from "../../lib/dateUtils";
import { TodoForm } from "./TodoForm";

export function TodoList() {
  const { activeChild } = useActiveChild();
  const [showDone, setShowDone] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: entries = [], isLoading } = useTodos(activeChild?.id, showDone);
  const updateMut = useUpdateTodo();
  const deleteMut = useDeleteTodo();

  function toggleDone(id: number, currentDone: boolean) {
    updateMut.mutate({ id, data: { is_done: !currentDone } });
  }

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <CheckSquare className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine ToDos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 font-label text-sm text-subtext0">
        <input
          type="checkbox"
          checked={showDone}
          onChange={(e) => setShowDone(e.target.checked)}
          className="accent-peach"
        />
        Erledigte anzeigen
      </label>

      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-col gap-2">
          <Card className={`flex flex-col gap-1 p-3 ${entry.is_done ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleDone(entry.id, entry.is_done)}
                  className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-green transition-colors"
                >
                  {entry.is_done ? (
                    <CheckSquare className="h-5 w-5 text-green" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <div className="flex flex-col min-w-0">
                  <span className={`font-heading text-base text-text ${entry.is_done ? "line-through" : ""}`}>
                    {entry.title}
                  </span>
                  {entry.details && (
                    <span className="font-body text-xs text-subtext0 truncate">
                      {entry.details}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${editingId === entry.id ? "text-peach" : "text-subtext0 hover:text-text"} transition-colors`}
                >
                  {editingId === entry.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm("ToDo loeschen?")) deleteMut.mutate(entry.id);
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-red transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {entry.due_date && (
              <p className="font-body text-xs text-overlay0 ml-11">
                Faellig: {formatDateTime(entry.due_date)}
              </p>
            )}
            {entry.completed_at && (
              <p className="font-body text-xs text-green ml-11">
                Erledigt: {formatDateTime(entry.completed_at)}
              </p>
            )}
            <div className="ml-11">
              <TagBadges entryType="todo" entryId={entry.id} />
            </div>
          </Card>
          {editingId === entry.id && (
            <Card className="border border-mauve/20">
              <TodoForm entry={entry} onDone={() => setEditingId(null)} />
              <div className="mt-3 pt-3 border-t border-surface1">
                <TagSelector entryType="todo" entryId={entry.id} />
              </div>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}
