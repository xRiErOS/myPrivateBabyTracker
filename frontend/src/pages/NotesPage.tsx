/** Notes page — shared notes for parents. */

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { NoteForm } from "../plugins/notes/NoteForm";
import { NoteList } from "../plugins/notes/NoteList";

export default function NotesPage() {
  const { t } = useTranslation("notes");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const [showForm, setShowForm] = useState(false);

  const handleDone = useCallback(() => setShowForm(false), []);
  const handleCancel = useCallback(() => setShowForm(false), []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={FileText}
        title={tc("no_child_selected")}
        description={tc("no_child_selected_hint")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")}>
        <Button
          variant={showForm ? "danger" : "primary"}
          onClick={() => (showForm ? handleCancel() : setShowForm(true))}
          className="flex items-center gap-2"
        >
          {showForm ? tc("cancel") : <><Plus className="h-4 w-4" /> {tc("new")}</>}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <NoteForm onDone={handleDone} />
        </Card>
      )}

      {!showForm && <NoteList />}
    </div>
  );
}
