/** API Key CRUD operations. */

import { apiFetch } from "./client";
import type { ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse, ApiKeyUpdate } from "./types";

const BASE = "/v1/api-keys/";

export async function listApiKeys(): Promise<ApiKeyResponse[]> {
  return apiFetch<ApiKeyResponse[]>(BASE);
}

export async function createApiKey(data: ApiKeyCreate): Promise<ApiKeyCreateResponse> {
  return apiFetch<ApiKeyCreateResponse>(BASE, { method: "POST", body: JSON.stringify(data) });
}

export async function updateApiKey(id: number, data: ApiKeyUpdate): Promise<ApiKeyResponse> {
  return apiFetch<ApiKeyResponse>(`${BASE}${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteApiKey(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}${id}`, { method: "DELETE" });
}
