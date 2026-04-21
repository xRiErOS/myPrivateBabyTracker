/** TummyTime API -- CRUD operations. */

import { apiFetch } from "./client";
import type { TummyTimeCreate, TummyTimeEntry, TummyTimeUpdate } from "./types";

const BASE = "/v1/tummy-time/";

export interface TummyTimeListParams {
  child_id?: number;
  date_from?: string;
  date_to?: string;
}

function buildQuery(params: TummyTimeListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listTummyTime(params: TummyTimeListParams = {}): Promise<TummyTimeEntry[]> {
  return apiFetch<TummyTimeEntry[]>(`${BASE}${buildQuery(params)}`);
}

export async function getTummyTime(id: number): Promise<TummyTimeEntry> {
  return apiFetch<TummyTimeEntry>(`${BASE}${id}`);
}

export async function createTummyTime(data: TummyTimeCreate): Promise<TummyTimeEntry> {
  return apiFetch<TummyTimeEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTummyTime(id: number, data: TummyTimeUpdate): Promise<TummyTimeEntry> {
  return apiFetch<TummyTimeEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTummyTime(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
