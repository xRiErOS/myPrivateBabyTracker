/** Health API — CRUD operations. */

import { apiFetch } from "./client";
import type { HealthCreate, HealthEntry, HealthUpdate } from "./types";

const BASE = "/v1/health/";

export interface HealthListParams {
  child_id?: number;
  date_from?: string;
  date_to?: string;
  entry_type?: string;
}

function buildQuery(params: HealthListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  if (params.entry_type) sp.set("entry_type", params.entry_type);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listHealth(params: HealthListParams = {}): Promise<HealthEntry[]> {
  return apiFetch<HealthEntry[]>(`${BASE}${buildQuery(params)}`);
}

export async function getHealth(id: number): Promise<HealthEntry> {
  return apiFetch<HealthEntry>(`${BASE}${id}`);
}

export async function createHealth(data: HealthCreate): Promise<HealthEntry> {
  return apiFetch<HealthEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateHealth(id: number, data: HealthUpdate): Promise<HealthEntry> {
  return apiFetch<HealthEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteHealth(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
