/** Todo page — tasks + templates with tab navigation. */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckSquare, FileText, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { useActiveChild } from "../context/ChildContext";
import { TodoForm } from "../plugins/todo/TodoForm";
import { TodoList } from "../plugins/todo/TodoList";
import { TemplateList } from "../plugins/todo/TemplateList";

type TodoTab = "tasks" | "templates";

export default function TodoPage() {
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TodoTab>("tasks");

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      setActiveTab("tasks");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDone = useCallback(() => setShowForm(false), []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Kein Kind ausgewaehlt"
        description="Waehle zuerst ein Kind aus."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-semibold">ToDo-Liste</h2>
        {activeTab === "tasks" && (
          <Button
            variant={showForm ? "danger" : "primary"}
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2"
          >
            {showForm ? "Abbrechen" : <><Plus className="h-4 w-4" /> Neu</>}
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex bg-surface0 rounded-card p-1 gap-1">
        <button
          type="button"
          onClick={() => { setActiveTab("tasks"); setShowForm(false); }}
          className={`flex-1 py-2 text-sm font-label font-medium rounded-[calc(1rem-4px)] transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
            activeTab === "tasks"
              ? "bg-peach text-ground shadow-sm"
              : "bg-surface1 text-subtext0 hover:text-text hover:bg-surface2"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Aufgaben
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("templates"); setShowForm(false); }}
          className={`flex-1 py-2 text-sm font-label font-medium rounded-[calc(1rem-4px)] transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
            activeTab === "templates"
              ? "bg-peach text-ground shadow-sm"
              : "bg-surface1 text-subtext0 hover:text-text hover:bg-surface2"
          }`}
        >
          <FileText className="h-4 w-4" />
          Vorlagen
        </button>
      </div>

      {activeTab === "tasks" && (
        <>
          {showForm && (
            <Card>
              <TodoForm onDone={handleDone} />
            </Card>
          )}
          {!showForm && <TodoList />}
        </>
      )}

      {activeTab === "templates" && <TemplateList />}
    </div>
  );
}
