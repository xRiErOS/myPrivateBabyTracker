/** MotherHealthForm — create/edit a postpartum / midwife note (MBT-109). */

import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { MarkdownEditor } from "../../components/MarkdownEditor";
import { useActiveChild } from "../../context/ChildContext";
import {
  useCreateMotherHealthEntry,
  useUpdateMotherHealthEntry,
} from "../../hooks/useMotherHealth";
import { useEntryToast } from "../../hooks/useEntryToast";
import { formatApiError } from "../../lib/errorMessages";
import type { MotherHealthEntry } from "../../api/motherhealth";

interface MotherHealthFormProps {
  entry?: MotherHealthEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

const MAX_LEN = 4000;

export function MotherHealthForm({ entry, onDone, onCancel }: MotherHealthFormProps) {
  const { t } = useTranslation("motherhealth");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const createMut = useCreateMotherHealthEntry();
  const updateMut = useUpdateMotherHealthEntry();
  const toast = useEntryToast();

  const [content, setContent] = useState(entry?.content ?? "");
  const [error, setError] = useState<string | null>(null);

  const isEditing = entry != null;
  const isPending = createMut.isPending || updateMut.isPending;
  const trimmed = content.trim();
  const tooLong = content.length > MAX_LEN;
  const charCount = content.length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!trimmed || tooLong) return;

    try {
      if (isEditing) {
        await updateMut.mutateAsync({ id: entry.id, data: { content } });
      } else {
        await createMut.mutateAsync({
          child_id: activeChild!.id,
          content,
        });
      }
      toast.saved();
      onDone?.();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="font-label text-sm text-subtext0 mb-1 block">
            {t("label_content")}
          </label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            rows={6}
            placeholder={t("content_placeholder")}
          />
          <div className="flex justify-end mt-1">
            <span
              className={`font-body text-xs ${
                tooLong ? "text-red" : "text-subtext0"
              }`}
            >
              {charCount} / {MAX_LEN}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {tc("cancel")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending || !trimmed || tooLong}
          >
            {isPending ? tc("saving") : isEditing ? tc("update") : tc("add")}
          </Button>
        </div>
      </form>
    </div>
  );
}
