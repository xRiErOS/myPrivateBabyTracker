/** Medication API — CRUD operations. */

import { apiFetch } from "./client";
import type { MedicationCreate, MedicationEntry, MedicationUpdate } from "./types";

const BASE = "/v1/medication/";

export interface MedicationListParams {
  child_id?: number;
  date_from?: string;
  date_to?: string;
  medication_name?: string;
}

function buildQuery(params: MedicationListParams): string {
  const sp = new URLSearchParams();
  if (params.child_id) sp.set("child_id", String(params.child_id));
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  if (params.medication_name) sp.set("medication_name", params.medication_name);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listMedication(params: MedicationListParams = {}): Promise<MedicationEntry[]> {
  return apiFetch<MedicationEntry[]>(`${BASE}${buildQuery(params)}`);
}

export async function getMedication(id: number): Promise<MedicationEntry> {
  return apiFetch<MedicationEntry>(`${BASE}${id}`);
}

export async function createMedication(data: MedicationCreate): Promise<MedicationEntry> {
  return apiFetch<MedicationEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMedication(id: number, data: MedicationUpdate): Promise<MedicationEntry> {
  return apiFetch<MedicationEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteMedication(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
