/** Media admin page — grid overview of all milestone photos with management actions. */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { photoUrl } from "../api/milestones";
import {
  useCategories,
  useDeleteMediaPhoto,
  useMedia,
  useReplacePhoto,
  useStorageInfo,
} from "../hooks/useMilestones";
import type { MediaPhoto, MilestoneCategory } from "../api/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default function MediaAdminPage() {
  const { t } = useTranslation("admin");
  const { activeChild } = useActiveChild();
  const childId = activeChild?.id;

  // Filter state
  const [filterCategory, setFilterCategory] = useState<number | "all">("all");

  // Data
  const { data: categories = [] } = useCategories(childId);
  const { data: photos = [], isLoading } = useMedia(
    childId,
    filterCategory === "all" ? undefined : filterCategory,
  );
  const { data: storageInfo } = useStorageInfo(childId);

  // Mutations
  const deleteMut = useDeleteMediaPhoto();
  const replaceMut = useReplacePhoto();

  // UI state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<number | null>(null);
  const [replaceEntryId, setReplaceEntryId] = useState<number | null>(null);

  // Category map
  const categoryMap = useMemo(() => {
    const m = new Map<number, MilestoneCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Selection
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  }, [photos, selectedIds]);

  // Delete selected
  const handleBulkDelete = useCallback(() => {
    if (!selectedIds.size) return;
    if (!confirm(t("media.confirm_bulk_delete", { count: selectedIds.size, defaultValue: `${selectedIds.size} Fotos loeschen?` }))) return;
    for (const id of selectedIds) {
      deleteMut.mutate(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, deleteMut, t]);

  // Single delete
  const handleDelete = useCallback(
    (photo: MediaPhoto) => {
      if (!confirm(t("media.confirm_delete", { defaultValue: "Foto loeschen?" }))) return;
      deleteMut.mutate(photo.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(photo.id);
        return next;
      });
    },
    [deleteMut, t],
  );

  // Replace
  const startReplace = useCallback((photo: MediaPhoto) => {
    setReplaceTargetId(photo.id);
    setReplaceEntryId(photo.milestone_entry_id);
    replaceRef.current?.click();
  }, []);

  const handleReplaceFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || replaceTargetId == null || replaceEntryId == null) return;
      replaceMut.mutate({ entryId: replaceEntryId, photoId: replaceTargetId, file });
      setReplaceTargetId(null);
      setReplaceEntryId(null);
      if (replaceRef.current) replaceRef.current.value = "";
    },
    [replaceTargetId, replaceEntryId, replaceMut],
  );

  // Bulk download as ZIP
  const handleBulkDownload = useCallback(() => {
    if (!childId) return;
    // Use the ZIP endpoint directly
    window.open(`/api/v1/milestones/media/download-zip?child_id=${childId}`, "_blank");
  }, [childId]);

  // Download single photo
  const handleDownload = useCallback((photo: MediaPhoto) => {
    const url = photoUrl(photo.file_path, false);
    const a = document.createElement("a");
    a.href = url;
    a.download = photo.file_name;
    a.click();
  }, []);

  if (!childId) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("media.title", { defaultValue: "Medienverwaltung" })} />
        <p className="font-body text-sm text-overlay0">
          {t("media.no_child", { defaultValue: "Bitte waehle zuerst ein Kind aus." })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("media.title", { defaultValue: "Medienverwaltung" })} />

      {/* Storage info */}
      {storageInfo && (
        <Card className="p-4 flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-mauve flex-shrink-0" />
          <div className="flex-1">
            <p className="font-label text-sm text-text">
              {storageInfo.total_photos} {t("media.photos_count", { defaultValue: "Fotos" })}
            </p>
            <p className="font-body text-xs text-subtext0">
              {formatBytes(storageInfo.total_size_with_thumbs_bytes)}{" "}
              {t("media.storage_used", { defaultValue: "Speicher belegt" })}
            </p>
          </div>
          <Button variant="secondary" className="flex items-center gap-1.5" onClick={handleBulkDownload}>
            <Download className="h-4 w-4" />
            ZIP
          </Button>
        </Card>
      )}

      {/* Filter + actions bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) =>
            setFilterCategory(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="min-h-[44px] rounded-[8px] bg-surface0 px-3 py-2 font-body text-base text-text border-none outline-none focus:ring-2 focus:ring-mauve transition-all flex-1"
        >
          <option value="all">{t("media.all_categories", { defaultValue: "Alle Kategorien" })}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Bulk actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex items-center gap-1.5"
            onClick={selectAll}
          >
            <Check className="h-4 w-4" />
            {selectedIds.size === photos.length && photos.length > 0
              ? t("media.deselect_all", { defaultValue: "Keine" })
              : t("media.select_all", { defaultValue: "Alle" })}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="danger"
              className="flex items-center gap-1.5"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4" />
              {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      {/* Photo grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-[8px] bg-surface1 animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
          <ImageIcon className="h-8 w-8" />
          <p className="font-body text-sm">
            {t("media.empty", { defaultValue: "Keine Fotos vorhanden" })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {photos.map((photo) => {
            const isSelected = selectedIds.has(photo.id);
            const cat = categoryMap.get(photo.category_id);
            return (
              <div
                key={photo.id}
                className={`relative group aspect-square rounded-[8px] overflow-hidden bg-surface1 cursor-pointer ${
                  isSelected ? "ring-2 ring-mauve" : ""
                }`}
                onClick={() => toggleSelect(photo.id)}
              >
                <img
                  src={photoUrl(photo.file_path, true)}
                  alt={photo.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Selection checkbox */}
                <div
                  className={`absolute top-1 left-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-mauve border-mauve text-white"
                      : "border-white/60 bg-black/20 text-transparent group-hover:text-white"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </div>

                {/* Category badge */}
                {cat && (
                  <span
                    className="absolute bottom-1 left-1 text-[9px] font-label text-white bg-black/50 px-1.5 py-0.5 rounded-full max-w-[90%] truncate"
                  >
                    {cat.name}
                  </span>
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(photoUrl(photo.file_path, false))}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/80 text-text"
                    title={t("media.view", { defaultValue: "Ansehen" })}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(photo)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/80 text-text"
                    title={t("media.download", { defaultValue: "Download" })}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startReplace(photo)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/80 text-text"
                    title={t("media.replace", { defaultValue: "Ersetzen" })}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-red/80 text-white"
                    title={t("media.delete", { defaultValue: "Loeschen" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Info tooltip on hover */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-label text-white bg-black/50 px-1.5 py-0.5 rounded-full">
                    {fmtDate(photo.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden replace file input */}
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 h-12 w-12 flex items-center justify-center text-white hover:text-peach transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="Vollbild"
            className="max-w-full max-h-full object-contain rounded-[8px]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
