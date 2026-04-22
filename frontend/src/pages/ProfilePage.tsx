/** Profile page — user preferences: timezone, breastfeeding, quick actions. */

import { useState, useEffect } from "react";
import { Clock, Baby, Zap } from "lucide-react";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { getPreferences, updatePreferences, type UserPreferences } from "../api/preferences";
import { PLUGINS } from "../lib/pluginRegistry";

const TIMEZONES = [
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
  "Europe/London",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
];

const FAVORITE_LABELS = ["Favorit 1", "Favorit 2", "Favorit 3"];

export default function ProfilePage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getPreferences()
      .then(setPrefs)
      .catch(() => setMsg({ ok: false, text: "Einstellungen konnten nicht geladen werden" }))
      .finally(() => setLoading(false));
  }, []);

  async function save(patch: Partial<UserPreferences>) {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updatePreferences(patch);
      setPrefs(updated);
      setMsg({ ok: true, text: "Gespeichert" });
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsg({ ok: false, text: "Speichern fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center text-subtext0 py-8">Laden...</div>;
  if (!prefs) return null;

  const quickActions = prefs.quick_actions || ["sleep", "feeding", "diaper"];

  return (
    <div className="space-y-4">
      <PageHeader title="Mein Profil" />

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p>
      )}

      {/* User Info (read-only) */}
      {user && (
        <Card className="p-4 space-y-1">
          <p className="text-sm text-subtext0">Angemeldet als</p>
          <p className="font-semibold text-text">{user.display_name || user.username}</p>
          <p className="text-xs text-subtext0">@{user.username} — {user.role} — {user.auth_type === "forward_auth" ? "SSO" : "Lokal"}</p>
        </Card>
      )}

      {/* Timezone */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-sapphire" />
          <h3 className="font-headline text-base font-semibold text-text">Zeitzone</h3>
        </div>
        <p className="text-xs text-subtext0">
          Wird fuer Schlafanalyse, Warnhinweise und Tagesgrenzen verwendet.
        </p>
        <select
          value={prefs.timezone}
          onChange={(e) => save({ timezone: e.target.value })}
          disabled={saving}
          className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </Card>

      {/* Breastfeeding Mode */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Baby className="h-4 w-4 text-pink" />
            <h3 className="font-headline text-base font-semibold text-text">Stillmodus</h3>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.breastfeeding_enabled}
            onClick={() => save({ breastfeeding_enabled: !prefs.breastfeeding_enabled })}
            disabled={saving}
            className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${prefs.breastfeeding_enabled ? "bg-green" : "bg-surface2"}`}
          >
            <span
              className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${prefs.breastfeeding_enabled ? "translate-x-[26px]" : "translate-x-[2px]"}`}
            />
          </button>
        </div>
        <p className="text-xs text-subtext0">
          Zeigt die zuletzt gestillte Seite auf dem Dashboard. Deaktiviere dies, wenn du nicht stillst.
        </p>

        {prefs.breastfeeding_enabled && (
          <div className="flex items-center justify-between pt-2 border-t border-surface1">
            <div>
              <p className="font-label text-sm text-text">Hybridmodus</p>
              <p className="text-xs text-subtext0">Zeigt Brust- und Flaschenkacheln gleichzeitig an.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.feeding_hybrid}
              onClick={() => save({ feeding_hybrid: !prefs.feeding_hybrid })}
              disabled={saving}
              className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${prefs.feeding_hybrid ? "bg-green" : "bg-surface2"}`}
            >
              <span
                className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${prefs.feeding_hybrid ? "translate-x-[26px]" : "translate-x-[2px]"}`}
              />
            </button>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-peach" />
          <h3 className="font-headline text-base font-semibold text-text">Quick Actions</h3>
        </div>
        <p className="text-xs text-subtext0">
          Konfiguriere die 3 Schnellzugriff-Buttons auf dem Dashboard.
        </p>
        <div className="space-y-2">
          {FAVORITE_LABELS.map((label, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <label className="font-label text-sm text-subtext0 w-20 shrink-0">
                {label}
              </label>
              <select
                value={quickActions[idx] || "sleep"}
                onChange={(e) => {
                  const next = [...quickActions];
                  next[idx] = e.target.value;
                  save({ quick_actions: next });
                }}
                disabled={saving}
                className="flex-1 min-h-[44px] px-3 rounded-[8px] bg-ground text-text font-body text-base border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
              >
                {PLUGINS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
