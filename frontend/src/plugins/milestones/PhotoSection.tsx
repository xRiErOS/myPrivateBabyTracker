/** Photo section for milestone detail — upload, thumbnails, lightbox, delete, tags. */

import { useRef, useState } from "react";
import { Camera, Tag, Trash2, X, ZoomIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { photoUrl } from "../../api/milestones";
import { TagBadges } from "../../components/TagBadges";
import { TagSelector } from "../../components/TagSelector";
import { isPluginEnabled } from "../../lib/pluginConfig";
import { useDeletePhoto, useUploadPhoto } from "../../hooks/useMilestones";
import type { MilestonePhoto } from "../../api/types";

const MAX_PHOTOS = 4;

interface PhotoSectionProps {
  entryId: number;
  photos: MilestonePhoto[];
}

export function PhotoSection({ entryId, photos }: PhotoSectionProps) {
  const { t } = useTranslation("milestones");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadPhoto();
  const deleteMut = useDeletePhoto();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Track which photo has its TagSelector open
  const [tagEditPhotoId, setTagEditPhotoId] = useState<number | null>(null);

  const canUpload = photos.length < MAX_PHOTOS;
  const tagsEnabled = isPluginEnabled("tags");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadMut.mutate(
      { milestoneId: entryId, file },
      {
        onSettled: () => {
          setUploading(false);
          if (fileRef.current) fileRef.current.value = "";
        },
      },
    );
  }

  function handleDelete(photo: MilestonePhoto) {
    if (!confirm(t("photo_delete_confirm", { defaultValue: "Foto loeschen?" }))) return;
    deleteMut.mutate({ milestoneId: entryId, photoId: photo.id });
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-label text-sm font-medium text-subtext0">
        {t("photos", { defaultValue: "Fotos" })} ({photos.length}/{MAX_PHOTOS})
      </h4>

      {/* Thumbnail grid — adaptive layout based on photo count */}
      <div className={`grid gap-2 ${
        photos.length <= 1 ? "grid-cols-1" :
        photos.length === 2 ? "grid-cols-2" :
        "grid-cols-2 sm:grid-cols-4"
      }`} style={{ maxWidth: photos.length <= 2 ? `${photos.length * 88 + (photos.length - 1) * 8 + 88}px` : undefined }}>
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col gap-1">
            <div
              className="relative group aspect-square rounded-[8px] overflow-hidden bg-surface1"
            >
              <img
                src={photoUrl(photo.file_path, true)}
                alt={photo.file_name}
                className="w-full h-full object-cover cursor-pointer"
                loading="lazy"
                onClick={() => setLightboxUrl(photoUrl(photo.file_path, false))}
              />
              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => setLightboxUrl(photoUrl(photo.file_path, false))}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-white/80 text-text"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {tagsEnabled && (
                  <button
                    type="button"
                    onClick={() => setTagEditPhotoId(tagEditPhotoId === photo.id ? null : photo.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white/80 text-mauve"
                    title="Tags verwalten"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(photo)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-red/80 text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Tag badges below thumbnail */}
            {tagsEnabled && (
              <TagBadges entryType="photo" entryId={photo.id} />
            )}
          </div>
        ))}

        {/* Upload skeleton while uploading */}
        {uploading && (
          <div className="aspect-square rounded-[8px] bg-surface1 animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-mauve border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Upload button */}
        {canUpload && !uploading && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-[8px] border-2 border-dashed border-surface2 flex flex-col items-center justify-center gap-1 text-overlay0 hover:text-mauve hover:border-mauve transition-colors min-h-[80px]"
          >
            <Camera className="h-5 w-5" />
            <span className="text-[10px] font-label">{t("photo_upload")}</span>
          </button>
        )}
      </div>

      {/* Tag selector panel — shown when a photo's tag icon is clicked */}
      {tagsEnabled && tagEditPhotoId != null && (
        <div className="rounded-lg border border-surface2 bg-surface0 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label text-xs text-subtext0">Foto-Tags</span>
            <button
              type="button"
              onClick={() => setTagEditPhotoId(null)}
              className="text-overlay0 hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <TagSelector entryType="photo" entryId={tagEditPhotoId} />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"

        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Lightbox modal */}
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
