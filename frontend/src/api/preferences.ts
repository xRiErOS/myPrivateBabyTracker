/** User preferences API client. */

import { apiFetch } from "./client";

export interface UserPreferences {
  /**
   * MBT-175 + Folge-Refactor: Stillmodus + Hybridmodus liegen jetzt am
   * Child-Model (`children.breastfeeding_enabled`, `children.feeding_hybrid`).
   */
  quick_actions: string[] | null;
  widget_order: string[] | null;
  track_visibility: Record<string, boolean> | null;
  timezone: string;
  locale: string;
  tutorial_completed: boolean;
  tutorial_step: number;
}

export async function getPreferences(): Promise<UserPreferences> {
  return apiFetch<UserPreferences>("/v1/preferences/");
}

export async function updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
  return apiFetch<UserPreferences>("/v1/preferences/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
