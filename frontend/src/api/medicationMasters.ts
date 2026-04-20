/** MedicationMaster API — CRUD operations for predefined medications. */

import { apiFetch } from "./client";
import type {
  MedicationMaster,
  MedicationMasterCreate,
  MedicationMasterUpdate,
} from "./types";

const BASE = "/v1/medication-masters/";

export async function listMedicationMasters(
  activeOnly = true,
): Promise<MedicationMaster[]> {
  const qs = activeOnly ? "?active_only=true" : "?active_only=false";
  return apiFetch<MedicationMaster[]>(`${BASE}${qs}`);
}

export async function createMedicationMaster(
  data: MedicationMasterCreate,
): Promise<MedicationMaster> {
  return apiFetch<MedicationMaster>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMedicationMaster(
  id: number,
  data: MedicationMasterUpdate,
): Promise<MedicationMaster> {
  return apiFetch<MedicationMaster>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteMedicationMaster(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
