/** Diaper API — CRUD operations. */

import { apiFetch } from "./client";
import type { DiaperCreate, DiaperEntry, DiaperUpdate } from "./types";

const BASE = "/v1/diaper";

export interface DiaperListParams {
  child_id?: number;
  diaper_type?: string;
  date_from?: string;
  date_to?: string;
}

function buildQuery(params: DiaperListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.diaper_type) sp.set("diaper_type", params.diaper_type);
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listDiapers(params: DiaperListParams = {}): Promise<DiaperEntry[]> {
  return apiFetch<DiaperEntry[]>(`${BASE}/${buildQuery(params)}`);
}

export async function getDiaper(id: number): Promise<DiaperEntry> {
  return apiFetch<DiaperEntry>(`${BASE}/${id}`);
}

export async function createDiaper(data: DiaperCreate): Promise<DiaperEntry> {
  return apiFetch<DiaperEntry>(`${BASE}/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDiaper(id: number, data: DiaperUpdate): Promise<DiaperEntry> {
  return apiFetch<DiaperEntry>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDiaper(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}
