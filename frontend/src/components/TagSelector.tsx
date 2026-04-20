/** Reusable tag selector — bound mode (API-driven) or pending mode (local state). */

import { Plus, X } from "lucide-react";
import { useActiveChild } from "../context/ChildContext";
import { useAttachTag, useDetachTag, useEntryTags, useTags } from "../hooks/useTags";
import type { EntryTag, Tag } from "../api/types";

interface TagSelectorProps {
  entryType: string;
  /** If set, operates in bound mode (attach/detach via API). */
  entryId?: number;
  /** Pending mode: selected tag IDs held by parent. */
  pendingTagIds?: number[];
  /** Pending mode: callback when selection changes. */
  onPendingChange?: (ids: number[]) => void;
}

export function TagSelector({ entryType, entryId, pendingTagIds, onPendingChange }: TagSelectorProps) {
  const { activeChild } = useActiveChild();
  const { data: allTags = [] } = useTags(activeChild?.id);
  const { data: entryTags = [] } = useEntryTags(entryType, entryId);
  const attachMut = useAttachTag();
  const detachMut = useDetachTag();

  const isBound = entryId != null;

  const selectedTagIds = isBound
    ? new Set(entryTags.map((et: EntryTag) => et.tag_id))
    : new Set(pendingTagIds ?? []);

  const availableTags = allTags.filter((t: Tag) => !selectedTagIds.has(t.id));

  // Build display list for selected tags
  const attachedDisplay: { tagId: number; entryTagId?: number; name: string; color: string }[] = isBound
    ? entryTags.map((et: EntryTag) => ({
        tagId: et.tag_id,
        entryTagId: et.id,
        name: et.tag.name,
        color: et.tag.color,
      }))
    : allTags
        .filter((t: Tag) => selectedTagIds.has(t.id))
        .map((t: Tag) => ({ tagId: t.id, name: t.name, color: t.color }));

  function handleAdd(tagId: number) {
    if (isBound) {
      attachMut.mutate({ tag_id: tagId, entry_type: entryType, entry_id: entryId! });
    } else {
      onPendingChange?.([...(pendingTagIds ?? []), tagId]);
    }
  }

  function handleRemove(tagId: number, entryTagId?: number) {
    if (isBound && entryTagId != null) {
      detachMut.mutate(entryTagId);
    } else {
      onPendingChange?.((pendingTagIds ?? []).filter((id) => id !== tagId));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="font-label text-sm font-medium text-subtext0">Tags</label>

      {attachedDisplay.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachedDisplay.map((item) => (
            <span
              key={item.tagId}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-label text-ground"
              style={{ backgroundColor: item.color }}
            >
              {item.name}
              <button
                type="button"
                onClick={() => handleRemove(item.tagId, item.entryTagId)}
                className="hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTags.map((t: Tag) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleAdd(t.id)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-label border border-surface2 text-subtext0 hover:bg-surface1 transition-colors"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: t.color }}
              />
              {t.name}
              <Plus className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {allTags.length === 0 && (
        <p className="font-body text-xs text-overlay0">
          Keine Tags vorhanden. Unter Verwaltung &gt; Tags anlegen.
        </p>
      )}
    </div>
  );
}
