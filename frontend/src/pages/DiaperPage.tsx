/** Diaper page — list + form (inline toggle). */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Droplets, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { DiaperForm } from "../plugins/diaper/DiaperForm";
import { DiaperList } from "../plugins/diaper/DiaperList";
import type { DiaperEntry } from "../api/types";

export default function DiaperPage() {
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaperEntry | undefined>();

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

  const handleEdit = useCallback((entry: DiaperEntry) => {
    setEditEntry(entry);
    setShowForm(true);
  }, []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={Droplets}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Windeln</h2>
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
          <DiaperForm entry={editEntry} onDone={handleDone} />
        </Card>
      )}

      <DiaperList onEdit={handleEdit} />
    </div>
  );
}
