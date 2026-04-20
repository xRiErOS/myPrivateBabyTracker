/** Todo form — create or edit a todo entry. */

import { useState } from "react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateTodo, useUpdateTodo } from "../../hooks/useTodos";
import type { TodoEntry } from "../../api/types";

interface TodoFormProps {
  entry?: TodoEntry;
  onDone: () => void;
}

export function TodoForm({ entry, onDone }: TodoFormProps) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateTodo();
  const updateMut = useUpdateTodo();

  const [title, setTitle] = useState(entry?.title ?? "");
  const [details, setDetails] = useState(entry?.details ?? "");
  const [dueDate, setDueDate] = useState(
    entry?.due_date ? entry.due_date.slice(0, 16) : ""
  );

  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChild || !title.trim()) return;

    if (entry) {
      await updateMut.mutateAsync({
        id: entry.id,
        data: {
          title: title.trim(),
          details: details.trim() || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        },
      });
    } else {
      await createMut.mutateAsync({
        child_id: activeChild.id,
        title: title.trim(),
        details: details.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
    }
    onDone();
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
      <Input
        label="Details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Optionale Details..."
        maxLength={2000}
      />
      <Input
        label="Faellig am"
        type="datetime-local"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <Button type="submit" disabled={isPending || !title.trim()}>
        {isPending ? "Speichern..." : entry ? "Aktualisieren" : "Nachtragen"}
      </Button>
    </form>
  );
}
