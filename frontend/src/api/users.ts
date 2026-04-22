/** User management API client (admin only). */

import { apiFetch } from "./client";

export interface AdminUser {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  auth_type: string;
  locale: string;
  is_active: boolean;
  totp_enabled: boolean;
  created_at: string;
}

export interface UserCreateData {
  username: string;
  password: string;
  display_name?: string;
  role?: string;
  locale?: string;
}

export interface UserUpdateData {
  display_name?: string;
  role?: string;
  locale?: string;
  is_active?: boolean;
}

export async function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>("/v1/users/");
}

export async function createUser(data: UserCreateData): Promise<AdminUser> {
  return apiFetch<AdminUser>("/v1/users/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: number, data: UserUpdateData): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function setUserPassword(id: number, password: string): Promise<void> {
  await apiFetch<null>(`/v1/users/${id}/set-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch<null>(`/v1/users/${id}`, { method: "DELETE" });
}
