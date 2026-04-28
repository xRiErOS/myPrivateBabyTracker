/** Date/time utilities — UTC conversion and formatting. */

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  timeStyle: "short",
});

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
});

/** Format UTC ISO string to local date+time string. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Format UTC ISO string to local time-only string. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Format UTC ISO string to local date-only string. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Get ISO string for "now" with timezone offset. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Get ISO date string for today (YYYY-MM-DD). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Get start of today in ISO format (local midnight as UTC). */
export function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Get end of today in ISO format (local 23:59:59 as UTC). */
export function endOfTodayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Format duration in minutes to human-readable string. */
export function formatDuration(minutes: number | null): string {
  if (minutes == null) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

/** Convert local datetime-local input value to ISO string with offset. */
export function localInputToISO(value: string): string {
  return new Date(value).toISOString();
}

/** Format time since ISO timestamp as "vor HH:MM" (always two digits). */
export function formatTimeSince(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `vor ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Get ISO string for N days ago at midnight (local). */
export function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Convert ISO string to datetime-local input value (local time). */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Liefert die Stunde (0-23) in Berlin-Zeit für ein gegebenes Datum.
 * Dadurch reagiert die Uhrzeit-Logik korrekt auf Sommer-/Winterzeit, auch
 * wenn das Endgerät in einer anderen Zeitzone steht (z.B. PWA im Ausland).
 */
export function berlinHour(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    hour12: false,
  });
  return Number(formatter.format(date));
}

/**
 * Default-Schlafart basierend auf Berlin-Uhrzeit.
 * 22:00 ≤ Stunde oder Stunde < 06:00 → "night", sonst "nap".
 */
export function defaultSleepTypeForTime(date: Date = new Date()): "nap" | "night" {
  const hour = berlinHour(date);
  return hour >= 22 || hour < 6 ? "night" : "nap";
}

/**
 * Wenn das End-Datum chronologisch vor dem Start liegt, rolle es um einen Tag nach vorne.
 * Schließt typische Cross-Midnight-Eingaben (datetime-local picker behält Default-Datum).
 * Sicherheitsgrenze: nur rollen, wenn die resultierende Dauer 0–18h beträgt.
 */
export function rollEndIfCrossMidnight(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (end > start) return endISO;
  const rolled = new Date(end);
  rolled.setDate(rolled.getDate() + 1);
  const diffHours = (rolled.getTime() - start.getTime()) / 3_600_000;
  if (diffHours > 0 && diffHours <= 18) {
    return rolled.toISOString();
  }
  return endISO;
}
