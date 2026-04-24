/** Changelog overlay — shown on app-start when a new version is detected.

Compares current app version (from /health) with last seen version in localStorage.
Shows release notes from /changelog.json when a new version is detected.
Dismissed via button — stores seen version in localStorage.
*/

import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";

const SEEN_KEY = "mybaby_last_seen_version";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  entries: string[];
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
    const res = await fetch("/changelog.json");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function getLastSeenVersion(): string | null {
  return localStorage.getItem(SEEN_KEY);
}

function setLastSeenVersion(version: string): void {
  localStorage.setItem(SEEN_KEY, version);
}

/** Manually show the changelog overlay (e.g. from ProfilePage). */
export function useShowChangelog() {
  const [show, setShow] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);

  async function trigger() {
    const v = await fetchCurrentVersion();
    if (!v) return;
    const log = await fetchChangelog();
    setVersion(v);
    setEntries(log);
    setShow(true);
  }

  return { show, version, entries, trigger, close: () => setShow(false) };
}

export function ChangelogOverlay() {
  const [show, setShow] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    async function check() {
      const version = await fetchCurrentVersion();
      if (!version) return;

      const lastSeen = getLastSeenVersion();
      if (lastSeen === version) return; // Already seen this version

      // New version detected — fetch changelog
      const log = await fetchChangelog();
      setChangelog(log);
      setCurrentVersion(version);
      setShow(true);
    }
    check();
  }, []);

  function handleDismiss() {
    if (currentVersion) {
      setLastSeenVersion(currentVersion);
    }
    setShow(false);
  }

  if (!show || !currentVersion) return null;

  // Show entries for current version and all newer ones the user hasn't seen
  const lastSeen = localStorage.getItem(SEEN_KEY);
  const relevantEntries = changelog.filter((entry) => {
    if (!lastSeen) return entry.version === currentVersion;
    return entry.version > lastSeen;
  });

  return (
    <ChangelogModal
      version={currentVersion}
      entries={relevantEntries}
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
  version: string;
  entries: ChangelogEntry[];
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface0 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-peach" />
            <h2 className="font-label text-base font-semibold text-text">
              MyBaby v{version}
            </h2>
          </div>
          <button
            onClick={onDismiss}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-surface1 transition-colors"
            aria-label="Schliessen"
          >
            <X className="h-5 w-5 text-subtext0" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          {entries.length === 0 ? (
            <p className="font-body text-sm text-subtext0">Keine Details verfügbar.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.version}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-label text-sm font-semibold text-peach">v{entry.version}</span>
                  <span className="font-body text-xs text-subtext0">{entry.date}</span>
                  <span className="font-label text-sm font-medium text-text">{entry.title}</span>
                </div>
                <ul className="space-y-1.5">
                  {entry.entries.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-peach mt-1 shrink-0">•</span>
                      <span className="font-body text-sm text-text leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
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
