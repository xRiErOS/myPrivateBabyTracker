/** Children management — list + create/edit form. */

import { useState } from "react";
import { format } from "date-fns";
import { Baby, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  useChildren,
  useCreateChild,
  useDeleteChild,
} from "../hooks/useChildren";

export default function ChildrenPage() {
  const { data: children = [], isLoading } = useChildren();
  const createChild = useCreateChild();
  const deleteChild = useDeleteChild();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;

    await createChild.mutateAsync({
      name: name.trim(),
      birth_date: birthDate,
    });

    setName("");
    setBirthDate("");
    setShowForm(false);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Kinder</h2>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Hinzufuegen
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex gap-2">
              <Button type="submit" disabled={createChild.isPending}>
                {createChild.isPending ? "Speichern..." : "Speichern"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
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
            <Card key={child.id} className="flex items-center justify-between">
              <div>
                <p className="font-label text-sm font-semibold text-text">
                  {child.name}
                </p>
                <p className="font-body text-xs text-subtext0">
                  {format(new Date(child.birth_date), "dd.MM.yyyy")}
                </p>
              </div>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
