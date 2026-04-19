/** Children API — CRUD operations. */

import { apiFetch } from "./client";
import type { Child, ChildCreate, ChildUpdate } from "./types";

const BASE = "/v1/children";

export async function listChildren(): Promise<Child[]> {
  return apiFetch<Child[]>(BASE);
}

export async function getChild(id: number): Promise<Child> {
  return apiFetch<Child>(`${BASE}/${id}`);
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
  return apiFetch<Child>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteChild(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}
