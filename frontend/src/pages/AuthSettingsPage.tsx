/** Auth settings page — shows auth mode, current user, password change, 2FA, passkeys, logout. */

import { useState, useEffect } from "react";
import { LogOut, KeyRound, User, Info, Smartphone, Fingerprint, Trash2, Pencil } from "lucide-react";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import {
  changePassword,
  totpSetup,
  totpVerify,
  totpDisable,
  type TotpSetup,
} from "../api/auth";
import {
  registerBegin,
  registerFinish,
  listCredentials,
  deleteCredential,
  renameCredential,
  type WebAuthnCredential,
} from "../api/webauthn";

const AUTH_MODE_LABELS: Record<string, string> = {
  disabled: "Deaktiviert (kein Login)",
  local: "Lokales Login (Passwort)",
  forward: "SSO (Authelia Forward-Auth)",
  both: "SSO + Lokales Login",
};

export default function AuthSettingsPage() {
  const { user, authMode, logout, refresh } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // 2FA state
  const [totpSetupData, setTotpSetupData] = useState<TotpSetup | null>(null);
  const [totpSetupCode, setTotpSetupCode] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [totpMsg, setTotpMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [totpSaving, setTotpSaving] = useState(false);

  // Passkeys state
  const [passkeys, setPasskeys] = useState<WebAuthnCredential[]>([]);
  const [passkeyMsg, setPasskeyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passkeySaving, setPasskeySaving] = useState(false);
  const [editingPasskey, setEditingPasskey] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const canChangePassword = user?.auth_type === "local";
  const supportsWebAuthn = typeof window !== "undefined" && !!window.PublicKeyCredential;

  useEffect(() => {
    if (user && supportsWebAuthn) {
      listCredentials().then(setPasskeys).catch(() => {});
    }
  }, [user, supportsWebAuthn]);

  async function handleRegisterPasskey() {
    setPasskeySaving(true);
    setPasskeyMsg(null);
    try {
      const options = await registerBegin();
      const credential = await navigator.credentials.create({ publicKey: options });
      if (!credential) throw new Error("Registrierung abgebrochen");
      await registerFinish(credential as PublicKeyCredential);
      setPasskeyMsg({ ok: true, text: "Passkey registriert" });
      const updated = await listCredentials();
      setPasskeys(updated);
    } catch (e) {
      setPasskeyMsg({ ok: false, text: "Passkey-Registrierung fehlgeschlagen" });
    } finally {
      setPasskeySaving(false);
    }
  }

  async function handleDeletePasskey(id: number) {
    try {
      await deleteCredential(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setPasskeyMsg({ ok: false, text: "Loeschen fehlgeschlagen" });
    }
  }

  async function handleRenamePasskey(id: number) {
    try {
      await renameCredential(id, editName);
      setPasskeys((prev) =>
        prev.map((p) => (p.id === id ? { ...p, device_name: editName } : p)),
      );
      setEditingPasskey(null);
      setEditName("");
    } catch {
      setPasskeyMsg({ ok: false, text: "Umbenennen fehlgeschlagen" });
    }
  }

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
      <PageHeader title="Authentifizierung" />

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

      {/* 2FA TOTP (local users only) */}
      {user?.auth_type === "local" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-green" />
            <h3 className="font-headline text-base font-semibold text-text">
              Zwei-Faktor-Authentifizierung (2FA)
            </h3>
          </div>

          {user.totp_enabled && !totpSetupData ? (
            // TOTP is enabled — show disable form
            <div className="space-y-2">
              <p className="text-sm text-green font-medium">2FA ist aktiviert</p>
              <p className="text-xs text-subtext0">
                Gib einen aktuellen Code ein, um 2FA zu deaktivieren.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpDisableCode}
                  onChange={(e) => setTotpDisableCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="flex-1 px-3 py-2 text-base text-center tracking-[0.3em] bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                />
                <button
                  disabled={totpSaving || totpDisableCode.length !== 6}
                  onClick={async () => {
                    setTotpSaving(true);
                    setTotpMsg(null);
                    try {
                      await totpDisable(totpDisableCode);
                      setTotpDisableCode("");
                      setTotpMsg({ ok: true, text: "2FA deaktiviert" });
                      await refresh();
                    } catch {
                      setTotpMsg({ ok: false, text: "Ungueltiger Code" });
                    } finally {
                      setTotpSaving(false);
                    }
                  }}
                  className="px-4 py-2 bg-red/15 text-red font-semibold rounded-lg disabled:opacity-50"
                >
                  Deaktivieren
                </button>
              </div>
            </div>
          ) : totpSetupData ? (
            // Setup in progress — show QR + verify
            <div className="space-y-3">
              <p className="text-sm text-subtext0">
                Scanne den QR-Code mit deiner Authenticator-App (z.B. Google Authenticator, Authy).
              </p>
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${totpSetupData.qr_code_base64}`}
                  alt="TOTP QR Code"
                  className="w-48 h-48 rounded-lg"
                />
              </div>
              <details className="text-xs text-subtext0">
                <summary className="cursor-pointer">Manueller Schluessel</summary>
                <code className="block mt-1 p-2 bg-ground rounded text-text break-all">
                  {totpSetupData.secret}
                </code>
              </details>
              <div className="p-3 bg-ground rounded-lg">
                <p className="text-xs text-subtext0 font-semibold mb-1">
                  Backup-Codes (einmalig, sicher aufbewahren):
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {totpSetupData.backup_codes.map((c) => (
                    <code key={c} className="text-xs text-text">{c}</code>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-subtext0 mb-1">
                  Bestaetigungscode eingeben *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={totpSetupCode}
                    onChange={(e) => setTotpSetupCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="flex-1 px-3 py-2 text-base text-center tracking-[0.3em] bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  />
                  <button
                    disabled={totpSaving || totpSetupCode.length !== 6}
                    onClick={async () => {
                      setTotpSaving(true);
                      setTotpMsg(null);
                      try {
                        await totpVerify(totpSetupCode);
                        setTotpSetupData(null);
                        setTotpSetupCode("");
                        setTotpMsg({ ok: true, text: "2FA aktiviert" });
                        await refresh();
                      } catch {
                        setTotpMsg({ ok: false, text: "Ungueltiger Code" });
                      } finally {
                        setTotpSaving(false);
                      }
                    }}
                    className="px-4 py-2 bg-peach text-ground font-semibold rounded-lg disabled:opacity-50"
                  >
                    Aktivieren
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setTotpSetupData(null); setTotpSetupCode(""); }}
                className="text-sm text-subtext0 underline"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            // Not enabled — show setup button
            <div className="space-y-2">
              <p className="text-xs text-subtext0">
                Schuetze dein Konto mit einer Authenticator-App.
              </p>
              <button
                disabled={totpSaving}
                onClick={async () => {
                  setTotpSaving(true);
                  setTotpMsg(null);
                  try {
                    const data = await totpSetup();
                    setTotpSetupData(data);
                  } catch {
                    setTotpMsg({ ok: false, text: "Setup fehlgeschlagen" });
                  } finally {
                    setTotpSaving(false);
                  }
                }}
                className="px-4 py-2 bg-green/15 text-green font-semibold rounded-lg disabled:opacity-50"
              >
                2FA einrichten
              </button>
            </div>
          )}

          {totpMsg && (
            <p className={`text-sm ${totpMsg.ok ? "text-green" : "text-red"}`}>
              {totpMsg.text}
            </p>
          )}
        </Card>
      )}

      {/* Passkeys (WebAuthn) */}
      {user && supportsWebAuthn && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-sapphire" />
            <h3 className="font-headline text-base font-semibold text-text">Passkeys</h3>
          </div>
          <p className="text-xs text-subtext0">
            Melde dich mit Fingerabdruck oder Face ID an — kein Passwort noetig.
          </p>

          {passkeys.length > 0 && (
            <div className="space-y-2">
              {passkeys.map((pk) => (
                <div key={pk.id} className="flex items-center justify-between bg-ground rounded-lg px-3 py-2">
                  {editingPasskey === pk.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm bg-surface0 text-text rounded border border-surface1"
                        placeholder="Geraetename"
                      />
                      <button
                        onClick={() => handleRenamePasskey(pk.id)}
                        className="text-xs text-green font-semibold"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditingPasskey(null)}
                        className="text-xs text-subtext0"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-text">
                        {pk.device_name || `Passkey ${pk.id}`}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingPasskey(pk.id); setEditName(pk.device_name || ""); }}
                          className="p-1 text-subtext0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePasskey(pk.id)}
                          className="p-1 text-red"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            disabled={passkeySaving}
            onClick={handleRegisterPasskey}
            className="px-4 py-2 bg-sapphire/15 text-sapphire font-semibold rounded-lg disabled:opacity-50"
          >
            {passkeySaving ? "Registriere..." : "Passkey hinzufuegen"}
          </button>

          {passkeyMsg && (
            <p className={`text-sm ${passkeyMsg.ok ? "text-green" : "text-red"}`}>
              {passkeyMsg.text}
            </p>
          )}
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
