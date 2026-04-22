/** Tags management page — CRUD for child tags with color picker. */

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useActiveChild } from "../context/ChildContext";
import { EmptyState } from "../components/EmptyState";
import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
} from "../hooks/useTags";
import type { Tag, TagCreate } from "../api/types";

const COLOR_PRESETS = [
  "#8839ef", // mauve
  "#ea76cb", // pink
  "#e64553", // red
  "#fe640b", // peach
  "#df8e1d", // yellow
  "#40a02b", // green
  "#179299", // teal
  "#1e66f5", // blue
  "#7287fd", // lavender
  "#6c6f85", // overlay0
];

function TagForm({
  tag,
  childId,
  onDone,
}: {
  tag?: Tag;
  childId: number;
  onDone: () => void;
}) {
  const createMut = useCreateTag();
  const updateMut = useUpdateTag();

  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? "#8839ef");

  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const isPending = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (tag) {
      await updateMut.mutateAsync({ id: tag.id, data: { name: name.trim(), color } });
    } else {
      const data: TagCreate = { child_id: childId, name: name.trim(), color };
      await createMut.mutateAsync(data);
    }
    onDone();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label={t("tags.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("tags.name_placeholder")}
          maxLength={100}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="font-label text-sm font-medium text-subtext0">
            {t("tags.color")} <span className="text-red">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c ? "border-text scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? tc("saving") : tag ? tc("update") : tc("create")}
        </Button>
      </form>
    </Card>
  );
}

export default function TagsPage() {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const navigate = useNavigate();
  const { data: tags = [], isLoading } = useTags(activeChild?.id);
  const deleteMut = useDeleteTag();
  const [showForm, setShowForm] = useState(false);
  const [editTag, setEditTag] = useState<Tag | undefined>();

  const handleDone = useCallback(() => {
    setShowForm(false);
    setEditTag(undefined);
  }, []);

  const handleEdit = useCallback((t: Tag) => {
    setEditTag(t);
    setShowForm(true);
  }, []);

  if (!activeChild) {
    return (
      <EmptyState
        icon={Tags}
        title={tc("no_child_selected")}
        description={tc("no_child_selected_hint")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("tags.title")}>
        <Button
          variant={showForm ? "danger" : "primary"}
          onClick={() => {
            setShowForm(!showForm);
            setEditTag(undefined);
          }}
          className="flex items-center gap-2"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" /> {tc("cancel")}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {tc("new")}
            </>
          )}
        </Button>
      </PageHeader>

      {showForm && (
        <TagForm tag={editTag} childId={activeChild.id} onDone={handleDone} />
      )}

      {isLoading ? (
        <p className="font-body text-sm text-overlay0">{tc("loading")}</p>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
          <Tags className="h-8 w-8" />
          <p className="font-body text-sm">{t("tags.no_tags")}</p>
          <p className="font-body text-xs">
            {t("tags.no_tags_hint")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tags.map((tg) => (
            <Card
              key={tg.id}
              className="flex items-center justify-between p-3 cursor-pointer active:bg-surface1 transition-colors"
              onClick={() => navigate(`/tags/${tg.id}`)}
            >
              <div className="flex items-center gap-2 min-h-[44px]">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tg.color }}
                />
                <span className="font-heading text-base text-text">{tg.name}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(tg); }}
                  className="rounded p-1.5 text-overlay0 hover:bg-surface1"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t("tags.confirm_delete", { name: tg.name }))) deleteMut.mutate(tg.id);
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
