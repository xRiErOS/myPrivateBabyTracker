/** Auth API client — login, logout, me, status. */

import { apiFetch } from "./client";

export interface AuthUser {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  auth_type: string;
  locale: string;
  created_at: string;
}

export interface AuthStatus {
  auth_mode: string;
  authenticated: boolean;
  user: AuthUser | null;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<null>("/v1/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/v1/auth/me");
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return apiFetch<AuthStatus>("/v1/auth/status");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch<null>("/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
