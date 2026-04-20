/** Reusable tag selector — shows available tags, allows attach/detach on entries. */

import { Plus, X } from "lucide-react";
import { useActiveChild } from "../context/ChildContext";
import { useAttachTag, useDetachTag, useEntryTags, useTags } from "../hooks/useTags";
import type { EntryTag, Tag } from "../api/types";

interface TagSelectorProps {
  entryType: string;
  entryId: number;
}

export function TagSelector({ entryType, entryId }: TagSelectorProps) {
  const { activeChild } = useActiveChild();
  const { data: allTags = [] } = useTags(activeChild?.id);
  const { data: entryTags = [] } = useEntryTags(entryType, entryId);
  const attachMut = useAttachTag();
  const detachMut = useDetachTag();

  const attachedTagIds = new Set(entryTags.map((et: EntryTag) => et.tag_id));
  const availableTags = allTags.filter((t: Tag) => !attachedTagIds.has(t.id));

  function handleAttach(tagId: number) {
    attachMut.mutate({ tag_id: tagId, entry_type: entryType, entry_id: entryId });
  }

  function handleDetach(entryTag: EntryTag) {
    detachMut.mutate(entryTag.id);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="font-label text-sm font-medium text-subtext0">Tags</label>

      {/* Attached tags */}
      {entryTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entryTags.map((et: EntryTag) => (
            <span
              key={et.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-label text-ground"
              style={{ backgroundColor: et.tag.color }}
            >
              {et.tag.name}
              <button
                type="button"
                onClick={() => handleDetach(et)}
                className="hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Available tags to add */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTags.map((t: Tag) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleAttach(t.id)}
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
