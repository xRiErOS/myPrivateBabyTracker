/** Tag API — CRUD operations for tags and entry-tag associations. */

import { apiFetch } from "./client";
import type { Tag, TagCreate, TagUpdate, EntryTag, EntryTagCreate } from "./types";

const BASE = "/v1/tags/";

export async function listTags(childId?: number): Promise<Tag[]> {
  const qs = childId ? `?child_id=${childId}` : "";
  return apiFetch<Tag[]>(`${BASE}${qs}`);
}

export async function createTag(data: TagCreate): Promise<Tag> {
  return apiFetch<Tag>(BASE, { method: "POST", body: JSON.stringify(data) });
}

export async function updateTag(id: number, data: TagUpdate): Promise<Tag> {
  return apiFetch<Tag>(`${BASE}${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteTag(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}

export async function attachTag(data: EntryTagCreate): Promise<EntryTag> {
  return apiFetch<EntryTag>(`${BASE}entries`, { method: "POST", body: JSON.stringify(data) });
}

export async function detachTag(entryTagId: number): Promise<void> {
  return apiFetch<void>(`${BASE}entries/${entryTagId}`, { method: "DELETE" });
}

export async function listEntryTags(entryType?: string, entryId?: number, tagId?: number): Promise<EntryTag[]> {
  const params = new URLSearchParams();
  if (entryType) params.set("entry_type", entryType);
  if (entryId) params.set("entry_id", String(entryId));
  if (tagId) params.set("tag_id", String(tagId));
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<EntryTag[]>(`${BASE}entries/${qs}`);
}

export async function bulkDetachTags(entryTagIds: number[]): Promise<void> {
  return apiFetch<void>(`${BASE}entries/bulk-detach`, {
    method: "POST",
    body: JSON.stringify(entryTagIds),
  });
}
