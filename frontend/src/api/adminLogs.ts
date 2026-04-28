/** Admin Log-Viewer API client (admin only). */

import { apiFetch } from "./client";

export interface LogEntry {
  timestamp: string | null;
  level: string | null;
  event: string | null;
  logger: string | null;
  extras: Record<string, unknown>;
}

export interface LogListResponse {
  items: LogEntry[];
  total: number;
  file_size: number;
  file_exists: boolean;
}

export interface ListLogsParams {
  level?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export async function listLogs(params: ListLogsParams = {}): Promise<LogListResponse> {
  const search = new URLSearchParams();
  if (params.level) search.set("level", params.level);
  if (params.since) search.set("since", params.since);
  if (params.until) search.set("until", params.until);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const query = search.toString();
  return apiFetch<LogListResponse>(`/v1/admin/logs/${query ? `?${query}` : ""}`);
}

export function getDownloadUrl(): string {
  return "/api/v1/admin/logs/download";
}

export async function clearLogs(): Promise<void> {
  await apiFetch<void>(`/v1/admin/logs/clear`, { method: "DELETE" });
}
