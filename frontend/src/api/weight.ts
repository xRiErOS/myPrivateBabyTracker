/** Weight API — CRUD operations. */

import { apiFetch } from "./client";
import type { WeightCreate, WeightEntry, WeightUpdate } from "./types";

const BASE = "/v1/weight/";

export interface WeightListParams {
  child_id?: number;
  date_from?: string;
  date_to?: string;
}

function buildQuery(params: WeightListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listWeight(params: WeightListParams = {}): Promise<WeightEntry[]> {
  return apiFetch<WeightEntry[]>(`${BASE}${buildQuery(params)}`);
}

export async function getWeight(id: number): Promise<WeightEntry> {
  return apiFetch<WeightEntry>(`${BASE}${id}`);
}

export async function createWeight(data: WeightCreate): Promise<WeightEntry> {
  return apiFetch<WeightEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWeight(id: number, data: WeightUpdate): Promise<WeightEntry> {
  return apiFetch<WeightEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteWeight(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
