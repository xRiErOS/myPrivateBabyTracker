/** Auth settings page — shows auth mode, current user, password change, 2FA, passkeys, logout. */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

const AUTH_MODE_KEYS: Record<string, string> = {
  disabled: "settings.mode_disabled",
  local: "settings.mode_local",
  forward: "settings.mode_forward",
  both: "settings.mode_both",
};

export default function AuthSettingsPage() {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
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
      if (!credential) throw new Error(t("passkey.register_cancelled"));
      await registerFinish(credential as PublicKeyCredential);
      setPasskeyMsg({ ok: true, text: t("passkey.registered") });
      const updated = await listCredentials();
      setPasskeys(updated);
    } catch (e) {
      setPasskeyMsg({ ok: false, text: t("passkey.register_failed") });
    } finally {
      setPasskeySaving(false);
    }
  }

  async function handleDeletePasskey(id: number) {
    try {
      await deleteCredential(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setPasskeyMsg({ ok: false, text: t("passkey.delete_failed") });
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
      setPasskeyMsg({ ok: false, text: t("passkey.rename_failed") });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMsg({ ok: true, text: t("settings.password_changed") });
      setCurrentPw("");
      setNewPw("");
    } catch {
      setPwMsg({ ok: false, text: t("settings.password_change_failed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("settings.title")} />

      {/* Auth Mode Info */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-sapphire" />
          <h3 className="font-headline text-base font-semibold text-text">{t("settings.auth_mode")}</h3>
        </div>
        <p className="font-body text-sm text-text">
          {t(AUTH_MODE_KEYS[authMode] ?? authMode)}
        </p>
        <p className="font-body text-xs text-subtext0">
          {t("settings.mode_env_hint")}
        </p>
      </Card>

      {/* Current User */}
      {user && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-sapphire" />
            <h3 className="font-headline text-base font-semibold text-text">{t("settings.logged_in_as")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-subtext0">{t("settings.user_info.username")}</span>
            <span className="text-text">{user.username}</span>
            <span className="text-subtext0">{t("settings.user_info.display_name")}</span>
            <span className="text-text">{user.display_name ?? "-"}</span>
            <span className="text-subtext0">{t("settings.user_info.role")}</span>
            <span className="text-text">{user.role}</span>
            <span className="text-subtext0">{t("settings.user_info.auth_type")}</span>
            <span className="text-text">{user.auth_type}</span>
          </div>
        </Card>
      )}

      {/* Change Password (local users only) */}
      {canChangePassword && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-peach" />
            <h3 className="font-headline text-base font-semibold text-text">{t("settings.change_password")}</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm text-subtext0 mb-1">{t("settings.current_password")} *</label>
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
              <label className="block text-sm text-subtext0 mb-1">{t("settings.new_password")}</label>
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
              {saving ? tc("saving") : t("settings.change_password")}
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
              {t("totp.title")}
            </h3>
          </div>

          {user.totp_enabled && !totpSetupData ? (
            // TOTP is enabled — show disable form
            <div className="space-y-2">
              <p className="text-sm text-green font-medium">{t("totp.enabled")}</p>
              <p className="text-xs text-subtext0">
                {t("totp.disable_hint")}
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
                      setTotpMsg({ ok: true, text: t("totp.deactivated") });
                      await refresh();
                    } catch {
                      setTotpMsg({ ok: false, text: t("totp.invalid_code") });
                    } finally {
                      setTotpSaving(false);
                    }
                  }}
                  className="px-4 py-2 bg-red/15 text-red font-semibold rounded-lg disabled:opacity-50"
                >
                  {t("totp.disable")}
                </button>
              </div>
            </div>
          ) : totpSetupData ? (
            // Setup in progress — show QR + verify
            <div className="space-y-3">
              <p className="text-sm text-subtext0">
                {t("totp.scan_qr")}
              </p>
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${totpSetupData.qr_code_base64}`}
                  alt="TOTP QR Code"
                  className="w-48 h-48 rounded-lg"
                />
              </div>
              <details className="text-xs text-subtext0">
                <summary className="cursor-pointer">{t("totp.manual_key")}</summary>
                <code className="block mt-1 p-2 bg-ground rounded text-text break-all">
                  {totpSetupData.secret}
                </code>
              </details>
              <div className="p-3 bg-ground rounded-lg">
                <p className="text-xs text-subtext0 font-semibold mb-1">
                  {t("totp.backup_codes")}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {totpSetupData.backup_codes.map((c) => (
                    <code key={c} className="text-xs text-text">{c}</code>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-subtext0 mb-1">
                  {t("totp.verify_code")} *
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
                        setTotpMsg({ ok: true, text: t("totp.activated") });
                        await refresh();
                      } catch {
                        setTotpMsg({ ok: false, text: t("totp.invalid_code") });
                      } finally {
                        setTotpSaving(false);
                      }
                    }}
                    className="px-4 py-2 bg-peach text-ground font-semibold rounded-lg disabled:opacity-50"
                  >
                    {t("totp.activate")}
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setTotpSetupData(null); setTotpSetupCode(""); }}
                className="text-sm text-subtext0 underline"
              >
                {tc("cancel")}
              </button>
            </div>
          ) : (
            // Not enabled — show setup button
            <div className="space-y-2">
              <p className="text-xs text-subtext0">
                {t("totp.protect_hint")}
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
                    setTotpMsg({ ok: false, text: t("totp.setup_failed") });
                  } finally {
                    setTotpSaving(false);
                  }
                }}
                className="px-4 py-2 bg-green/15 text-green font-semibold rounded-lg disabled:opacity-50"
              >
                {t("totp.enable")}
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
            <h3 className="font-headline text-base font-semibold text-text">{t("passkey.title")}</h3>
          </div>
          <p className="text-xs text-subtext0">
            {t("passkey.hint")}
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
