/** User preferences API client. */

import { apiFetch } from "./client";

export interface UserPreferences {
  breastfeeding_enabled: boolean;
  quick_actions: string[] | null;
  widget_order: string[] | null;
  track_visibility: Record<string, boolean> | null;
  timezone: string;
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
