/** Todo page — tasks + templates + habits with tab navigation. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckSquare, FileText, Flame, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { TodoForm } from "../plugins/todo/TodoForm";
import { TodoList } from "../plugins/todo/TodoList";
import { TemplateList } from "../plugins/todo/TemplateList";
import { HabitList } from "../plugins/todo/HabitList";

type TodoTab = "tasks" | "templates" | "habits";

export default function TodoPage() {
  const { t } = useTranslation("todo");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TodoTab>("tasks");
  const cameFromDashboard = useRef(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      setActiveTab("tasks");
      cameFromDashboard.current = true;
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDone = useCallback(() => setShowForm(false), []);
  const handleCancel = useCallback(() => {
    setShowForm(false);
    if (cameFromDashboard.current) {
      cameFromDashboard.current = false;
      navigate("/");
    }
  }, [navigate]);

  if (!activeChild) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={tc("no_child_selected")}
        description={tc("no_child_selected_hint")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")}>
        {activeTab === "tasks" && (
          <Button
            variant={showForm ? "danger" : "primary"}
            onClick={() => showForm ? handleCancel() : setShowForm(true)}
            className="flex items-center gap-2"
          >
            {showForm ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
          </Button>
        )}
      </PageHeader>

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
          {t("tab_tasks")}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("habits"); setShowForm(false); }}
          className={`flex-1 py-2 text-sm font-label font-medium rounded-[calc(1rem-4px)] transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
            activeTab === "habits"
              ? "bg-peach text-ground shadow-sm"
              : "bg-surface1 text-subtext0 hover:text-text hover:bg-surface2"
          }`}
        >
          <Flame className="h-4 w-4" />
          Habits
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
          {t("tab_templates")}
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

      {activeTab === "habits" && <HabitList />}

      {activeTab === "templates" && <TemplateList />}
    </div>
  );
}
