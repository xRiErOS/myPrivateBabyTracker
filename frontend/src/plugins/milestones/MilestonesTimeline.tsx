/** Milestones timeline — vertical chronological view with photos. */

import { useMemo, useRef, useState } from "react";
import { Camera, Star, X, ZoomIn } from "lucide-react";
import { getCategoryIcon } from "./categoryIcons";
import { useTranslation } from "react-i18next";
import { photoUrl } from "../../api/milestones";
import { useActiveChild } from "../../context/ChildContext";
import { useCategories, useMilestoneEntries, useUploadPhoto } from "../../hooks/useMilestones";
import type { MilestoneCategory, MilestoneEntry, MilestonePhoto } from "../../api/types";

const MAX_PHOTOS = 4;

/** Calculate age label from birth date to achieved date. */
function ageLabel(birthDate: string, achievedDate: string): string {
  const birth = new Date(birthDate);
  const achieved = new Date(achievedDate);
  const diffDays = Math.floor((achieved.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 12) return `${weeks} Wo.`;
  const months = Math.round(diffDays / 30.44);
  return `${months} Mon.`;
}

/** Format date to German locale. */
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

interface TimelineItemProps {
  entry: MilestoneEntry;
  category: MilestoneCategory | undefined;
  birthDate: string;
  side: "left" | "right";
  onPhotoClick: (url: string) => void;
  onUploadPhoto: (entryId: number, file: File) => void;
  uploading: boolean;
}

function TimelineItem({ entry, category, birthDate, side, onPhotoClick, onUploadPhoto, uploading }: TimelineItemProps) {
  const photo = entry.photos[0] as MilestonePhoto | undefined;
  const catColor = category?.color ?? "#8087a2";
  const CategoryIcon = getCategoryIcon(category?.name);
  const canUpload = entry.photos.length < MAX_PHOTOS;
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadPhoto(entry.id, file);
    if (e.target) e.target.value = "";
  }

  return (
    <div
      className={`flex gap-3 md:gap-6 ${
        side === "right" ? "md:flex-row-reverse" : ""
      }`}
    >
      {/* Content card */}
      <div className="flex-1 min-w-0">
        <div className="bg-surface0 rounded-card p-3">
          {/* Photo or placeholder */}
          {photo ? (
            <div
              className="relative w-full aspect-[4/3] rounded-[8px] overflow-hidden bg-surface1 mb-2 cursor-pointer group"
              onClick={() => onPhotoClick(photoUrl(photo.file_path, false))}
            >
              <img
                src={photoUrl(photo.file_path, true)}
                alt={entry.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white" />
              </div>
              {/* Additional photo count badge */}
              {entry.photos.length > 1 && (
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-label px-2 py-0.5 rounded-full">
                  +{entry.photos.length - 1}
                </span>
              )}
            </div>
          ) : (
            <div
              className="w-full aspect-[4/3] rounded-[8px] flex items-center justify-center mb-2"
              style={{ backgroundColor: catColor + "20" }}
            >
              <CategoryIcon className="h-10 w-10" style={{ color: catColor }} />
            </div>
          )}

          {/* Title + category */}
          <h3 className="font-headline text-text text-sm font-semibold break-words">
            {entry.title}
          </h3>
          {category && (
            <span className="inline-flex items-center gap-1 text-xs font-label text-subtext0 mt-0.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: catColor }}
              />
              {category.name}
            </span>
          )}

          {/* Date + age */}
          {entry.completed_date && (
            <p className="font-body text-xs text-overlay0 mt-1">
              {fmtDate(entry.completed_date)}
              {" — "}
              {ageLabel(birthDate, entry.completed_date)}
            </p>
          )}

          {/* Notes */}
          {entry.notes && (
            <p className="font-body text-xs text-subtext0 mt-1 whitespace-pre-wrap break-words">
              {entry.notes}
            </p>
          )}

          {/* Upload button — only when < 3 photos */}
          {canUpload && (
            <div className="mt-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-label text-overlay0 hover:text-mauve transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="h-3.5 w-3.5 border border-mauve border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                Foto hinzufügen ({entry.photos.length}/{MAX_PHOTOS})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline dot (desktop: center line) */}
      <div className="hidden md:flex flex-col items-center">
        <div
          className="w-4 h-4 rounded-full border-2 border-ground flex-shrink-0"
          style={{ backgroundColor: catColor }}
        />
        <div className="w-0.5 flex-1 bg-surface2" />
      </div>

      {/* Spacer for alternating layout (desktop only) */}
      <div className="hidden md:block flex-1" />
    </div>
  );
}

export function MilestonesTimeline() {
  const { t } = useTranslation("milestones");
  const { activeChild } = useActiveChild();
  const childId = activeChild?.id;
  const birthDate = activeChild?.birth_date ?? "";

  const { data: entries = [] } = useMilestoneEntries({
    child_id: childId,
    completed: true,
  });
  const { data: categories = [] } = useCategories(childId);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const uploadMut = useUploadPhoto();

  const categoryMap = useMemo(() => {
    const m = new Map<number, MilestoneCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Sort by completed_date ascending (chronological)
  const sorted = useMemo(() => {
    return [...entries]
      .filter((e) => e.completed_date)
      .sort((a, b) => (a.completed_date ?? "").localeCompare(b.completed_date ?? ""));
  }, [entries]);

  function handleUploadPhoto(milestoneId: number, file: File) {
    setUploadingId(milestoneId);
    uploadMut.mutate(
      { milestoneId, file },
      { onSettled: () => setUploadingId(null) },
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-overlay0">
        <Star className="h-8 w-8" />
        <p className="font-body text-sm">{t("timeline_empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile: linear layout. Desktop: alternating left/right with center line */}
      <div className="relative">
        {/* Center line (desktop only) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-surface2 -translate-x-1/2" />

        <div className="flex flex-col gap-4 md:gap-6">
          {sorted.map((entry, idx) => (
            <TimelineItem
              key={entry.id}
              entry={entry}
              category={categoryMap.get(entry.category_id)}
              birthDate={birthDate}
              side={idx % 2 === 0 ? "left" : "right"}
              onPhotoClick={setLightboxUrl}
              onUploadPhoto={handleUploadPhoto}
              uploading={uploadingId === entry.id}
            />
          ))}
        </div>
      </div>

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
