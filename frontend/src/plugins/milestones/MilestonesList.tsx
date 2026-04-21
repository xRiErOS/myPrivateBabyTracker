/** Milestones list with category filter, status toggle, search, and inline edit. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Eye, EyeOff, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { useActiveChild } from "../../context/ChildContext";
import {
  useCategories,
  useCompleteMilestone,
  useCreateMilestone,
  useDeleteMilestone,
  useMilestoneEntries,
  useTemplates,
  useUpdateMilestone,
} from "../../hooks/useMilestones";
import { formatDate } from "../../lib/dateUtils";
import type { MilestoneCategory, MilestoneEntry, MilestoneTemplate } from "../../api/types";
import type { MilestoneListParams } from "../../api/milestones";

function CategoryBadge({ category }: { category: MilestoneCategory | undefined }) {
  if (!category) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-label">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatAgeRange(minWeeks: number | null, maxWeeks: number | null): string {
  if (minWeeks == null) return "";
  const minMon = Math.round(minWeeks / 4.35);
  const maxMon = maxWeeks ? Math.round(maxWeeks / 4.35) : minMon;
  if (minMon === maxMon) return `~${minMon} Mon.`;
  return `${minMon}-${maxMon} Mon.`;
}

export function MilestonesList() {
  const { activeChild } = useActiveChild();

  // --- Filter state ---
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // --- UI state ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // --- Create form state ---
  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<number | "">("");
  const [newDate, setNewDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // --- Edit form state ---
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | "">("");
  const [editDate, setEditDate] = useState("");
  const [editConfidence, setEditConfidence] = useState<"exact" | "approximate" | "unsure">("exact");
  const [editNotes, setEditNotes] = useState("");

  // --- Debounce ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Data hooks ---
  const { data: categories = [] } = useCategories(activeChild?.id);

  const params: MilestoneListParams = {
    child_id: activeChild?.id,
    ...(filterCategory ? { category_id: filterCategory } : {}),
    ...(filterStatus === "open" ? { completed: false } : filterStatus === "completed" ? { completed: true } : {}),
    ...(debouncedQuery ? { q: debouncedQuery } : {}),
  };

  const { data: entries = [], isLoading } = useMilestoneEntries(params);
  const { data: allTemplates = [] } = useTemplates();
  const createMut = useCreateMilestone();
  const updateMut = useUpdateMilestone();
  const deleteMut = useDeleteMilestone();
  const completeMut = useCompleteMilestone();

  // --- Category lookup ---
  const categoryMap = useMemo(() => {
    const m = new Map<number, MilestoneCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // --- Template lookup (for age range on entries) ---
  const templateMap = useMemo(() => {
    const m = new Map<number, MilestoneTemplate>();
    for (const t of allTemplates) m.set(t.id, t);
    return m;
  }, [allTemplates]);

  // --- Templates not yet achieved (for "show all" mode) ---
  const unreachedTemplates = useMemo(() => {
    if (!showAll) return [];
    const entryTemplateIds = new Set(entries.filter((e) => e.template_id).map((e) => e.template_id));
    return allTemplates.filter(
      (t) =>
        !entryTemplateIds.has(t.id) &&
        (!filterCategory || t.category_id === filterCategory) &&
        (!debouncedQuery || t.title.toLowerCase().includes(debouncedQuery.toLowerCase())),
    );
  }, [showAll, allTemplates, entries, filterCategory, debouncedQuery]);

  // --- Sorted entries: open first, then by completed_date desc ---
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.completed && b.completed) {
        const da = a.completed_date ?? "";
        const db = b.completed_date ?? "";
        return db.localeCompare(da);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [entries]);

  // --- Toggle completed ---
  const toggleCompleted = useCallback(
    (entry: MilestoneEntry) => {
      if (entry.completed) {
        updateMut.mutate({ id: entry.id, data: { completed: false, completed_date: null } });
      } else {
        completeMut.mutate({ id: entry.id, data: { completed_date: todayISO() } });
      }
    },
    [updateMut, completeMut],
  );

  // --- Start editing ---
  const startEdit = useCallback(
    (entry: MilestoneEntry) => {
      setEditingId(entry.id);
      setEditTitle(entry.title);
      setEditCategoryId(entry.category_id);
      setEditDate(entry.completed_date ?? "");
      setEditConfidence(entry.confidence);
      setEditNotes(entry.notes ?? "");
    },
    [],
  );

  // --- Submit edit ---
  const submitEdit = useCallback(() => {
    if (!editingId || !editTitle.trim()) return;
    updateMut.mutate(
      {
        id: editingId,
        data: {
          title: editTitle.trim(),
          category_id: editCategoryId ? Number(editCategoryId) : undefined,
          completed_date: editDate || null,
          confidence: editConfidence,
          notes: editNotes.trim() || null,
        },
      },
      { onSuccess: () => setEditingId(null) },
    );
  }, [editingId, editTitle, editCategoryId, editDate, editConfidence, editNotes, updateMut]);

  // --- Submit create ---
  const submitCreate = useCallback(() => {
    if (!activeChild || !newTitle.trim() || !newCategoryId) return;
    createMut.mutate(
      {
        child_id: activeChild.id,
        title: newTitle.trim(),
        category_id: Number(newCategoryId),
        source_type: "custom",
        completed_date: newDate || null,
        notes: newNotes.trim() || null,
      },
      {
        onSuccess: () => {
          setNewTitle("");
          setNewCategoryId("");
          setNewDate("");
          setNewNotes("");
          setShowCreate(false);
        },
      },
    );
  }, [activeChild, newTitle, newCategoryId, newDate, newNotes, createMut]);

  // --- Status filter options ---
  const statusOptions: { value: "all" | "open" | "completed"; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "open", label: "Offen" },
    { value: "completed", label: "Erreicht" },
  ];

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header: Title + New button */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-text">Meilensteine</h2>
        <Button
          variant="primary"
          className="flex items-center gap-1.5"
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Abbrechen" : "Neu"}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="flex flex-col gap-3 p-4">
          <Input
            label="Titel"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="z.B. Erstes Laecheln"
          />
          <div className="flex flex-col gap-1">
            <label className="font-label text-sm font-medium text-subtext0">
              Kategorie <span className="text-red ml-0.5">*</span>
            </label>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value ? Number(e.target.value) : "")}
              className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
            >
              <option value="">Bitte waehlen...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Datum"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="font-label text-sm font-medium text-subtext0">Notizen</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text placeholder:text-overlay0 border-none outline-none focus:ring-2 focus:ring-mauve transition-all resize-y"
              placeholder="Optional..."
            />
          </div>
          <Button
            variant="primary"
            onClick={submitCreate}
            disabled={!newTitle.trim() || !newCategoryId || createMut.isPending}
          >
            Eintragen
          </Button>
        </Card>
      )}

      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Category dropdown */}
        <select
          value={filterCategory ?? ""}
          onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
          className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
        >
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Status toggle */}
        <div className="flex rounded-[8px] overflow-hidden border border-surface2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterStatus(opt.value)}
              className={`min-h-[44px] px-3 py-2 font-label text-sm transition-colors ${
                filterStatus === opt.value
                  ? "bg-mauve text-ground font-semibold"
                  : "bg-surface0 text-subtext0 hover:bg-surface1"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Show all toggle */}
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className={`min-h-[44px] px-3 py-2 rounded-[8px] font-label text-sm flex items-center gap-1.5 transition-colors ${
            showAll
              ? "bg-mauve text-ground font-semibold"
              : "bg-surface0 text-subtext0 hover:bg-surface1 border border-surface2"
          }`}
          title={showAll ? "Nur eigene Eintraege" : "Alle Meilensteine anzeigen"}
        >
          {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Alle
        </button>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-overlay0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suchen..."
            className="w-full min-h-[44px] rounded-[8px] border border-surface2 bg-surface0 pl-9 pr-3 py-2 font-body text-base text-text placeholder:text-overlay0 focus:border-mauve focus:outline-none"
          />
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
          <Star className="h-8 w-8" />
          <p className="font-body text-sm">Noch keine Meilensteine eingetragen</p>
        </div>
      )}

      {/* Entry list */}
      {sorted.map((entry) => {
        const isEditing = editingId === entry.id;
        const cat = categoryMap.get(entry.category_id);
        return (
          <Card
            key={`entry-${entry.id}`}
            className={`flex flex-col gap-1 p-3${entry.completed ? " opacity-60" : ""}${isEditing ? " overflow-hidden" : ""}`}
          >
            <div className="flex items-start justify-between">
              {/* Left: checkbox + content */}
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleCompleted(entry)}
                  className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-green transition-colors"
                >
                  {entry.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-green" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </button>
                <div className="flex flex-col min-w-0 break-words w-full pt-2.5">
                  <span
                    className={`font-heading text-base break-words ${
                      entry.completed ? "line-through text-overlay0" : "text-text"
                    }`}
                  >
                    {entry.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <CategoryBadge category={cat} />
                    {(() => {
                      const tmpl = entry.template_id ? templateMap.get(entry.template_id) : undefined;
                      const ageStr = tmpl ? formatAgeRange(tmpl.suggested_age_weeks_min, tmpl.suggested_age_weeks_max) : "";
                      return ageStr ? <span className="font-body text-xs text-overlay0">{ageStr}</span> : null;
                    })()}
                    {entry.completed_date && (
                      <span className="font-body text-xs text-subtext0">
                        {formatDate(entry.completed_date)}
                      </span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="font-body text-xs text-subtext0 whitespace-pre-wrap break-words mt-1">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: edit + delete */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setEditingId(null);
                    } else {
                      setShowCreate(false);
                      startEdit(entry);
                    }
                  }}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    isEditing ? "text-peach" : "text-subtext0 hover:text-text"
                  } transition-colors`}
                >
                  {isEditing ? <X className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Meilenstein loeschen?")) deleteMut.mutate(entry.id);
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-red transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Inline edit form */}
            {isEditing && (
              <div className="border-t border-surface1 bg-surface0/50 -mx-3 -mb-3 px-3 py-3 mt-3 flex flex-col gap-3">
                <Input
                  label="Titel"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <div className="flex flex-col gap-1">
                  <label className="font-label text-sm font-medium text-subtext0">Kategorie</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : "")}
                    className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
                  >
                    <option value="">Bitte waehlen...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Datum"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
                <div className="flex flex-col gap-1">
                  <label className="font-label text-sm font-medium text-subtext0">Konfidenz</label>
                  <select
                    value={editConfidence}
                    onChange={(e) =>
                      setEditConfidence(e.target.value as "exact" | "approximate" | "unsure")
                    }
                    className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all"
                  >
                    <option value="exact">Exakt</option>
                    <option value="approximate">Ungefaehr</option>
                    <option value="unsure">Unsicher</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label text-sm font-medium text-subtext0">Notizen</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text placeholder:text-overlay0 border-none outline-none focus:ring-2 focus:ring-mauve transition-all resize-y"
                    placeholder="Optional..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={submitEdit}
                    disabled={!editTitle.trim() || updateMut.isPending}
                  >
                    Aktualisieren
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingId(null)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Unreached templates (show all mode) */}
      {showAll && unreachedTemplates.length > 0 && (
        <>
          <h3 className="font-heading text-sm text-overlay0 mt-4">Vorgeschlagene Meilensteine</h3>
          {unreachedTemplates.map((tmpl) => {
            const cat = categoryMap.get(tmpl.category_id);
            const ageStr = formatAgeRange(tmpl.suggested_age_weeks_min, tmpl.suggested_age_weeks_max);
            return (
              <Card
                key={`tmpl-${tmpl.id}`}
                className="flex flex-col gap-1 p-3 opacity-60 border-dashed"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-overlay0">
                      <Circle className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col min-w-0 break-words w-full pt-2.5">
                      <span className="font-heading text-base text-text break-words">
                        {tmpl.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <CategoryBadge category={cat} />
                        {ageStr && <span className="font-body text-xs text-overlay0">{ageStr}</span>}
                      </div>
                      {tmpl.description && (
                        <p className="font-body text-xs text-subtext0 whitespace-pre-wrap break-words mt-1">
                          {tmpl.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeChild) return;
                      createMut.mutate({
                        child_id: activeChild.id,
                        template_id: tmpl.id,
                        title: tmpl.title,
                        category_id: tmpl.category_id,
                        source_type: tmpl.source_type,
                        completed: true,
                        completed_date: todayISO(),
                      });
                    }}
                    className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-green transition-colors"
                    title="Als erreicht markieren"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
