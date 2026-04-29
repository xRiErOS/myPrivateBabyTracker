/** Todo form — create or edit a todo entry. Details field uses Markdown editor. */

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../components/Button";
import { MarkdownEditor } from "../../components/MarkdownEditor";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateTodo, useUpdateTodo } from "../../hooks/useTodos";
import { useEntryToast } from "../../hooks/useEntryToast";
import { attachTag } from "../../api/tags";
import type { TodoEntry } from "../../api/types";

interface TodoFormProps {
  entry?: TodoEntry;
  onDone: (createdId?: number) => void;
  onCancel?: () => void;
}

export function TodoForm({ entry, onDone, onCancel }: TodoFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateTodo();
  const updateMut = useUpdateTodo();
  const toast = useEntryToast();

  const [title, setTitle] = useState(entry?.title ?? "");
  const [details, setDetails] = useState(entry?.details ?? "");
  const [dueDate, setDueDate] = useState(
    entry?.due_date ? entry.due_date.slice(0, 10) : ""
  );
  const [dueTime, setDueTime] = useState(
    entry?.due_date ? entry.due_date.slice(11, 16) : ""
  );
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea helper
  const autoResizeEl = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = "0";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => { autoResizeEl(titleRef.current); }, [title, autoResizeEl]);

  // Also resize on mount (for pre-filled content)
  useEffect(() => {
    requestAnimationFrame(() => {
      autoResizeEl(titleRef.current);
    });
  }, [autoResizeEl]);

  const isPending = createMut.isPending || updateMut.isPending;

  function buildDueDate(): string | null {
    if (!dueDate) return null;
    if (dueTime) return new Date(`${dueDate}T${dueTime}`).toISOString();
    return new Date(`${dueDate}T00:00:00`).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChild || !title.trim()) return;

    if (entry) {
      await updateMut.mutateAsync({
        id: entry.id,
        data: {
          title: title.trim(),
          details: details.trim() || null,
          due_date: buildDueDate(),
        },
      });
      toast.updated();
      onDone();
    } else {
      const result = await createMut.mutateAsync({
        child_id: activeChild.id,
        title: title.trim(),
        details: details.trim() || null,
        due_date: buildDueDate(),
      });
      if (pendingTagIds.length > 0) {
        await Promise.all(pendingTagIds.map(tagId =>
          attachTag({ tag_id: tagId, entry_type: "todo", entry_id: result.id })
        ));
      }
      toast.saved();
      onDone(result.id);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="todo-title" className="font-label text-sm font-medium text-subtext0">
          Titel<span className="text-red ml-0.5">*</span>
        </label>
        <textarea
          id="todo-title"
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Impfung U4 besprechen"
          maxLength={200}
          required
          rows={1}
          className="w-full min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text placeholder:text-overlay0 border-none outline-none focus:ring-2 focus:ring-mauve transition-all resize-none overflow-hidden"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-label text-sm font-medium text-subtext0">
          Details <span className="text-xs text-overlay0">(Markdown)</span>
        </label>
        <MarkdownEditor
          value={details}
          onChange={setDetails}
          rows={4}
          disabled={isPending}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="font-label text-sm font-medium text-subtext0">Fällig am</label>
            {dueDate && (
              <button
                type="button"
                onClick={() => { setDueDate(""); setDueTime(""); }}
                className="flex items-center gap-0.5 text-xs text-subtext0 hover:text-red transition-colors min-h-[20px]"
                aria-label="Datum löschen"
              >
                <X size={12} /> Löschen
              </button>
            )}
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
          />
        </div>
        <div className="w-32 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="font-label text-sm font-medium text-subtext0">Uhrzeit</label>
            {dueTime && (
              <button
                type="button"
                onClick={() => setDueTime("")}
                className="flex items-center gap-0.5 text-xs text-subtext0 hover:text-red transition-colors min-h-[20px]"
                aria-label="Uhrzeit löschen"
              >
                <X size={12} /> Löschen
              </button>
            )}
          </div>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
          />
        </div>
      </div>
      <div className="pt-3 border-t border-surface1">
        {entry ? (
          <TagSelector entryType="todo" entryId={entry.id} />
        ) : (
          <TagSelector entryType="todo" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
        )}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={isPending || !title.trim()}>
          {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
