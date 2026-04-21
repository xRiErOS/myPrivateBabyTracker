/** Todo template list — manage recurring task templates with clone-to-today. */

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { useActiveChild } from "../../context/ChildContext";
import {
  useCloneTemplate,
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from "../../hooks/useTodos";
import type { TodoTemplate } from "../../api/types";

function TemplateForm({
  template,
  onDone,
  onCancel,
}: {
  template?: TodoTemplate;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { activeChild } = useActiveChild();
  const createMut = useCreateTemplate();
  const updateMut = useUpdateTemplate();

  const [title, setTitle] = useState(template?.title ?? "");
  const [details, setDetails] = useState(template?.details ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "0";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => { autoResize(); }, [details, autoResize]);
  useEffect(() => { requestAnimationFrame(autoResize); }, [autoResize]);

  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChild || !title.trim()) return;

    if (template) {
      await updateMut.mutateAsync({
        id: template.id,
        data: { title: title.trim(), details: details.trim() || null },
      });
    } else {
      await createMut.mutateAsync({
        child_id: activeChild.id,
        title: title.trim(),
        details: details.trim() || null,
      });
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="Titel *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="z.B. Vitamin D3 geben"
        maxLength={200}
        required
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="tpl-details" className="font-label text-sm font-medium text-subtext0">
          Details
        </label>
        <textarea
          id="tpl-details"
          ref={textareaRef}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Optionale Details..."
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg border border-surface2 bg-ground px-3 py-2 font-body text-base text-text placeholder:text-overlay0 focus:border-mauve focus:outline-none resize-none overflow-hidden"
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" disabled={isPending || !title.trim()}>
          {isPending ? "Speichern..." : template ? "Aktualisieren" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

export function TemplateList() {
  const { activeChild } = useActiveChild();
  const [showInactive, setShowInactive] = useState(false);
  const { data: templates = [], isLoading } = useTemplates(activeChild?.id, !showInactive);
  const cloneMut = useCloneTemplate();
  const deleteMut = useDeleteTemplate();
  const updateMut = useUpdateTemplate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  if (isLoading) {
    return <p className="font-body text-sm text-overlay0">Laden...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-label text-sm text-subtext0">Inaktive anzeigen</span>
        <button
          type="button"
          role="switch"
          aria-checked={showInactive}
          onClick={() => setShowInactive(!showInactive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showInactive ? "bg-green" : "bg-surface2"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-ground transition-transform ${
              showInactive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {!showForm && (
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 self-start"
        >
          <Plus className="h-4 w-4" /> Neue Vorlage
        </Button>
      )}

      {showForm && (
        <Card>
          <TemplateForm onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      {templates.length === 0 && !showForm && (
        <p className="font-body text-sm text-overlay0 text-center py-8">
          Noch keine Vorlagen. Erstelle eine Vorlage fuer wiederkehrende Aufgaben.
        </p>
      )}

      {templates.map((tpl) => (
        <Card key={tpl.id} className={`flex flex-col gap-2 p-3${!tpl.is_active ? " opacity-60" : ""}`}>
          {editingId === tpl.id ? (
            <TemplateForm
              template={tpl}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-heading text-base text-text">{tpl.title}</span>
                  {tpl.details && (
                    <p className="font-body text-xs text-subtext0 mt-0.5">{tpl.details}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => cloneMut.mutate(tpl.id)}
                    disabled={cloneMut.isPending || !tpl.is_active}
                    title="Als ToDo fuer heute erstellen"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-green hover:text-green/80 transition-colors disabled:opacity-40"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setEditingId(tpl.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-text transition-colors"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Vorlage loeschen?")) deleteMut.mutate(tpl.id);
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-subtext0 hover:text-red transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label text-xs text-subtext0">Aktiv</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={tpl.is_active}
                  onClick={() => updateMut.mutate({ id: tpl.id, data: { is_active: !tpl.is_active } })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tpl.is_active ? "bg-green" : "bg-surface2"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-ground transition-transform ${
                      tpl.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
