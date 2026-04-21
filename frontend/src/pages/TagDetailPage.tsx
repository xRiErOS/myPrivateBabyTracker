/** Tag detail page — shows all entries tagged with a specific tag + bulk untag. */

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Tags, Trash2 } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { EntryDetailModal } from "../components/EntryDetailModal";
import { useBulkDetachTags, useEntryTags, useTags } from "../hooks/useTags";
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
};

export default function TagDetailPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const { data: tags = [] } = useTags(activeChild?.id);
  const { data: entryTags = [] } = useEntryTags(undefined, undefined, tagId ? Number(tagId) : undefined);
  const bulkDetachMut = useBulkDetachTags();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modalEntry, setModalEntry] = useState<{ type: string; id: number } | null>(null);

  const tag = tags.find((t) => t.id === Number(tagId));

  const allSelected = entryTags.length > 0 && selected.size === entryTags.length;

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
      setSelected(new Set(entryTags.map((et: EntryTag) => et.id)));
    }
  }

  async function handleBulkRemove() {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} Tag-Zuordnung(en) entfernen?`)) return;
    await bulkDetachMut.mutateAsync([...selected]);
    setSelected(new Set());
  }

  // Sort by created_at descending, then group by date
  const sortedAndGrouped = useMemo(() => {
    const sorted = [...entryTags].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const today = new Date();
    const todayStr = today.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

    const map = new Map<string, EntryTag[]>();
    for (const et of sorted) {
      const d = new Date(et.created_at);
      const dateStr = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      const label = dateStr === todayStr ? "Heute" : dateStr === yesterdayStr ? "Gestern" : dateStr;
      const list = map.get(label) ?? [];
      list.push(et);
      map.set(label, list);
    }
    return map;
  }, [entryTags]);

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
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/tags")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.color }}
        />
        <h2 className="font-headline text-lg font-semibold">{tag.name}</h2>
        <span className="font-body text-sm text-subtext0">
          {entryTags.length} Eintrag{entryTags.length !== 1 ? "e" : ""}
        </span>
      </div>

      {entryTags.length === 0 ? (
        <p className="font-body text-sm text-overlay0 text-center py-8">
          Keine Eintraege mit diesem Tag.
        </p>
      ) : (
        <>
          {/* Bulk actions */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-label text-sm text-subtext0">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="accent-peach"
              />
              Alle auswaehlen ({selected.size}/{entryTags.length})
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

          {/* Grouped entries by date */}
          {[...sortedAndGrouped.entries()].map(([dateLabel, ets]) => (
            <div key={dateLabel} className="flex flex-col gap-2">
              <h3 className="font-label text-sm font-medium text-subtext0">
                {dateLabel} ({ets.length})
              </h3>
              {ets.map((et) => (
                <Card
                  key={et.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface0 transition-colors"
                  onClick={() => setModalEntry({ type: et.entry_type, id: et.entry_id })}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(et.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(et.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-peach flex-shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-body text-sm text-text">
                      {ENTRY_TYPE_LABELS[et.entry_type] ?? et.entry_type}
                    </span>
                    <span className="font-body text-xs text-subtext0">
                      {new Date(et.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ))}
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
