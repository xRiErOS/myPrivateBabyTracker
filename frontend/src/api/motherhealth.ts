/** MotherHealth API (MBT-109 + Strukturierung).
 *
 * Eintragstypen: lochia | pain | mood | note (Discriminated Union).
 */

import { apiFetch } from "./client";

export type EntryType = "lochia" | "pain" | "mood" | "note";

export type LochiaAmount =
  | "none"
  | "traces"
  | "light"
  | "moderate"
  | "heavy";
export type LochiaColor = "red" | "brown" | "pink" | "yellow" | "white";
export type LochiaSmell = "normal" | "abnormal";
export type ActivityLevel = "bedrest" | "light" | "normal";

export interface MotherHealthEntry {
  id: number;
  child_id: number;
  entry_type: EntryType;
  notes: string | null;
  // Lochia
  lochia_amount: LochiaAmount | null;
  lochia_color: LochiaColor | null;
  lochia_smell: LochiaSmell | null;
  lochia_clots: boolean | null;
  // Pain (VAS 0–10)
  pain_perineum: number | null;
  pain_abdominal: number | null;
  pain_breast: number | null;
  pain_urination: number | null;
  // Mood
  mood_level: number | null;
  wellbeing: number | null;
  exhaustion: number | null;
  activity_level: ActivityLevel | null;
  created_at: string;
  updated_at: string;
}

interface BaseCreate {
  child_id: number;
  notes?: string | null;
}

export interface LochiaCreate extends BaseCreate {
  entry_type: "lochia";
  lochia_amount: LochiaAmount;
  lochia_color: LochiaColor;
  lochia_smell: LochiaSmell;
  lochia_clots: boolean;
}

export interface PainCreate extends BaseCreate {
  entry_type: "pain";
  pain_perineum: number;
  pain_abdominal: number;
  pain_breast: number;
  pain_urination: number;
}

export interface MoodCreate extends BaseCreate {
  entry_type: "mood";
  mood_level: number;
  wellbeing: number;
  exhaustion: number;
  activity_level: ActivityLevel;
}

export interface NoteCreate extends BaseCreate {
  entry_type: "note";
  notes: string;
}

export type MotherHealthCreate =
  | LochiaCreate
  | PainCreate
  | MoodCreate
  | NoteCreate;

export interface MotherHealthUpdate {
  notes?: string | null;
  lochia_amount?: LochiaAmount;
  lochia_color?: LochiaColor;
  lochia_smell?: LochiaSmell;
  lochia_clots?: boolean;
  pain_perineum?: number;
  pain_abdominal?: number;
  pain_breast?: number;
  pain_urination?: number;
  mood_level?: number;
  wellbeing?: number;
  exhaustion?: number;
  activity_level?: ActivityLevel;
}

const BASE = "/v1/motherhealth/";

export async function listMotherHealthEntries(
  childId?: number,
  entryType?: EntryType,
): Promise<MotherHealthEntry[]> {
  const sp = new URLSearchParams();
  if (childId) sp.set("child_id", String(childId));
  if (entryType) sp.set("entry_type", entryType);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return apiFetch<MotherHealthEntry[]>(`${BASE}${qs}`);
}

export async function createMotherHealthEntry(
  data: MotherHealthCreate,
): Promise<MotherHealthEntry> {
  return apiFetch<MotherHealthEntry>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMotherHealthEntry(
  id: number,
  data: MotherHealthUpdate,
): Promise<MotherHealthEntry> {
  return apiFetch<MotherHealthEntry>(`${BASE}${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteMotherHealthEntry(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
