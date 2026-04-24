/** Notes API — CRUD operations for shared parent notes. */

import { apiFetch } from "./client";

export interface SharedNote {
  id: number;
  child_id: number;
  title: string;
  content: string;
  pinned: boolean;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  child_id: number;
  title: string;
  content: string;
  pinned?: boolean;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  pinned?: boolean;
}

const BASE = "/v1/notes/";

export async function listNotes(childId?: number): Promise<SharedNote[]> {
  const qs = childId ? `?child_id=${childId}` : "";
  return apiFetch<SharedNote[]>(`${BASE}${qs}`);
}

export async function createNote(data: NoteCreate): Promise<SharedNote> {
  return apiFetch<SharedNote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNote(id: number, data: NoteUpdate): Promise<SharedNote> {
  return apiFetch<SharedNote>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteNote(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
