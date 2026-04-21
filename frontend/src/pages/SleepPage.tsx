/** Sleep page — new entry form + list with inline edit, auto-opens running sleep. */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Moon, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { useSleepEntries } from "../hooks/useSleep";
import { SleepForm } from "../plugins/sleep/SleepForm";
import { SleepList } from "../plugins/sleep/SleepList";

export default function SleepPage() {
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [runningEntry, setRunningEntry] = useState<import("../api/types").SleepEntry | undefined>();
  const [autoOpened, setAutoOpened] = useState(false);

  const { data: entries } = useSleepEntries({
    child_id: activeChild?.id,
  });

  // Auto-open running sleep entry in edit mode
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
        icon={Moon}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Schlaf</h2>
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
          <SleepForm entry={runningEntry} onDone={handleDone} />
        </Card>
      )}

      {!showForm && <SleepList />}
    </div>
  );
}
