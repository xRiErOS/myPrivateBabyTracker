/** Temperature page — list + form (inline toggle). */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Thermometer } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { TemperatureForm } from "../plugins/temperature/TemperatureForm";
import { TemperatureList } from "../plugins/temperature/TemperatureList";
import type { TemperatureEntry } from "../api/types";

export default function TemperaturePage() {
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<TemperatureEntry | undefined>();

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

  const handleEdit = useCallback((entry: TemperatureEntry) => {
    setEditEntry(entry);
    setShowForm(true);
  }, []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={Thermometer}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Temperatur</h2>
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
          <TemperatureForm entry={editEntry} onDone={handleDone} />
        </Card>
      )}

      <TemperatureList onEdit={handleEdit} />
    </div>
  );
}
