/** Note entry form — create/edit shared notes. */

import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { MarkdownEditor } from "../../components/MarkdownEditor";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateNote, useUpdateNote } from "../../hooks/useNotes";
import { ApiError } from "../../api/client";
import { attachTag } from "../../api/tags";
import type { SharedNote } from "../../api/notes";

interface NoteFormProps {
  entry?: SharedNote;
  onDone?: () => void;
  onCancel?: () => void;
}

export function NoteForm({ entry, onDone, onCancel }: NoteFormProps) {
  const { t } = useTranslation("notes");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const createMut = useCreateNote();
  const updateMut = useUpdateNote();

  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (isEditing) {
        await updateMut.mutateAsync({
          id: entry.id,
          data: { title, content },
        });
      } else {
        const result = await createMut.mutateAsync({
          child_id: activeChild!.id,
          title,
          content,
        });
        if (pendingTagIds.length > 0) {
          await Promise.all(
            pendingTagIds.map((tagId) =>
              attachTag({ tag_id: tagId, entry_type: "note", entry_id: result.id })
            )
          );
        }
      }
      onDone?.();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label={t("label_title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("title_placeholder")}
          maxLength={200}
          required
        />
        <div>
          <label className="font-label text-sm text-subtext0 mb-1 block">
            {t("label_content")}
          </label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            rows={5}
            placeholder={t("content_placeholder")}
          />
        </div>
        <div className="pt-3 border-t border-surface1">
          {isEditing ? (
            <TagSelector entryType="note" entryId={entry!.id} />
          ) : (
            <TagSelector entryType="note" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
          )}
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {tc("cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending ? tc("saving") : isEditing ? tc("update") : tc("add")}
          </Button>
        </div>
      </form>
    </div>
  );
}
