/** Entry API helpers — generic get/update dispatchers for the EntryDetailModal. */

import { apiFetch } from "./client";
import { getSleep, updateSleep } from "./sleep";
import { getFeeding, updateFeeding } from "./feeding";
import { getDiaper, updateDiaper } from "./diaper";
import { getTemperature, updateTemperature } from "./temperature";
import { getWeight, updateWeight } from "./weight";
import { getMedication, updateMedication } from "./medication";
import { updateTodo } from "./todo";
import { getMilestone, updateMilestone } from "./milestones";
import type {
  SleepEntry,
  FeedingEntry,
  DiaperEntry,
  TemperatureEntry,
  WeightEntry,
  MedicationEntry,
  TodoEntry,
  VitaminD3Entry,
  MilestoneEntry,
} from "./types";

export type AnyEntry =
  | SleepEntry
  | FeedingEntry
  | DiaperEntry
  | TemperatureEntry
  | WeightEntry
  | MedicationEntry
  | TodoEntry
  | VitaminD3Entry
  | MilestoneEntry;

/** Fetch a single entry by type and id. */
export async function getEntry(entryType: string, id: number): Promise<AnyEntry> {
  switch (entryType) {
    case "sleep":
      return getSleep(id);
    case "feeding":
      return getFeeding(id);
    case "diaper":
      return getDiaper(id);
    case "temperature":
      return getTemperature(id);
    case "weight":
      return getWeight(id);
    case "medication":
      return getMedication(id);
    case "todo":
      return apiFetch<TodoEntry>(`/v1/todo/${id}`);
    case "vitamind3":
      return apiFetch<VitaminD3Entry>(`/v1/vitamind3/${id}`);
    case "milestone":
      return getMilestone(id);
    case "note":
      return apiFetch<any>(`/v1/notes/${id}`);
    case "photo":
      return apiFetch<any>(`/v1/milestones/media/${id}`);
    default:
      throw new Error(`Unknown entry type: ${entryType}`);
  }
}

/** Update only the notes field of an entry. */
export async function updateEntryNotes(
  entryType: string,
  id: number,
  notes: string,
): Promise<AnyEntry> {
  switch (entryType) {
    case "sleep":
      return updateSleep(id, { notes });
    case "feeding":
      return updateFeeding(id, { notes });
    case "diaper":
      return updateDiaper(id, { notes });
    case "temperature":
      return updateTemperature(id, { notes });
    case "weight":
      return updateWeight(id, { notes });
    case "medication":
      return updateMedication(id, { notes });
    case "todo":
      return updateTodo(id, { details: notes });
    case "milestone":
      return updateMilestone(id, { notes });
    default:
      throw new Error(`Notes update not supported for: ${entryType}`);
  }
}
