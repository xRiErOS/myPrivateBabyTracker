/** Media admin page — grid overview of all milestone photos with management actions. */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  Tag,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { useActiveChild } from "../context/ChildContext";
import { TagBadges } from "../components/TagBadges";
import { TagSelector } from "../components/TagSelector";
import { isPluginEnabled } from "../lib/pluginConfig";
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
  const [tagEditPhotoId, setTagEditPhotoId] = useState<number | null>(null);
  const tagsEnabled = isPluginEnabled("tags");

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
    const count = selectedIds.size;
    if (!confirm(`${count} ${count === 1 ? "Foto" : "Fotos"} endgueltig loeschen?\n\nDieser Vorgang kann nicht rueckgaengig gemacht werden.`)) return;
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
          <div className="flex gap-2">
            <Button variant="secondary" className="flex items-center gap-1.5" onClick={handleBulkDownload}>
              <Download className="h-4 w-4" />
              ZIP
            </Button>
            <Button
              variant="danger"
              className="flex items-center gap-1.5"
              onClick={() => {
                if (!confirm(`Alle ${storageInfo.total_photos} Fotos endgueltig loeschen?\n\nDieser Vorgang kann nicht rueckgaengig gemacht werden.\nAlle Meilenstein-Fotos werden unwiderruflich entfernt.`)) return;
                // Select all and delete
                for (const photo of photos) {
                  deleteMut.mutate(photo.id);
                }
                setSelectedIds(new Set());
              }}
            >
              <Trash2 className="h-4 w-4" />
              Alle loeschen
            </Button>
          </div>
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

        {/* Select all toggle */}
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
      </div>

      {/* Bulk delete bar — shown when photos are selected */}
      {selectedIds.size > 0 && (
        <Card className="p-3 flex items-center justify-between bg-red/10 border border-red/30">
          <p className="font-label text-sm text-text">
            <span className="font-semibold">{selectedIds.size}</span>{" "}
            {selectedIds.size === 1 ? "Foto" : "Fotos"} ausgewaehlt
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex items-center gap-1.5"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
              Abbrechen
            </Button>
            <Button
              variant="secondary"
              className="flex items-center gap-1.5"
              onClick={() => {
                if (selectedIds.size === 1) {
                  // Single photo: direct download
                  const photo = photos.find((p) => selectedIds.has(p.id));
                  if (photo) handleDownload(photo);
                } else if (childId) {
                  // Multiple photos: use ZIP endpoint
                  window.open(`/api/v1/milestones/media/download-zip?child_id=${childId}`, "_blank");
                }
              }}
            >
              <Download className="h-4 w-4" />
              Herunterladen
            </Button>
            <Button
              variant="danger"
              className="flex items-center gap-1.5"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4" />
              Endgueltig loeschen
            </Button>
          </div>
        </Card>
      )}

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
              <div key={photo.id} className="flex flex-col gap-1">
              <div
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

                {/* Selection checkbox — always visible */}
                <button
                  type="button"
                  className={`absolute top-1 left-1 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-mauve border-mauve text-white"
                      : "border-white/80 bg-black/30 text-white/60"
                  }`}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>

                {/* Fullscreen button — always visible */}
                <button
                  type="button"
                  className="absolute top-1 right-1 z-10 w-7 h-7 rounded-full bg-black/30 border border-white/40 flex items-center justify-center text-white/80 active:bg-black/60"
                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(photoUrl(photo.file_path, false)); }}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>

                {/* Caption: milestone title + category */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
                  <p className="text-[10px] font-label text-white font-semibold truncate leading-tight">
                    {photo.milestone_title}
                  </p>
                  {cat && (
                    <p className="text-[9px] font-label text-white/70 truncate leading-tight">
                      {cat.name}
                    </p>
                  )}
                </div>

                {/* Action buttons — visible when selected */}
                {isSelected && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleDownload(photo)}
                      className="h-9 w-9 flex items-center justify-center rounded-full bg-surface0/90 text-text border border-surface2"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {tagsEnabled && (
                      <button
                        type="button"
                        onClick={() => setTagEditPhotoId(tagEditPhotoId === photo.id ? null : photo.id)}
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-surface0/90 text-mauve border border-surface2"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startReplace(photo)}
                      className="h-9 w-9 flex items-center justify-center rounded-full bg-surface0/90 text-text border border-surface2"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(photo)}
                      className="h-9 w-9 flex items-center justify-center rounded-full bg-red/90 text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {/* Tag badges below photo */}
              {tagsEnabled && <TagBadges entryType="photo" entryId={photo.id} />}
              {/* Tag selector panel */}
              {tagsEnabled && tagEditPhotoId === photo.id && (
                <div className="rounded-lg border border-surface2 bg-surface0 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label text-xs text-subtext0">Tags</span>
                    <button type="button" onClick={() => setTagEditPhotoId(null)} className="text-overlay0 hover:text-text">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <TagSelector entryType="photo" entryId={photo.id} />
                </div>
              )}
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
