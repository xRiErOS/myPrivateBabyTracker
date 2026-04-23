/** Todo entry list with checkbox, search, smart done filter, and inline edit. */

import { useMemo, useState } from "react";
import { CalendarClock, CheckSquare, Pencil, Search, Square, Trash2, X } from "lucide-react";
import { Card } from "../../components/Card";
import { TagBadges } from "../../components/TagBadges";
import { useActiveChild } from "../../context/ChildContext";
import { useDeleteTodo, useTodos, useUpdateTodo } from "../../hooks/useTodos";
import { formatDateTime } from "../../lib/dateUtils";
import { TodoForm } from "./TodoForm";

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function nextDay(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function nextWeekday(targetDay: number): string {
  const d = new Date();
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString();
}

export function TodoList() {
  const { activeChild } = useActiveChild();
  const [showAllDone, setShowAllDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: entries = [], isLoading } = useTodos(activeChild?.id, true);
  const updateMut = useUpdateTodo();
  const deleteMut = useDeleteTodo();

  function toggleDone(id: number, currentDone: boolean) {
    updateMut.mutate({ id, data: { is_done: !currentDone } });
  }

  function postpone(id: number, newDate: string) {
    updateMut.mutate({ id, data: { due_date: newDate } });
  }

  const filtered = useMemo(() => {
    let items = entries;
    if (!showAllDone) {
      items = items.filter(
        (e) => !e.is_done || (e.completed_at && isToday(e.completed_at))
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.details && e.details.toLowerCase().includes(q))
      );
    }
    return items;
  }, [entries, showAllDone, searchQuery]);

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <CalendarClock className="h-8 w-8" />
        <p className="font-body text-sm">Noch keine ToDos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-overlay0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ToDos durchsuchen..."
          className="w-full rounded-lg border border-surface2 bg-ground pl-9 pr-3 py-2 font-body text-base text-text placeholder:text-overlay0 focus:border-mauve focus:outline-none"
        />
      </div>

      {/* Toggle: show all done */}
      <div className="flex items-center justify-between">
        <span className="font-label text-sm text-subtext0">Alle erledigten anzeigen</span>
        <button
          type="button"
          role="switch"
          aria-checked={showAllDone}
          onClick={() => setShowAllDone(!showAllDone)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showAllDone ? "bg-green" : "bg-surface2"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-ground transition-transform ${
              showAllDone ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="font-body text-sm text-overlay0 text-center py-4">
          {searchQuery ? "Keine Treffer" : "Keine offenen ToDos"}
        </p>
      )}

      {filtered.map((entry) => (
        <Card key={entry.id} className={`flex flex-col gap-1 p-3${entry.is_done ? " opacity-60" : ""}${editingId === entry.id ? " overflow-hidden" : ""}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggleDone(entry.id, entry.is_done)}
                className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-green transition-colors"
              >
                {entry.is_done ? (
                  <CheckSquare className="h-6 w-6 text-green" />
                ) : (
                  <Square className="h-6 w-6" />
                )}
              </button>
              <div className="flex flex-col min-w-0 break-words w-full">
                <span className={`font-heading text-base text-text break-words ${entry.is_done ? "line-through" : ""}`}>
                  {entry.title}
                </span>
                {entry.details && editingId !== entry.id && (
                  <p className="font-body text-xs text-subtext0 whitespace-pre-wrap break-words mt-0.5">
                    {entry.details}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${editingId === entry.id ? "text-peach" : "text-subtext0 hover:text-text"} transition-colors`}
              >
                {editingId === entry.id ? <X className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
              </button>
              <button
                onClick={() => {
                  if (confirm("ToDo loeschen?")) deleteMut.mutate(entry.id);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-red transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* Due date + postpone buttons (always visible for open entries) */}
          <div className="flex items-center gap-2 ml-11 flex-wrap">
            {entry.due_date && (() => {
              const due = new Date(entry.due_date);
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
              const isOverdue = dueDay < today && !entry.is_done;
              const isDueToday = dueDay.getTime() === today.getTime() && !entry.is_done;
              const cls = isOverdue
                ? "text-sm font-medium text-red"
                : isDueToday
                  ? "text-sm font-medium text-peach"
                  : "text-sm text-subtext0";
              return (
                <p className={`font-body ${cls}`}>
                  Faellig: {formatDateTime(entry.due_date)}
                </p>
              );
            })()}
            {!entry.is_done && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => postpone(entry.id, nextDay(1))}
                  className="px-1.5 py-0.5 rounded text-[10px] font-label bg-surface1 text-subtext0 hover:bg-surface2 transition-colors"
                >
                  Morgen
                </button>
                <button
                  type="button"
                  onClick={() => postpone(entry.id, nextWeekday(6))}
                  className="px-1.5 py-0.5 rounded text-[10px] font-label bg-surface1 text-subtext0 hover:bg-surface2 transition-colors"
                >
                  Sa
                </button>
                <button
                  type="button"
                  onClick={() => postpone(entry.id, nextDay(7))}
                  className="px-1.5 py-0.5 rounded text-[10px] font-label bg-surface1 text-subtext0 hover:bg-surface2 transition-colors"
                >
                  +1W
                </button>
              </div>
            )}
          </div>
          {entry.completed_at && (
            <p className="font-body text-xs text-green ml-11">
              Erledigt: {formatDateTime(entry.completed_at)}
            </p>
          )}
          <div className="ml-11">
            <TagBadges entryType="todo" entryId={entry.id} />
          </div>
          {editingId === entry.id && (
            <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3">
              <TodoForm entry={entry} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
