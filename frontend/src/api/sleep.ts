/** Sleep API — CRUD operations. */

import { apiFetch } from "./client";
import type { SleepCreate, SleepEntry, SleepUpdate } from "./types";

const BASE = "/v1/sleep";

export interface SleepListParams {
  child_id?: number;
  date_from?: string;
  date_to?: string;
  sleep_type?: string;
}

function buildQuery(params: SleepListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  if (params.sleep_type) sp.set("sleep_type", params.sleep_type);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listSleep(params: SleepListParams = {}): Promise<SleepEntry[]> {
  return apiFetch<SleepEntry[]>(`${BASE}/${buildQuery(params)}`);
}

export async function getSleep(id: number): Promise<SleepEntry> {
  return apiFetch<SleepEntry>(`${BASE}/${id}`);
}

export async function createSleep(data: SleepCreate): Promise<SleepEntry> {
  return apiFetch<SleepEntry>(`${BASE}/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSleep(id: number, data: SleepUpdate): Promise<SleepEntry> {
  return apiFetch<SleepEntry>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSleep(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}
