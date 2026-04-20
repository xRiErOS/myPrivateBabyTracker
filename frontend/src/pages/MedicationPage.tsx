/** Medication page — list + form (inline toggle). */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pill, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { MedicationForm } from "../plugins/medication/MedicationForm";
import { MedicationList } from "../plugins/medication/MedicationList";
import type { MedicationEntry } from "../api/types";

export default function MedicationPage() {
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<MedicationEntry | undefined>();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDone = useCallback(() => {
    setShowForm(false);
    setEditEntry(undefined);
  }, []);

  const handleEdit = useCallback((entry: MedicationEntry) => {
    setEditEntry(entry);
    setShowForm(true);
  }, []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={Pill}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Medikamente</h2>
        <Button
          variant={showForm ? "danger" : "primary"}
          onClick={() => {
            setShowForm(!showForm);
            setEditEntry(undefined);
          }}
          className="flex items-center gap-2"
        >
          {showForm ? "Abbrechen" : <><Plus className="h-4 w-4" /> Neu</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <MedicationForm entry={editEntry} onDone={handleDone} />
        </Card>
      )}

      <MedicationList onEdit={handleEdit} />
    </div>
  );
}
