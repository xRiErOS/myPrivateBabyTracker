/** Fetch wrapper with base URL, error handling, and CSRF token from cookie. */

const API_BASE = "/api";

/** Callback registered by AuthProvider to handle expired sessions (401). */
let _on401: (() => void) | null = null;

/** Register a callback that fires when the server responds with 401. */
export function set401Handler(cb: () => void): void {
  _on401 = cb;
}

/** Unregister the 401 handler. */
export function clear401Handler(): void {
  _on401 = null;
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfToken();
  if (!token) {
    // Trigger cookie creation with a GET request
    await fetch(`${API_BASE}/v1/health`, { credentials: "same-origin" });
    token = getCsrfToken();
  }
  return token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // For mutating requests, ensure CSRF token is available
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const csrf = await ensureCsrfToken();
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  if (!resp.ok) {
    if (resp.status === 401 && _on401) {
      _on401();
    }
    const body = await resp.text().catch(() => "");
    throw new ApiError(resp.status, `API ${resp.status}: ${body || path}`);
  }

  if (resp.status === 204) return null as T;
  return resp.json();
}
