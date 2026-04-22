/** Auth API client — login, logout, me, status. */

import { apiFetch } from "./client";

export interface AuthUser {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  auth_type: string;
  locale: string;
  timezone: string;
  totp_enabled: boolean;
  created_at: string;
}

export interface LoginResponse {
  requires_totp: boolean;
  user: AuthUser | null;
}

export interface AuthStatus {
  auth_mode: string;
  authenticated: boolean;
  user: AuthUser | null;
}

export interface TotpSetup {
  secret: string;
  qr_code_base64: string;
  backup_codes: string[];
}

export interface TotpStatus {
  enabled: boolean;
  verified: boolean;
}

export async function login(
  username: string,
  password: string,
  totpCode?: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, totp_code: totpCode || null }),
  });
}

export async function totpSetup(): Promise<TotpSetup> {
  return apiFetch<TotpSetup>("/v1/auth/2fa/setup", { method: "POST" });
}

export async function totpVerify(code: string): Promise<void> {
  await apiFetch<null>("/v1/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function totpDisable(code: string): Promise<void> {
  await apiFetch<null>("/v1/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getTotpStatus(): Promise<TotpStatus> {
  return apiFetch<TotpStatus>("/v1/auth/2fa/status");
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
