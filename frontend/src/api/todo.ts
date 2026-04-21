/** Todo API — CRUD operations for baby todo entries + templates. */

import { apiFetch } from "./client";
import type {
  TodoEntry, TodoCreate, TodoUpdate,
  TodoTemplate, TodoTemplateCreate, TodoTemplateUpdate,
} from "./types";

const BASE = "/v1/todo/";
const TPL_BASE = "/v1/todo-templates/";

export async function listTodos(childId?: number, showDone = true): Promise<TodoEntry[]> {
  const params = new URLSearchParams();
  if (childId) params.set("child_id", String(childId));
  if (!showDone) params.set("show_done", "false");
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<TodoEntry[]>(`${BASE}${qs}`);
}

export async function createTodo(data: TodoCreate): Promise<TodoEntry> {
  return apiFetch<TodoEntry>(BASE, { method: "POST", body: JSON.stringify(data) });
}

export async function updateTodo(id: number, data: TodoUpdate): Promise<TodoEntry> {
  return apiFetch<TodoEntry>(`${BASE}${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteTodo(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}

// --- Templates ---

export async function listTemplates(childId?: number, activeOnly = true): Promise<TodoTemplate[]> {
  const params = new URLSearchParams();
  if (childId) params.set("child_id", String(childId));
  if (!activeOnly) params.set("active_only", "false");
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<TodoTemplate[]>(`${TPL_BASE}${qs}`);
}

export async function createTemplate(data: TodoTemplateCreate): Promise<TodoTemplate> {
  return apiFetch<TodoTemplate>(TPL_BASE, { method: "POST", body: JSON.stringify(data) });
}

export async function updateTemplate(id: number, data: TodoTemplateUpdate): Promise<TodoTemplate> {
  return apiFetch<TodoTemplate>(`${TPL_BASE}${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteTemplate(id: number): Promise<void> {
  return apiFetch<void>(`${TPL_BASE}${id}`, { method: "DELETE" });
}

export async function cloneTemplate(id: number): Promise<TodoEntry> {
  return apiFetch<TodoEntry>(`${TPL_BASE}${id}/clone`, { method: "POST" });
}
