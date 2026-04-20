/** Alerts API — config + active warnings. */

import { apiFetch } from "./client";
import type { AlertConfig, AlertsResponse } from "./types";

export async function getAlertConfig(childId: number): Promise<AlertConfig> {
  return apiFetch<AlertConfig>(`/v1/alerts/config?child_id=${childId}`);
}

export async function updateAlertConfig(
  childId: number,
  data: Partial<AlertConfig>,
): Promise<AlertConfig> {
  return apiFetch<AlertConfig>(`/v1/alerts/config?child_id=${childId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getActiveAlerts(childId: number): Promise<AlertsResponse> {
  return apiFetch<AlertsResponse>(`/v1/alerts/?child_id=${childId}`);
}
