/** Todo API — CRUD operations for baby todo entries. */

import { apiFetch } from "./client";
import type { TodoEntry, TodoCreate, TodoUpdate } from "./types";

const BASE = "/v1/todo/";

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
