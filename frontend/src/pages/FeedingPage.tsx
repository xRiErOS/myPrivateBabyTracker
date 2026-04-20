/** Feeding page — new entry form + list with inline edit. */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Utensils } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { FeedingForm } from "../plugins/feeding/FeedingForm";
import { FeedingList } from "../plugins/feeding/FeedingList";

export default function FeedingPage() {
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDone = useCallback(() => setShowForm(false), []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={Utensils}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">Mahlzeiten</h2>
        <Button
          variant={showForm ? "danger" : "primary"}
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          {showForm ? "Abbrechen" : <><Plus className="h-4 w-4" /> Neu</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <FeedingForm onDone={handleDone} />
        </Card>
      )}

      <FeedingList />
    </div>
  );
}
