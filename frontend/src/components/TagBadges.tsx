/** Read-only tag badges — shows attached tags as small colored pills. */

import { useEntryTags } from "../hooks/useTags";
import type { EntryTag } from "../api/types";

interface TagBadgesProps {
  entryType: string;
  entryId: number;
}

export function TagBadges({ entryType, entryId }: TagBadgesProps) {
  const { data: entryTags = [] } = useEntryTags(entryType, entryId);

  if (entryTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entryTags.map((et: EntryTag) => (
        <span
          key={et.id}
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-label text-ground"
          style={{ backgroundColor: et.tag.color }}
        >
          {et.tag.name}
        </span>
      ))}
    </div>
  );
}
