/** Auth settings page — shows auth mode, current user, password change, logout. */

import { useState } from "react";
import { Shield, LogOut, KeyRound, User, Info } from "lucide-react";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { changePassword } from "../api/auth";

const AUTH_MODE_LABELS: Record<string, string> = {
  disabled: "Deaktiviert (kein Login)",
  local: "Lokales Login (Passwort)",
  forward: "SSO (Authelia Forward-Auth)",
  both: "SSO + Lokales Login",
};

export default function AuthSettingsPage() {
  const { user, authMode, logout } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const canChangePassword = user?.auth_type === "local";

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMsg({ ok: true, text: "Passwort geaendert" });
      setCurrentPw("");
      setNewPw("");
    } catch {
      setPwMsg({ ok: false, text: "Passwort-Aenderung fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-mauve" />
        <h2 className="font-headline text-lg font-semibold">Authentifizierung</h2>
      </div>

      {/* Auth Mode Info */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-sapphire" />
          <h3 className="font-headline text-base font-semibold text-text">Auth-Modus</h3>
        </div>
        <p className="font-body text-sm text-text">
          {AUTH_MODE_LABELS[authMode] ?? authMode}
        </p>
        <p className="font-body text-xs text-subtext0">
          Konfigurierbar per Umgebungsvariable AUTH_MODE im Container.
        </p>
      </Card>

      {/* Current User */}
      {user && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-sapphire" />
            <h3 className="font-headline text-base font-semibold text-text">Angemeldet als</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-subtext0">Benutzername</span>
            <span className="text-text">{user.username}</span>
            <span className="text-subtext0">Anzeigename</span>
            <span className="text-text">{user.display_name ?? "-"}</span>
            <span className="text-subtext0">Rolle</span>
            <span className="text-text">{user.role}</span>
            <span className="text-subtext0">Auth-Typ</span>
            <span className="text-text">{user.auth_type}</span>
          </div>
        </Card>
      )}

      {/* Change Password (local users only) */}
      {canChangePassword && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-peach" />
            <h3 className="font-headline text-base font-semibold text-text">Passwort aendern</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm text-subtext0 mb-1">Aktuelles Passwort *</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
              />
            </div>
            <div>
              <label className="block text-sm text-subtext0 mb-1">Neues Passwort * (min. 8 Zeichen)</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
              />
            </div>
            {pwMsg && (
              <p className={`text-sm ${pwMsg.ok ? "text-green" : "text-red"}`}>{pwMsg.text}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-peach text-ground font-semibold rounded-lg disabled:opacity-50"
            >
              {saving ? "Speichern..." : "Passwort aendern"}
            </button>
          </form>
        </Card>
      )}

      {/* Logout */}
      {user && authMode !== "disabled" && (
        <Card className="p-4">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red/15 text-red font-semibold rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </Card>
      )}
    </div>
  );
}
