/** Tags dashboard widget — top 3 tags with non-archived entry counts. */

import { useMemo } from "react";
import { Tags } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useActiveChild } from "../../context/ChildContext";
import { useTags, useEntryTags } from "../../hooks/useTags";

function TagRow({ tagId, name, color }: { tagId: number; name: string; color: string }) {
  const navigate = useNavigate();
  const { data: entryTags = [] } = useEntryTags(undefined, undefined, tagId);
  const activeCount = entryTags.filter((et) => !et.is_archived).length;

  return (
    <div
      className="flex items-center gap-2 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/tags/${tagId}`);
      }}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="font-body text-sm text-text truncate flex-1">{name}</span>
      {activeCount > 0 && (
        <span className="font-label text-xs text-subtext0 bg-surface1 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {activeCount}
        </span>
      )}
    </div>
  );
}

export function TagsWidget() {
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: tags = [] } = useTags(activeChild?.id);

  const topTags = useMemo(() => tags.slice(0, 3), [tags]);

  if (tags.length === 0) {
    return (
      <Card
        className="h-full cursor-pointer hover:bg-surface1/50 transition-colors"
        onClick={() => navigate("/tags")}
      >
        <div className="flex items-center gap-2 mb-3">
          <Tags className="h-5 w-5 text-lavender" />
          <p className="font-label text-sm font-medium text-subtext0">Tags</p>
        </div>
        <p className="font-body text-sm text-overlay0">Keine Tags</p>
      </Card>
    );
  }

  return (
    <Card
      className="h-full cursor-pointer hover:bg-surface1/50 transition-colors"
      onClick={() => navigate("/tags")}
    >
      <div className="flex items-center gap-2 mb-3">
        <Tags className="h-5 w-5 text-lavender" />
        <p className="font-label text-sm font-medium text-subtext0">Tags</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {topTags.map((tag) => (
          <TagRow key={tag.id} tagId={tag.id} name={tag.name} color={tag.color} />
        ))}
        {tags.length > 3 && (
          <p className="font-body text-xs text-subtext0">+{tags.length - 3} weitere</p>
        )}
      </div>
    </Card>
  );
}
