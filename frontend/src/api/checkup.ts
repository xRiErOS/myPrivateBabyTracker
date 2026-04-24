/** Checkup (U-Untersuchungen) API — CRUD operations. */

import { apiFetch } from "./client";

export interface CheckupType {
  id: number;
  name: string;
  display_name: string;
  recommended_age_weeks_min: number;
  recommended_age_weeks_max: number;
  description: string | null;
}

export interface CheckupEntry {
  id: number;
  child_id: number;
  checkup_type_id: number;
  checkup_type_name: string;
  checkup_type_display_name: string;
  date: string;
  doctor: string | null;
  weight_grams: number | null;
  height_cm: number | null;
  head_circumference_cm: number | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface CheckupCreate {
  child_id: number;
  checkup_type_id: number;
  date: string;
  doctor?: string | null;
  weight_grams?: number | null;
  height_cm?: number | null;
  head_circumference_cm?: number | null;
  notes?: string | null;
  is_completed?: boolean;
}

export interface CheckupUpdate {
  date?: string;
  doctor?: string | null;
  weight_grams?: number | null;
  height_cm?: number | null;
  head_circumference_cm?: number | null;
  notes?: string | null;
  is_completed?: boolean;
}

export interface NextCheckup {
  checkup_type: CheckupType;
  is_due: boolean;
  is_overdue: boolean;
  age_weeks_current: number;
  days_until_due: number | null;
}

const BASE = "/v1/checkup/";

export async function listCheckupTypes(): Promise<CheckupType[]> {
  return apiFetch<CheckupType[]>(`${BASE}types`);
}

export async function listCheckups(childId?: number): Promise<CheckupEntry[]> {
  const qs = childId ? `?child_id=${childId}` : "";
  return apiFetch<CheckupEntry[]>(`${BASE}${qs}`);
}

export async function getNextCheckup(childId: number): Promise<NextCheckup | null> {
  return apiFetch<NextCheckup | null>(`${BASE}next/${childId}`);
}

export async function createCheckup(data: CheckupCreate): Promise<CheckupEntry> {
  return apiFetch<CheckupEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCheckup(id: number, data: CheckupUpdate): Promise<CheckupEntry> {
  return apiFetch<CheckupEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCheckup(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
