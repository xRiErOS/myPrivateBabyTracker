/** WebAuthn (Passkeys) API client. */

import { apiFetch } from "./client";

export interface WebAuthnCredential {
  id: number;
  device_name: string | null;
  created_at: string;
}

export async function registerBegin(): Promise<PublicKeyCredentialCreationOptions> {
  const resp = await apiFetch<Record<string, unknown>>("/v1/auth/webauthn/register/begin", {
    method: "POST",
  });
  return parseCreationOptions(resp);
}

export async function registerFinish(credential: PublicKeyCredential): Promise<void> {
  const body = serializeRegistration(credential);
  await apiFetch<unknown>("/v1/auth/webauthn/register/finish", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function loginBegin(): Promise<PublicKeyCredentialRequestOptions> {
  const resp = await apiFetch<Record<string, unknown>>("/v1/auth/webauthn/login/begin", {
    method: "POST",
  });
  return parseRequestOptions(resp);
}

export async function loginFinish(credential: PublicKeyCredential): Promise<{ user: Record<string, unknown> }> {
  const body = serializeAssertion(credential);
  return apiFetch<{ user: Record<string, unknown> }>("/v1/auth/webauthn/login/finish", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listCredentials(): Promise<WebAuthnCredential[]> {
  return apiFetch<WebAuthnCredential[]>("/v1/auth/webauthn/credentials");
}

export async function renameCredential(id: number, deviceName: string): Promise<void> {
  await apiFetch<unknown>(`/v1/auth/webauthn/credentials/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ device_name: deviceName }),
  });
}

export async function deleteCredential(id: number): Promise<void> {
  await apiFetch<null>(`/v1/auth/webauthn/credentials/${id}`, {
    method: "DELETE",
  });
}

// --- Helpers: convert between JSON and WebAuthn API types ---

function base64urlToBuffer(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseCreationOptions(json: Record<string, unknown>): PublicKeyCredentialCreationOptions {
  const opts = json as Record<string, unknown>;
  return {
    ...opts,
    challenge: base64urlToBuffer(opts.challenge as string),
    user: {
      ...(opts.user as Record<string, unknown>),
      id: base64urlToBuffer((opts.user as Record<string, string>).id),
    },
    excludeCredentials: ((opts.excludeCredentials as Array<Record<string, string>>) || []).map((c) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialCreationOptions;
}

function parseRequestOptions(json: Record<string, unknown>): PublicKeyCredentialRequestOptions {
  const opts = json as Record<string, unknown>;
  return {
    ...opts,
    challenge: base64urlToBuffer(opts.challenge as string),
    allowCredentials: ((opts.allowCredentials as Array<Record<string, string>>) || []).map((c) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialRequestOptions;
}

function serializeRegistration(cred: PublicKeyCredential) {
  const response = cred.response as AuthenticatorAttestationResponse;
  return {
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    type: cred.type,
    response: {
      attestationObject: bufferToBase64url(response.attestationObject),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
    },
  };
}

function serializeAssertion(cred: PublicKeyCredential) {
  const response = cred.response as AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    type: cred.type,
    response: {
      authenticatorData: bufferToBase64url(response.authenticatorData),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
    },
  };
}
