/** Children management — list + create/edit form + export + purge. */

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Baby, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Input";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  useChildren,
  useCreateChild,
  useUpdateChild,
} from "../hooks/useChildren";
import { getPurgePreview, purgeChildData, type PurgePreview } from "../api/children";
import { useToast } from "../context/ToastContext";
import type { Child, Gender } from "../api/types";

// ---------------------------------------------------------------------------
// Purge Modal
// ---------------------------------------------------------------------------

interface PurgeModalProps {
  child: Child;
  onClose: () => void;
  onPurged: () => void;
}

function PurgeModal({ child, onClose, onPurged }: PurgeModalProps) {
  const { t } = useTranslation("admin");
  const { showToast } = useToast();
  const [preview, setPreview] = useState<PurgePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [confirmName, setConfirmName] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [nameError, setNameError] = useState(false);

  // Load preview on mount
  useEffect(() => {
    getPurgePreview(child.id)
      .then((p) => setPreview(p))
      .finally(() => setPreviewLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  const totalRecords = preview
    ? Object.values(preview.counts).reduce((a, b) => a + b, 0)
    : 0;

  const handlePurge = async () => {
    if (confirmName !== child.name) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setIsPurging(true);
    try {
      await purgeChildData(child.id, false);
      showToast(t("children.purge_success", { name: child.name }));
      onPurged();
      onClose();
    } catch {
      showToast(t("children.purge_success", { name: child.name }), "error");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-surface0 rounded-[12px] shadow-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-base font-semibold text-red">
            {t("children.purge_title")}
          </h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-overlay0 hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning */}
        <div className="rounded-[8px] bg-red/10 border border-red/30 p-3">
          <p className="font-body text-sm text-red font-medium">
            {t("children.purge_warning", { name: child.name })}
          </p>
        </div>

        {/* Preview counts */}
        {previewLoading ? (
          <p className="font-body text-xs text-subtext0">{t("children.purge_preview_loading")}</p>
        ) : preview ? (
          <div className="space-y-1">
            <p className="font-label text-xs font-semibold text-subtext0 uppercase tracking-wide">
              {t("children.purge_counts_label")}
            </p>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {Object.entries(preview.counts)
                .filter(([, count]) => count > 0)
                .map(([table, count]) => (
                  <div key={table} className="flex justify-between font-body text-xs text-text">
                    <span className="text-subtext0">{table}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              {totalRecords === 0 && (
                <p className="font-body text-xs text-subtext0">Keine Datensaetze vorhanden.</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Name confirmation */}
        <div className="space-y-1">
          <label className="font-label text-xs font-semibold text-subtext0">
            {t("children.purge_confirm_label")}
          </label>
          <Input
            value={confirmName}
            onChange={(e) => {
              setConfirmName(e.target.value);
              setNameError(false);
            }}
            placeholder={child.name}
          />
          {nameError && (
            <p className="font-body text-xs text-red">{t("children.purge_confirm_mismatch")}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="danger"
            disabled={isPurging || confirmName !== child.name}
            onClick={handlePurge}
            className="flex-1"
          >
            {isPurging ? t("children.purge_loading") : t("children.purge_btn")}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ChildrenPage() {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const { data: children = [], isLoading, refetch } = useChildren();
  const createChild = useCreateChild();
  const updateChild = useUpdateChild();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [purgeChild, setPurgeChild] = useState<Child | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isPreterm, setIsPreterm] = useState(false);
  const [estimatedBirthDate, setEstimatedBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [birthWeight, setBirthWeight] = useState("");
  const [birthLength, setBirthLength] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editIsPreterm, setEditIsPreterm] = useState(false);
  const [editEstimatedBirthDate, setEditEstimatedBirthDate] = useState("");
  const [editGender, setEditGender] = useState<Gender | "">("");
  const [editBirthWeight, setEditBirthWeight] = useState("");
  const [editBirthLength, setEditBirthLength] = useState("");

  const resetCreateForm = () => {
    setName("");
    setBirthDate("");
    setIsPreterm(false);
    setEstimatedBirthDate("");
    setGender("");
    setBirthWeight("");
    setBirthLength("");
    setShowForm(false);
  };

  const startEdit = (child: Child) => {
    setEditingId(child.id);
    setEditName(child.name);
    setEditBirthDate(child.birth_date);
    setEditIsPreterm(child.is_preterm);
    setEditEstimatedBirthDate(child.estimated_birth_date ?? "");
    setEditGender(child.gender ?? "");
    setEditBirthWeight(child.birth_weight_g != null ? String(child.birth_weight_g) : "");
    setEditBirthLength(
      child.birth_length_cm != null ? String(child.birth_length_cm) : ""
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;

    await createChild.mutateAsync({
      name: name.trim(),
      birth_date: birthDate,
      is_preterm: isPreterm,
      estimated_birth_date: estimatedBirthDate || null,
      gender: gender || null,
      birth_weight_g: birthWeight ? Number(birthWeight) : null,
      birth_length_cm: birthLength ? birthLength : null,
    });

    resetCreateForm();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editBirthDate || editingId === null) return;

    await updateChild.mutateAsync({
      id: editingId,
      data: {
        name: editName.trim(),
        birth_date: editBirthDate,
        is_preterm: editIsPreterm,
        estimated_birth_date: editEstimatedBirthDate || null,
        gender: editGender || null,
        birth_weight_g: editBirthWeight ? Number(editBirthWeight) : null,
        birth_length_cm: editBirthLength ? editBirthLength : null,
      },
    });

    setEditingId(null);
  };

  const handleExport = (childId: number, format: "json" | "csv") => {
    window.open(`/api/v1/children/${childId}/export?format=${format}`, "_blank");
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <PageHeader title={t("children.title")}>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          {t("children.add")}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label={t("children.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("children.name_placeholder")}
              required
              maxLength={100}
            />
            <Input
              label={t("children.birth_date")}
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />

            <Input
              label={t("children.estimated_birth_date")}
              type="date"
              value={estimatedBirthDate}
              onChange={(e) => setEstimatedBirthDate(e.target.value)}
            />
            <p className="font-body text-xs text-subtext0 -mt-2">
              {t("children.estimated_birth_date_hint")}
            </p>

            <div className="space-y-1">
              <label className="font-label text-xs font-semibold text-subtext0">
                {t("children.gender")}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | "")}
                className="w-full min-h-[44px] px-3 rounded-[8px] bg-surface0 border border-surface1 text-text font-body text-base focus:outline-none focus:border-mauve"
              >
                <option value="">{t("children.gender_unspecified")}</option>
                <option value="female">{t("children.gender_female")}</option>
                <option value="male">{t("children.gender_male")}</option>
                <option value="other">{t("children.gender_other")}</option>
              </select>
            </div>

            <Input
              label={t("children.birth_weight_g")}
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              step={1}
              value={birthWeight}
              onChange={(e) => setBirthWeight(e.target.value)}
              placeholder={t("children.birth_weight_placeholder")}
            />
            <Input
              label={t("children.birth_length_cm")}
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.1}
              value={birthLength}
              onChange={(e) => setBirthLength(e.target.value)}
              placeholder={t("children.birth_length_placeholder")}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={createChild.isPending}>
                {createChild.isPending ? tc("saving") : tc("save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetCreateForm}
              >
                {tc("cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {children.length === 0 ? (
        <EmptyState
          icon={Baby}
          title={t("children.no_children")}
          description={t("children.no_children_hint")}
        />
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <div key={child.id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-label text-sm font-semibold text-text">
                    {child.name}
                  </p>
                  <p className="font-body text-xs text-subtext0">
                    {format(new Date(child.birth_date), "dd.MM.yyyy")}
                    {child.estimated_birth_date && (
                      <span className="ml-2">
                        (ET: {format(new Date(child.estimated_birth_date), "dd.MM.yyyy")})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {/* Edit Button */}
                  <button
                    onClick={() =>
                      editingId === child.id ? cancelEdit() : startEdit(child)
                    }
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-overlay0 hover:text-text transition-colors"
                    aria-label={`${child.name} bearbeiten`}
                  >
                    {editingId === child.id ? (
                      <X size={18} />
                    ) : (
                      <Pencil size={18} />
                    )}
                  </button>
                </div>
              </Card>

              {/* Inline Edit Form */}
              {editingId === child.id && (
                <Card className="mt-0 rounded-t-none border-t border-surface1">
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <Input
                      label={t("children.name")}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t("children.name_placeholder")}
                      required
                      maxLength={100}
                    />
                    <Input
                      label={t("children.birth_date")}
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      required
                    />

                    <Input
                      label={t("children.estimated_birth_date")}
                      type="date"
                      value={editEstimatedBirthDate}
                      onChange={(e) =>
                        setEditEstimatedBirthDate(e.target.value)
                      }
                    />
                    <p className="font-body text-xs text-subtext0 -mt-2">
                      {t("children.estimated_birth_date_hint")}
                    </p>

                    <div className="space-y-1">
                      <label className="font-label text-xs font-semibold text-subtext0">
                        {t("children.gender")}
                      </label>
                      <select
                        value={editGender}
                        onChange={(e) =>
                          setEditGender(e.target.value as Gender | "")
                        }
                        className="w-full min-h-[44px] px-3 rounded-[8px] bg-surface0 border border-surface1 text-text font-body text-base focus:outline-none focus:border-mauve"
                      >
                        <option value="">{t("children.gender_unspecified")}</option>
                        <option value="female">{t("children.gender_female")}</option>
                        <option value="male">{t("children.gender_male")}</option>
                        <option value="other">{t("children.gender_other")}</option>
                      </select>
                    </div>

                    <Input
                      label={t("children.birth_weight_g")}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={10000}
                      step={1}
                      value={editBirthWeight}
                      onChange={(e) => setEditBirthWeight(e.target.value)}
                      placeholder={t("children.birth_weight_placeholder")}
                    />
                    <Input
                      label={t("children.birth_length_cm")}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.1}
                      value={editBirthLength}
                      onChange={(e) => setEditBirthLength(e.target.value)}
                      placeholder={t("children.birth_length_placeholder")}
                    />

                    <div className="flex gap-2">
                      <Button type="submit" disabled={updateChild.isPending}>
                        {updateChild.isPending
                          ? tc("updating")
                          : tc("update")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEdit}
                      >
                        {tc("cancel")}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Data actions — always visible below child card */}
              {editingId !== child.id && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant="secondary"
                    className="flex items-center gap-1.5 text-sm"
                    onClick={() => handleExport(child.id, "json")}
                  >
                    <Download size={16} />
                    Export JSON
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex items-center gap-1.5 text-sm"
                    onClick={() => handleExport(child.id, "csv")}
                  >
                    <Download size={16} />
                    Export CSV
                  </Button>
                  <Button
                    variant="danger"
                    className="flex items-center gap-1.5 text-sm"
                    onClick={() => setPurgeChild(child)}
                  >
                    <Trash2 size={16} />
                    {t("children.purge_title", { defaultValue: "Alle Daten loeschen" })}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Purge Modal */}
      {purgeChild && (
        <PurgeModal
          child={purgeChild}
          onClose={() => setPurgeChild(null)}
          onPurged={() => {
            void refetch();
          }}
        />
      )}
    </div>
  );
}
