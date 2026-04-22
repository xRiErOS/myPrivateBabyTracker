/** Medication Masters management page — CRUD for predefined medications. */

import { useCallback, useState } from "react";
import { Pencil, Pill, Plus, Trash2, X } from "lucide-react";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import {
  useCreateMedicationMaster,
  useDeleteMedicationMaster,
  useMedicationMasters,
  useUpdateMedicationMaster,
} from "../hooks/useMedicationMasters";
import type { MedicationMaster, MedicationMasterCreate } from "../api/types";

const UNIT_PRESETS = ["Tablette", "ml", "Tropfen", "mg", "Stueck", "Beutel"];

function MasterForm({
  master,
  onDone,
}: {
  master?: MedicationMaster;
  onDone: () => void;
}) {
  const createMut = useCreateMedicationMaster();
  const updateMut = useUpdateMedicationMaster();

  const [name, setName] = useState(master?.name ?? "");
  const [ingredient, setIngredient] = useState(master?.active_ingredient ?? "");
  const [unit, setUnit] = useState(master?.default_unit ?? "Tablette");
  const [notes, setNotes] = useState(master?.notes ?? "");

  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data: MedicationMasterCreate = {
      name: name.trim(),
      active_ingredient: ingredient.trim() || null,
      default_unit: unit,
      notes: notes.trim() || null,
    };

    if (master) {
      await updateMut.mutateAsync({ id: master.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
    onDone();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Paracetamol"
          maxLength={200}
          required
        />
        <Input
          label="Wirkstoff"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          placeholder="z.B. Paracetamol 125mg"
          maxLength={200}
        />
        <div className="flex flex-col gap-1">
          <label className="font-label text-sm font-medium text-subtext0">
            Masseinheit <span className="text-red">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {UNIT_PRESETS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-3 py-1.5 rounded-lg text-sm font-label transition-colors min-h-[36px] ${
                  unit === u
                    ? "bg-peach text-ground"
                    : "bg-surface1 text-subtext0 hover:bg-surface2"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Notizen"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionale Notizen..."
          maxLength={2000}
        />
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? "Speichern..." : master ? "Aktualisieren" : "Anlegen"}
        </Button>
      </form>
    </Card>
  );
}

export default function MedicationMastersPage() {
  const { data: masters = [], isLoading } = useMedicationMasters(false);
  const deleteMut = useDeleteMedicationMaster();
  const [showForm, setShowForm] = useState(false);
  const [editMaster, setEditMaster] = useState<MedicationMaster | undefined>();

  const handleDone = useCallback(() => {
    setShowForm(false);
    setEditMaster(undefined);
  }, []);

  const handleEdit = useCallback((m: MedicationMaster) => {
    setEditMaster(m);
    setShowForm(true);
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Medikamenten-Stammdaten">
        <Button
          variant={showForm ? "danger" : "primary"}
          onClick={() => {
            setShowForm(!showForm);
            setEditMaster(undefined);
          }}
          className="flex items-center gap-2"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Abbrechen
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Neu
            </>
          )}
        </Button>
      </PageHeader>

      {showForm && <MasterForm master={editMaster} onDone={handleDone} />}

      {isLoading ? (
        <p className="font-body text-sm text-overlay0">Laden...</p>
      ) : masters.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
          <Pill className="h-8 w-8" />
          <p className="font-body text-sm">Noch keine Medikamente angelegt</p>
          <p className="font-body text-xs">Lege Medikamente an, um sie in Formularen per Dropdown auszuwaehlen.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {masters.map((m) => (
            <Card
              key={m.id}
              className={`flex items-center justify-between p-3 ${
                !m.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex flex-col">
                <span className="font-heading text-base text-text">{m.name}</span>
                <span className="font-body text-xs text-subtext0">
                  {m.default_unit}
                  {m.active_ingredient ? ` — ${m.active_ingredient}` : ""}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(m)}
                  className="rounded p-1.5 text-overlay0 hover:bg-surface1"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${m.name}" loeschen?`)) deleteMut.mutate(m.id);
                  }}
                  className="rounded p-1.5 text-overlay0 hover:bg-red/10 hover:text-red"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
