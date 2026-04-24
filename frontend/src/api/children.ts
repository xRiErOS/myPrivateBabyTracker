/** Children API — CRUD operations. */

import { apiFetch } from "./client";
import type { Child, ChildCreate, ChildUpdate } from "./types";

const BASE = "/v1/children/";

export async function listChildren(): Promise<Child[]> {
  return apiFetch<Child[]>(BASE);
}

export async function getChild(id: number): Promise<Child> {
  return apiFetch<Child>(`${BASE}${id}`);
}

export async function createChild(data: ChildCreate): Promise<Child> {
  return apiFetch<Child>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateChild(
  id: number,
  data: ChildUpdate,
): Promise<Child> {
  return apiFetch<Child>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteChild(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}

export interface PurgePreview {
  child_id: number;
  child_name: string;
  counts: Record<string, number>;
}

export interface PurgeResult {
  success: boolean;
  child_id: number;
  child_name: string;
  deleted_child: boolean;
}

export async function getPurgePreview(id: number): Promise<PurgePreview> {
  return apiFetch<PurgePreview>(`${BASE}${id}/purge-preview`);
}

export async function purgeChildData(
  id: number,
  deleteChild = false,
): Promise<PurgeResult> {
  const params = deleteChild ? "?delete_child=true" : "";
  return apiFetch<PurgeResult>(`${BASE}${id}/purge${params}`, {
    method: "DELETE",
    body: JSON.stringify({ confirm: "DELETE ALL DATA" }),
  });
}
