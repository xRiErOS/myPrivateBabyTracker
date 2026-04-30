/** Changelog overlay — three variants, different visibility logic.
 *
 * Pfad 1 (Container-getriggert): Backend-Startup legt fuer eine neue App-Version
 *   automatisch einen 'update'-Eintrag in data/changelog.json an (idempotent).
 * Pfad 2 (Manuell): Admin erstellt/bearbeitet Eintraege via /admin/changelog.
 *
 * Sichtbarkeitsregeln pro Variante:
 * - 'update':  gezeigt wenn (a) Eintragsversion > letzte gesehene App-Version
 *              ODER (b) Eintrag noch nie individuell dismissed wurde.
 *              Damit erreichen auch manuell nachgepflegte Notes fuer die
 *              aktuelle App-Version den Nutzer (Bug-Fix MBT-225).
 * - 'info':    versions-unabhaengig, per-Entry dismiss.
 * - 'warning': wie info, mit roter Hervorhebung.
 *
 * Dismiss schreibt IMMER beide Marker:
 *   - mybaby_last_seen_version       (App-Versions-Anker fuer Update-Listing)
 *   - mybaby_dismissed_<version>     (per-Entry, blockt Re-Anzeige bis Edit)
 */

import { useEffect, useState } from "react";
import { X, Sparkles, Info, AlertTriangle } from "lucide-react";

const SEEN_VERSION_KEY = "mybaby_last_seen_version";
const DISMISSED_PREFIX = "mybaby_dismissed_";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  entries: string[];
  variant: "update" | "info" | "warning";
}

async function fetchCurrentVersion(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/health", { credentials: "same-origin" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const res = await fetch("/api/v1/changelog", { credentials: "same-origin" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function getLastSeenVersion(): string | null {
  return localStorage.getItem(SEEN_VERSION_KEY);
}

function setLastSeenVersion(version: string): void {
  localStorage.setItem(SEEN_VERSION_KEY, version);
}

function isEntryDismissed(entry: ChangelogEntry): boolean {
  return !!localStorage.getItem(`${DISMISSED_PREFIX}${entry.version}`);
}

function dismissEntry(entry: ChangelogEntry): void {
  localStorage.setItem(`${DISMISSED_PREFIX}${entry.version}`, "1");
}

/** Manually show the changelog overlay (e.g. from ProfilePage) — shows all entries. */
export function useShowChangelog() {
  const [show, setShow] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);

  async function trigger() {
    const v = await fetchCurrentVersion();
    const log = await fetchChangelog();
    setAppVersion(v);
    setEntries(log);
    setShow(true);
  }

  return { show, version: appVersion, entries, trigger, close: () => setShow(false) };
}

export function ChangelogOverlay() {
  const [show, setShow] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [entriesToShow, setEntriesToShow] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    async function check() {
      const version = await fetchCurrentVersion();
      const allEntries = await fetchChangelog();
      const lastSeen = getLastSeenVersion();

      // Update entries: gezeigt wenn der Eintrag noch nicht individuell
      // dismissed wurde UND entweder neuer ist als die letzte gesehene Version
      // ODER die Version-Marke noch nie gesetzt wurde. So erreichen auch
      // manuell nachgepflegte Notes fuer die aktuelle App-Version den Nutzer.
      const updateEntries = allEntries.filter(
        (e) =>
          e.variant === "update" &&
          !isEntryDismissed(e) &&
          (lastSeen === null || e.version > lastSeen)
      );

      // Info / warning entries: version-independent, dismissed per entry
      const noticeEntries = allEntries.filter(
        (e) => (e.variant === "info" || e.variant === "warning") && !isEntryDismissed(e)
      );

      const toShow = [...updateEntries, ...noticeEntries];
      if (toShow.length > 0) {
        setEntriesToShow(toShow);
        setAppVersion(version);
        setShow(true);
      }
    }
    check();
  }, []);

  function handleDismiss() {
    // Mark update entries as seen (by app version) — Sammel-Anker.
    if (appVersion) setLastSeenVersion(appVersion);
    // Per-Entry Dismiss fuer ALLE Varianten — verhindert Re-Anzeige nach
    // Container-Restarts oder spaeter manuell editierten Notes derselben
    // App-Version (MBT-225 Pfad 2).
    entriesToShow.forEach((e) => dismissEntry(e));
    setShow(false);
  }

  if (!show || entriesToShow.length === 0) return null;

  const hasUpdate = entriesToShow.some((e) => e.variant === "update");

  return (
    <ChangelogModal
      version={hasUpdate && appVersion ? appVersion : null}
      entries={entriesToShow}
      onDismiss={handleDismiss}
    />
  );
}

/** Reusable changelog modal — used by auto-overlay and manual trigger. */
export function ChangelogModal({
  version,
  entries,
  onDismiss,
}: {
  version: string | null;
  entries: ChangelogEntry[];
  onDismiss: () => void;
}) {
  const hasWarning = entries.some((e) => e.variant === "warning");
  const hasUpdate = entries.some((e) => e.variant === "update");

  const headerIcon = hasWarning ? (
    <AlertTriangle className="h-5 w-5 text-red" />
  ) : hasUpdate ? (
    <Sparkles className="h-5 w-5 text-peach" />
  ) : (
    <Info className="h-5 w-5 text-sapphire" />
  );

  const headerTitle = hasUpdate && version
    ? `MyBaby v${version}`
    : hasWarning
    ? "Wichtiger Hinweis"
    : "Information";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface0 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            {headerIcon}
            <h2 className="font-label text-base font-semibold text-text">{headerTitle}</h2>
          </div>
          <button
            onClick={onDismiss}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-surface1 transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5 text-subtext0" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          {entries.length === 0 ? (
            <p className="font-body text-sm text-subtext0">Keine Details verfügbar.</p>
          ) : (
            entries.map((entry) => {
              const accentColor =
                entry.variant === "warning"
                  ? "text-red"
                  : entry.variant === "info"
                  ? "text-sapphire"
                  : "text-peach";
              const bgBadge =
                entry.variant === "warning"
                  ? "bg-red/10 text-red"
                  : entry.variant === "info"
                  ? "bg-sapphire/10 text-sapphire"
                  : "bg-peach/10 text-peach";

              return (
                <div key={entry.version}>
                  <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                    {entry.variant === "update" && (
                      <span className={`font-label text-sm font-semibold ${accentColor}`}>
                        v{entry.version}
                      </span>
                    )}
                    {entry.variant !== "update" && (
                      <span className={`font-label text-xs font-semibold px-2 py-0.5 rounded-full ${bgBadge}`}>
                        {entry.variant === "warning" ? "Warnung" : "Info"}
                      </span>
                    )}
                    <span className="font-body text-xs text-subtext0">{entry.date}</span>
                    <span className="font-label text-sm font-medium text-text">{entry.title}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {entry.entries.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`${accentColor} mt-1 shrink-0`}>•</span>
                        <span className="font-body text-sm text-text leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface1">
          <button
            onClick={onDismiss}
            className="w-full rounded-xl bg-peach py-3 text-sm font-semibold text-ground transition-opacity hover:opacity-90"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
