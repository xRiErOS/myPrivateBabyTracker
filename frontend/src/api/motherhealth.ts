/** MotherHealth API (MBT-109) — postpartum / midwife notes CRUD. */

import { apiFetch } from "./client";

export interface MotherHealthEntry {
  id: number;
  child_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MotherHealthCreate {
  child_id: number;
  content: string;
}

export interface MotherHealthUpdate {
  content?: string;
}

const BASE = "/v1/motherhealth/";

export async function listMotherHealthEntries(
  childId?: number,
): Promise<MotherHealthEntry[]> {
  const sp = new URLSearchParams();
  if (childId) sp.set("child_id", String(childId));
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return apiFetch<MotherHealthEntry[]>(`${BASE}${qs}`);
}

export async function createMotherHealthEntry(
  data: MotherHealthCreate,
): Promise<MotherHealthEntry> {
  return apiFetch<MotherHealthEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMotherHealthEntry(
  id: number,
  data: MotherHealthUpdate,
): Promise<MotherHealthEntry> {
  return apiFetch<MotherHealthEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteMotherHealthEntry(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
