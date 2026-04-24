/** Tag detail page — entries grouped by type, swipe gestures, search, archive. */

import { useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Search, Tags, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { EntryDetailModal } from "../components/EntryDetailModal";
import { useArchiveEntryTag, useBulkDetachTags, useDetachTag, useEntryTags, useTags } from "../hooks/useTags";
import { useActiveChild } from "../context/ChildContext";
import type { EntryTag } from "../api/types";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  sleep: "Schlaf",
  feeding: "Mahlzeit",
  diaper: "Windel",
  temperature: "Temperatur",
  weight: "Gewicht",
  medication: "Medikament",
  vitamind3: "Vitamin D3",
  todo: "ToDo",
  health: "Wohlbefinden",
  tummytime: "Bauchlage",
  milestone: "Meilenstein",
};

/** Swipeable entry card with visual feedback. */
function SwipeableEntry({
  et,
  selected,
  onToggleSelect,
  onClick,
  onSwipeLeft,
  onSwipeRight,
}: {
  et: EntryTag;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setOffsetX(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    // Only allow horizontal swipe if horizontal > vertical
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      setOffsetX(dx);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (offsetX < -threshold) {
      onSwipeLeft();
    } else if (offsetX > threshold) {
      onSwipeRight();
    }
    setOffsetX(0);
  }, [offsetX, onSwipeLeft, onSwipeRight, threshold]);

  const bgColor = offsetX < -threshold / 2
    ? "bg-sapphire/20"
    : offsetX > threshold / 2
      ? "bg-red/20"
      : "";

  return (
    <div className={`relative overflow-hidden rounded-card ${bgColor} transition-colors`}>
      {/* Swipe hint labels */}
      {offsetX < -30 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 font-label text-xs text-sapphire">
          Archivieren
        </div>
      )}
      {offsetX > 30 && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-label text-xs text-red">
          Entfernen
        </div>
      )}
      <Card
        className={`flex items-center gap-3 p-3 cursor-pointer transition-transform ${et.is_archived ? "opacity-50" : ""}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="accent-peach flex-shrink-0"
        />
        <div className="flex flex-col flex-1 min-w-0">
          {(() => {
            const raw = et.entry_summary ?? `#${et.entry_id}`;
            const sep = raw.indexOf(" — ");
            const main = sep >= 0 ? raw.slice(0, sep) : raw;
            const notes = sep >= 0 ? raw.slice(sep + 3) : null;
            return (
              <>
                <span className="font-label text-sm font-semibold text-peach">
                  {main}
                  {et.is_archived && <span className="ml-1 font-normal text-xs text-overlay0">(archiviert)</span>}
                </span>
                {notes && (
                  <span className="font-body text-sm text-text mt-0.5">{notes}</span>
                )}
              </>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}

export default function TagDetailPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const { activeChild } = useActiveChild();
  const { data: tags = [] } = useTags(activeChild?.id);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: entryTags = [] } = useEntryTags(undefined, undefined, tagId ? Number(tagId) : undefined, showArchived);
  const bulkDetachMut = useBulkDetachTags();
  const archiveMut = useArchiveEntryTag();
  const detachMut = useDetachTag();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modalEntry, setModalEntry] = useState<{ type: string; id: number } | null>(null);

  const tag = tags.find((t) => t.id === Number(tagId));

  // Filter by search query
  const filteredEntryTags = useMemo(() => {
    if (!searchQuery.trim()) return entryTags;
    const q = searchQuery.toLowerCase();
    return entryTags.filter((et) => {
      const summary = et.entry_summary?.toLowerCase() ?? "";
      const typeLabel = (ENTRY_TYPE_LABELS[et.entry_type] ?? et.entry_type).toLowerCase();
      return summary.includes(q) || typeLabel.includes(q);
    });
  }, [entryTags, searchQuery]);

  const allSelected = filteredEntryTags.length > 0 && selected.size === filteredEntryTags.length;

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredEntryTags.map((et: EntryTag) => et.id)));
    }
  }

  async function handleBulkRemove() {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} Tag-Zuordnung(en) entfernen?`)) return;
    await bulkDetachMut.mutateAsync([...selected]);
    setSelected(new Set());
  }

  // Group by entry_type, sort within groups by created_at desc
  const grouped = useMemo(() => {
    const map = new Map<string, EntryTag[]>();
    for (const et of filteredEntryTags) {
      const list = map.get(et.entry_type) ?? [];
      list.push(et);
      map.set(et.entry_type, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return map;
  }, [filteredEntryTags]);

  if (!tag) {
    return (
      <EmptyState
        icon={Tags}
        title="Tag nicht gefunden"
        description="Der Tag existiert nicht oder wurde geloescht."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={tag.name}>
        <span
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color }}
        />
        <span className="font-body text-sm text-subtext0">
          {entryTags.length} Eintrag{entryTags.length !== 1 ? "e" : ""}
        </span>
      </PageHeader>

      {/* Search field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtext0 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Eintraege durchsuchen..."
          className="w-full min-h-[44px] pl-10 pr-3 py-2 rounded-card bg-surface0 border border-surface1 font-body text-sm text-text placeholder:text-overlay0 focus:outline-none focus:border-mauve"
        />
      </div>

      {entryTags.length === 0 ? (
        <p className="font-body text-sm text-overlay0 text-center py-8">
          Keine Eintraege mit diesem Tag.
        </p>
      ) : (
        <>
          {/* Archive toggle + Bulk actions */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 font-label text-sm text-subtext0 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
                className="accent-sapphire"
              />
              Archivierte anzeigen
            </label>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-label text-sm text-subtext0">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="accent-peach"
                />
                Alle auswaehlen ({selected.size}/{filteredEntryTags.length})
              </label>
              {selected.size > 0 && (
                <Button
                  variant="danger"
                  onClick={handleBulkRemove}
                  disabled={bulkDetachMut.isPending}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {bulkDetachMut.isPending ? "Entferne..." : `${selected.size} entfernen`}
                </Button>
              )}
            </div>
          </div>

          {/* Swipe hint */}
          <p className="font-body text-xs text-overlay0 text-center">
            Wischen: links = archivieren, rechts = entfernen
          </p>

          {/* Grouped entries by type */}
          {[...grouped.entries()].map(([entryType, ets]) => (
            <div key={entryType} className="flex flex-col gap-2">
              <h3 className="font-label text-sm font-medium text-subtext0">
                {ENTRY_TYPE_LABELS[entryType] ?? entryType} ({ets.length})
              </h3>
              {ets.map((et) => (
                <SwipeableEntry
                  key={et.id}
                  et={et}
                  selected={selected.has(et.id)}
                  onToggleSelect={() => toggleSelect(et.id)}
                  onClick={() => setModalEntry({ type: et.entry_type, id: et.entry_id })}
                  onSwipeLeft={() => archiveMut.mutate({ id: et.id, isArchived: !et.is_archived })}
                  onSwipeRight={() => {
                    if (confirm("Tag-Zuordnung entfernen?")) {
                      detachMut.mutate(et.id);
                    }
                  }}
                />
              ))}
            </div>
          ))}

          {filteredEntryTags.length === 0 && searchQuery && (
            <p className="font-body text-sm text-overlay0 text-center py-4">
              Keine Treffer fuer "{searchQuery}"
            </p>
          )}
        </>
      )}

      {modalEntry && (
        <EntryDetailModal
          entryType={modalEntry.type}
          entryId={modalEntry.id}
          onClose={() => setModalEntry(null)}
        />
      )}
    </div>
  );
}
