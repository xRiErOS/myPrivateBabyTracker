/** Tummy time page -- new entry form + list with inline edit, auto-opens running session. */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Timer, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { useTummyTimeEntries } from "../hooks/useTummyTime";
import { TummyTimeForm } from "../plugins/tummytime/TummyTimeForm";
import { TummyTimeList } from "../plugins/tummytime/TummyTimeList";

export default function TummyTimePage() {
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [runningEntry, setRunningEntry] = useState<import("../api/types").TummyTimeEntry | undefined>();
  const [autoOpened, setAutoOpened] = useState(false);

  const { data: entries } = useTummyTimeEntries({
    child_id: activeChild?.id,
  });

  // Auto-open running tummy time entry in edit mode
  useEffect(() => {
    if (autoOpened || !entries) return;
    const running = entries.find((e) => e.end_time == null);
    if (running) {
      setRunningEntry(running);
      setShowForm(true);
      setAutoOpened(true);
    }
  }, [entries, autoOpened]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDone = useCallback(() => {
    setShowForm(false);
    setRunningEntry(undefined);
  }, []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={Timer}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Bauchlage</h2>
        <Button
          variant={showForm ? "danger" : "primary"}
          onClick={() => {
            setShowForm(!showForm);
            setRunningEntry(undefined);
          }}
          className="flex items-center gap-2"
        >
          {showForm ? "Abbrechen" : <><Plus className="h-4 w-4" /> Neu</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <TummyTimeForm entry={runningEntry} onDone={handleDone} />
        </Card>
      )}

      <TummyTimeList />
    </div>
  );
}
