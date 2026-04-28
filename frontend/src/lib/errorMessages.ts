/** Zentrale Aufbereitung von API-Fehlern für Endnutzer. */

import { ApiError } from "../api/client";

interface PydanticErrorDetail {
  type?: string;
  loc?: (string | number)[];
  msg?: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

interface ApiErrorBody {
  detail?: string | PydanticErrorDetail[];
}

const ISO_TIMESTAMP_RE =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g;

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

function localizeTimestamps(msg: string): string {
  return msg.replace(ISO_TIMESTAMP_RE, (match) => {
    try {
      const iso = /Z|[+-]\d{2}:\d{2}$/.test(match) ? match : match + "Z";
      return dateTimeFormat.format(new Date(iso));
    } catch {
      return match;
    }
  });
}

function statusFallback(status: number): string {
  if (status === 400) return "Eingabe ungültig.";
  if (status === 401) return "Anmeldung abgelaufen — bitte neu anmelden.";
  if (status === 403) return "Keine Berechtigung für diese Aktion.";
  if (status === 404) return "Eintrag nicht gefunden.";
  if (status === 409) return "Konflikt — der Eintrag wurde inzwischen geändert.";
  if (status === 413) return "Datei zu groß.";
  if (status === 422) return "Eingabe ungültig.";
  if (status === 429) return "Zu viele Anfragen — bitte kurz warten.";
  if (status >= 500) return "Server-Fehler — bitte später erneut versuchen.";
  return `Fehler ${status}`;
}

function cleanPydanticMsg(msg: string): string {
  return msg
    .replace(/^Value error,\s*/i, "")
    .replace(/^Assertion failed,\s*/i, "")
    .trim();
}

function extractBody(err: ApiError): ApiErrorBody | null {
  const stripped = err.message.replace(/^API \d+:\s*/, "");
  try {
    return JSON.parse(stripped) as ApiErrorBody;
  } catch {
    return null;
  }
}

/** Wandelt einen API-Fehler in eine kurze, lesbare Meldung. */
export function formatApiError(err: unknown, fallback?: string): string {
  if (err instanceof ApiError) {
    const body = extractBody(err);
    if (body?.detail) {
      if (typeof body.detail === "string") {
        return localizeTimestamps(body.detail);
      }
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        const first = body.detail[0];
        if (first?.msg) return localizeTimestamps(cleanPydanticMsg(first.msg));
      }
    }
    return localizeTimestamps(statusFallback(err.status));
  }
  if (err instanceof Error) {
    return localizeTimestamps(err.message);
  }
  return fallback ?? "Unbekannter Fehler.";
}
