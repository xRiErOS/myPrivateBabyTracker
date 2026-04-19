/** VitaminD3 API — CRUD operations. */

import { apiFetch } from "./client";
import type { VitaminD3Entry, VitaminD3Create } from "./types";

const BASE = "/v1/vitamind3/";

export interface VitaminD3ListParams {
  child_id?: number;
  month?: string; // "YYYY-MM"
}

function buildQuery(params: VitaminD3ListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.month) sp.set("month", params.month);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listVitaminD3(params: VitaminD3ListParams = {}): Promise<VitaminD3Entry[]> {
  return apiFetch<VitaminD3Entry[]>(`${BASE}${buildQuery(params)}`);
}

export async function createVitaminD3(data: VitaminD3Create): Promise<VitaminD3Entry> {
  return apiFetch<VitaminD3Entry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteVitaminD3(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
