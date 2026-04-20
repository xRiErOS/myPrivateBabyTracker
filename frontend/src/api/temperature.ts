/** Temperature API — CRUD operations. */

import { apiFetch } from "./client";
import type { TemperatureCreate, TemperatureEntry, TemperatureUpdate } from "./types";

const BASE = "/v1/temperature/";

export interface TemperatureListParams {
  child_id?: number;
  date_from?: string;
  date_to?: string;
}

function buildQuery(params: TemperatureListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listTemperature(params: TemperatureListParams = {}): Promise<TemperatureEntry[]> {
  return apiFetch<TemperatureEntry[]>(`${BASE}${buildQuery(params)}`);
}

export async function getTemperature(id: number): Promise<TemperatureEntry> {
  return apiFetch<TemperatureEntry>(`${BASE}${id}`);
}

export async function createTemperature(data: TemperatureCreate): Promise<TemperatureEntry> {
  return apiFetch<TemperatureEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemperature(id: number, data: TemperatureUpdate): Promise<TemperatureEntry> {
  return apiFetch<TemperatureEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTemperature(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
