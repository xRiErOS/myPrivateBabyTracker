/** Feeding API — CRUD operations. */

import { apiFetch } from "./client";
import type { FeedingCreate, FeedingEntry, FeedingUpdate } from "./types";

const BASE = "/v1/feeding/";

export interface FeedingListParams {
  child_id?: number;
  feeding_type?: string;
  date_from?: string;
  date_to?: string;
}

function buildQuery(params: FeedingListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.feeding_type) sp.set("feeding_type", params.feeding_type);
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listFeedings(params: FeedingListParams = {}): Promise<FeedingEntry[]> {
  return apiFetch<FeedingEntry[]>(`${BASE}${buildQuery(params)}`);
}

export async function getFeeding(id: number): Promise<FeedingEntry> {
  return apiFetch<FeedingEntry>(`${BASE}${id}`);
}

export async function createFeeding(data: FeedingCreate): Promise<FeedingEntry> {
  return apiFetch<FeedingEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFeeding(id: number, data: FeedingUpdate): Promise<FeedingEntry> {
  return apiFetch<FeedingEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteFeeding(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
