/** React Query hooks for Milestones CRUD. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeMilestone,
  createCategory,
  createMilestone,
  deleteCategory,
  deleteMediaPhoto,
  deleteMilestone,
  deletePhoto,
  getLeapStatus,
  getStorageInfo,
  getSuggestions,
  listCategories,
  listLeaps,
  listMedia,
  listMilestones,
  listTemplates,
  replacePhoto,
  updateCategory,
  updateMilestone,
  uploadPhoto,
  type MilestoneListParams,
  type TemplateListParams,
} from "../api/milestones";
import type {
  CategoryCreate,
  CategoryUpdate,
  MilestoneCompleteRequest,
  MilestoneCreate,
  MilestoneUpdate,
} from "../api/types";
import { useToast } from "../context/ToastContext";

const MILESTONES_KEY = ["milestones"] as const;
const CATEGORIES_KEY = ["milestone-categories"] as const;
const TEMPLATES_KEY = ["milestone-templates"] as const;
const LEAPS_KEY = ["leaps"] as const;

// --- Categories ---

export function useCategories(childId?: number) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, childId],
    queryFn: () => listCategories(childId),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: CategoryCreate) => createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      showToast("Kategorie erstellt");
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) => updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      showToast("Kategorie aktualisiert");
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      showToast("Kategorie geloescht");
    },
  });
}

// --- Templates ---

export function useTemplates(params: TemplateListParams = {}) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, params],
    queryFn: () => listTemplates(params),
  });
}

export function useSuggestions(childId?: number) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, "suggestions", childId],
    queryFn: () => getSuggestions(childId!),
    enabled: !!childId,
  });
}

// --- Entries ---

export function useMilestoneEntries(params: MilestoneListParams = {}) {
  return useQuery({
    queryKey: [...MILESTONES_KEY, params],
    queryFn: () => listMilestones(params),
    enabled: !!params.child_id,
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (data: MilestoneCreate) => createMilestone(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      showToast("Meilenstein eingetragen");
    },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MilestoneUpdate }) => updateMilestone(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      showToast("Meilenstein aktualisiert");
    },
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (id: number) => deleteMilestone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      showToast("Meilenstein geloescht");
    },
  });
}

export function useCompleteMilestone() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MilestoneCompleteRequest }) => completeMilestone(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      showToast("Meilenstein erreicht!");
    },
  });
}

// --- Photos ---

export function useUploadPhoto() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ milestoneId, file }: { milestoneId: number; file: File }) => uploadPhoto(milestoneId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      qc.invalidateQueries({ queryKey: MEDIA_KEY });
      showToast("Foto hochgeladen");
    },
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ milestoneId, photoId }: { milestoneId: number; photoId: number }) => deletePhoto(milestoneId, photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      qc.invalidateQueries({ queryKey: MEDIA_KEY });
      showToast("Foto geloescht");
    },
  });
}

export function useReplacePhoto() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ entryId, photoId, file }: { entryId: number; photoId: number; file: File }) =>
      replacePhoto(entryId, photoId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      qc.invalidateQueries({ queryKey: MEDIA_KEY });
      showToast("Foto ersetzt");
    },
  });
}

// --- Media Management ---

const MEDIA_KEY = ["milestones-media"] as const;

export function useMedia(childId?: number, categoryId?: number) {
  return useQuery({
    queryKey: [...MEDIA_KEY, childId, categoryId],
    queryFn: () => listMedia(childId!, categoryId),
    enabled: !!childId,
  });
}

export function useStorageInfo(childId?: number) {
  return useQuery({
    queryKey: [...MEDIA_KEY, "storage", childId],
    queryFn: () => getStorageInfo(childId),
  });
}

export function useDeleteMediaPhoto() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (photoId: number) => deleteMediaPhoto(photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MILESTONES_KEY });
      qc.invalidateQueries({ queryKey: MEDIA_KEY });
      showToast("Foto geloescht");
    },
  });
}

// --- Leaps ---

export function useLeaps() {
  return useQuery({
    queryKey: LEAPS_KEY,
    queryFn: () => listLeaps(),
  });
}

export function useLeapStatus(childId?: number) {
  return useQuery({
    queryKey: [...LEAPS_KEY, "status", childId],
    queryFn: () => getLeapStatus(childId!),
    enabled: !!childId,
  });
}
