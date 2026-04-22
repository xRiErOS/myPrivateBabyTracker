/** Children management — list + create/edit form. */

import { useState } from "react";
import { format } from "date-fns";
import { Baby, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  useChildren,
  useCreateChild,
  useDeleteChild,
  useUpdateChild,
} from "../hooks/useChildren";
import type { Child } from "../api/types";

export default function ChildrenPage() {
  const { data: children = [], isLoading } = useChildren();
  const createChild = useCreateChild();
  const updateChild = useUpdateChild();
  const deleteChild = useDeleteChild();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isPreterm, setIsPreterm] = useState(false);
  const [estimatedBirthDate, setEstimatedBirthDate] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editIsPreterm, setEditIsPreterm] = useState(false);
  const [editEstimatedBirthDate, setEditEstimatedBirthDate] = useState("");

  const resetCreateForm = () => {
    setName("");
    setBirthDate("");
    setIsPreterm(false);
    setEstimatedBirthDate("");
    setShowForm(false);
  };

  const startEdit = (child: Child) => {
    setEditingId(child.id);
    setEditName(child.name);
    setEditBirthDate(child.birth_date);
    setEditIsPreterm(child.is_preterm);
    setEditEstimatedBirthDate(child.estimated_birth_date ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;

    await createChild.mutateAsync({
      name: name.trim(),
      birth_date: birthDate,
      is_preterm: isPreterm,
      estimated_birth_date: estimatedBirthDate || null,
    });

    resetCreateForm();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editBirthDate || editingId === null) return;

    await updateChild.mutateAsync({
      id: editingId,
      data: {
        name: editName.trim(),
        birth_date: editBirthDate,
        is_preterm: editIsPreterm,
        estimated_birth_date: editEstimatedBirthDate || null,
      },
    });

    setEditingId(null);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <PageHeader title="Kinder">
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Hinzufuegen
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name des Kindes"
              required
              maxLength={100}
            />
            <Input
              label="Geburtsdatum"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />

            <Input
              label="Errechneter Termin (ET)"
              type="date"
              value={estimatedBirthDate}
              onChange={(e) => setEstimatedBirthDate(e.target.value)}
            />
            <p className="font-body text-xs text-subtext0 -mt-2">
              Wichtig fuer die Berechnung der Entwicklungsspruenge.
            </p>

            <div className="flex gap-2">
              <Button type="submit" disabled={createChild.isPending}>
                {createChild.isPending ? "Speichern..." : "Speichern"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetCreateForm}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      {children.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="Keine Kinder angelegt"
          description="Lege dein erstes Kind an, um mit dem Tracking zu beginnen."
        />
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <div key={child.id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-label text-sm font-semibold text-text">
                    {child.name}
                  </p>
                  <p className="font-body text-xs text-subtext0">
                    {format(new Date(child.birth_date), "dd.MM.yyyy")}
                    {child.estimated_birth_date && (
                      <span className="ml-2">
                        (ET: {format(new Date(child.estimated_birth_date), "dd.MM.yyyy")})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      editingId === child.id ? cancelEdit() : startEdit(child)
                    }
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-overlay0 hover:text-text transition-colors"
                    aria-label={`${child.name} bearbeiten`}
                  >
                    {editingId === child.id ? (
                      <X size={18} />
                    ) : (
                      <Pencil size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${child.name}" wirklich loeschen?`)) {
                        deleteChild.mutate(child.id);
                      }
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-overlay0 hover:text-red transition-colors"
                    aria-label={`${child.name} loeschen`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>

              {/* Inline Edit Form */}
              {editingId === child.id && (
                <Card className="mt-0 rounded-t-none border-t border-surface1">
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <Input
                      label="Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name des Kindes"
                      required
                      maxLength={100}
                    />
                    <Input
                      label="Geburtsdatum"
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      required
                    />

                    <Input
                      label="Errechneter Termin (ET)"
                      type="date"
                      value={editEstimatedBirthDate}
                      onChange={(e) =>
                        setEditEstimatedBirthDate(e.target.value)
                      }
                    />
                    <p className="font-body text-xs text-subtext0 -mt-2">
                      Wichtig fuer die Berechnung der Entwicklungsspruenge.
                    </p>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={updateChild.isPending}>
                        {updateChild.isPending
                          ? "Aktualisieren..."
                          : "Aktualisieren"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEdit}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
