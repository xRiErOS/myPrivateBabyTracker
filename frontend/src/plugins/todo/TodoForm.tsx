/** Todo form — create or edit a todo entry. */

import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateTodo, useUpdateTodo } from "../../hooks/useTodos";
import type { TodoEntry } from "../../api/types";

interface TodoFormProps {
  entry?: TodoEntry;
  onDone: (createdId?: number) => void;
}

export function TodoForm({ entry, onDone }: TodoFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateTodo();
  const updateMut = useUpdateTodo();

  const [title, setTitle] = useState(entry?.title ?? "");
  const [details, setDetails] = useState(entry?.details ?? "");
  const [dueDate, setDueDate] = useState(
    entry?.due_date ? entry.due_date.slice(0, 10) : ""
  );
  const [dueTime, setDueTime] = useState(
    entry?.due_date ? entry.due_date.slice(11, 16) : ""
  );
  const [createdId, setCreatedId] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [details]);

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
      onDone();
    } else {
      const result = await createMut.mutateAsync({
        child_id: activeChild.id,
        title: title.trim(),
        details: details.trim() || null,
        due_date: buildDueDate(),
      });
      setCreatedId(result.id);
    }
  }

  // After create: show TagSelector, then done
  if (createdId && !entry) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-label text-sm text-green">ToDo angelegt. Tags hinzufuegen?</p>
        <TagSelector entryType="todo" entryId={createdId} />
        <Button variant="secondary" onClick={() => onDone(createdId)}>
          Fertig
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="z.B. Impfung U4 besprechen"
        maxLength={200}
        required
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="todo-details" className="font-label text-sm font-medium text-subtext0">
          Details
        </label>
        <textarea
          id="todo-details"
          ref={textareaRef}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Optionale Details..."
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg border border-surface2 bg-ground px-3 py-2 font-body text-base text-text placeholder:text-overlay0 focus:border-mauve focus:outline-none resize-none"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Faellig am"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="w-28">
          <Input
            label="Uhrzeit"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending || !title.trim()}>
        {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Speichern"}
      </Button>
    </form>
  );
}
