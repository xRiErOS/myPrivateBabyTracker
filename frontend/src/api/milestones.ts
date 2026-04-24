/** Milestones API — categories, templates, entries, photos, leaps. */

import { apiFetch } from "./client";
import type {
  CategoryCreate,
  CategoryUpdate,
  LeapDefinition,
  LeapStatusResponse,
  MediaPhoto,
  MilestoneCategory,
  MilestoneCompleteRequest,
  MilestoneCreate,
  MilestoneEntry,
  MilestonePhoto,
  MilestoneSourceType,
  MilestoneSuggestion,
  MilestoneTemplate,
  MilestoneUpdate,
  StorageInfo,
} from "./types";

// --- Categories ---

export async function listCategories(childId?: number): Promise<MilestoneCategory[]> {
  const qs = childId ? `?child_id=${childId}` : "";
  return apiFetch<MilestoneCategory[]>(`/v1/milestone-categories/${qs}`);
}

export async function createCategory(data: CategoryCreate): Promise<MilestoneCategory> {
  return apiFetch<MilestoneCategory>("/v1/milestone-categories/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: number, data: CategoryUpdate): Promise<MilestoneCategory> {
  return apiFetch<MilestoneCategory>(`/v1/milestone-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return apiFetch<void>(`/v1/milestone-categories/${id}`, { method: "DELETE" });
}

// --- Templates ---

export interface TemplateListParams {
  category_id?: number;
  source_type?: MilestoneSourceType;
}

export async function listTemplates(params: TemplateListParams = {}): Promise<MilestoneTemplate[]> {
  const sp = new URLSearchParams();
  if (params.category_id) sp.set("category_id", String(params.category_id));
  if (params.source_type) sp.set("source_type", params.source_type);
  const qs = sp.toString();
  return apiFetch<MilestoneTemplate[]>(`/v1/milestone-templates/${qs ? `?${qs}` : ""}`);
}

export async function getSuggestions(childId: number): Promise<MilestoneSuggestion[]> {
  return apiFetch<MilestoneSuggestion[]>(`/v1/milestone-templates/suggestions?child_id=${childId}`);
}

// --- Entries ---

export interface MilestoneListParams {
  child_id?: number;
  category_id?: number;
  completed?: boolean;
  source_type?: MilestoneSourceType;
  date_from?: string;
  date_to?: string;
  q?: string;
}

export async function listMilestones(params: MilestoneListParams = {}): Promise<MilestoneEntry[]> {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.category_id) sp.set("category_id", String(params.category_id));
  if (params.completed !== undefined) sp.set("completed", String(params.completed));
  if (params.source_type) sp.set("source_type", params.source_type);
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return apiFetch<MilestoneEntry[]>(`/v1/milestones/${qs ? `?${qs}` : ""}`);
}

export async function getMilestone(id: number): Promise<MilestoneEntry> {
  return apiFetch<MilestoneEntry>(`/v1/milestones/${id}`);
}

export async function createMilestone(data: MilestoneCreate): Promise<MilestoneEntry> {
  return apiFetch<MilestoneEntry>("/v1/milestones/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMilestone(id: number, data: MilestoneUpdate): Promise<MilestoneEntry> {
  return apiFetch<MilestoneEntry>(`/v1/milestones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteMilestone(id: number): Promise<void> {
  return apiFetch<void>(`/v1/milestones/${id}`, { method: "DELETE" });
}

export async function completeMilestone(id: number, data: MilestoneCompleteRequest): Promise<MilestoneEntry> {
  return apiFetch<MilestoneEntry>(`/v1/milestones/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Photos ---

/** Get CSRF token from cookie for multipart uploads (can't use apiFetch). */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function uploadPhoto(milestoneId: number, file: File): Promise<MilestonePhoto> {
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;
  const resp = await fetch(`/api/v1/milestones/${milestoneId}/photo`, {
    method: "POST",
    body: form,
    credentials: "same-origin",
    headers,
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Upload failed: ${resp.status} ${body}`);
  }
  return resp.json();
}

export async function deletePhoto(milestoneId: number, photoId: number): Promise<void> {
  return apiFetch<void>(`/v1/milestones/${milestoneId}/photo/${photoId}`, { method: "DELETE" });
}

// --- Media Management ---

export async function listMedia(childId: number, categoryId?: number): Promise<MediaPhoto[]> {
  const sp = new URLSearchParams({ child_id: String(childId) });
  if (categoryId) sp.set("category_id", String(categoryId));
  return apiFetch<MediaPhoto[]>(`/v1/milestones/media/?${sp}`);
}

export async function getStorageInfo(childId?: number): Promise<StorageInfo> {
  const qs = childId ? `?child_id=${childId}` : "";
  return apiFetch<StorageInfo>(`/v1/milestones/media/storage${qs}`);
}

export async function deleteMediaPhoto(photoId: number): Promise<void> {
  return apiFetch<void>(`/v1/milestones/media/${photoId}`, { method: "DELETE" });
}

export async function replacePhoto(entryId: number, photoId: number, file: File): Promise<MilestonePhoto> {
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;
  const resp = await fetch(`/api/v1/milestones/${entryId}/photos/${photoId}`, {
    method: "PATCH",
    body: form,
    credentials: "same-origin",
    headers,
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Replace failed: ${resp.status} ${body}`);
  }
  return resp.json();
}

/** Build auth-proxied photo URL. Use thumb=true for thumbnail. */
export function photoUrl(filePath: string, thumb = false): string {
  // filePath format: milestones/{child_id}/{filename}
  const parts = filePath.split("/");
  if (parts.length < 3) return "";
  const subPath = `${parts[1]}/${parts[2]}`;
  return `/api/v1/milestones/photos/${subPath}${thumb ? "?thumb=true" : ""}`;
}

// --- Leaps ---

export async function listLeaps(): Promise<LeapDefinition[]> {
  return apiFetch<LeapDefinition[]>("/v1/leaps/");
}

export async function getLeapStatus(childId: number): Promise<LeapStatusResponse> {
  return apiFetch<LeapStatusResponse>(`/v1/leaps/status?child_id=${childId}`);
}
