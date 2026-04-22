/** Login page — username + password form with optional 2FA step + passkey login. */

import { useState, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { loginBegin, loginFinish } from "../api/webauthn";

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const { login, requiresTotp } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const totpRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (requiresTotp) {
        await login(username, password, totpCode);
      } else {
        await login(username, password);
      }
    } catch {
      setError(
        requiresTotp
          ? t("login.error_totp")
          : t("login.error_credentials"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-focus TOTP input when switching to 2FA step
  if (requiresTotp && totpRef.current && !totpCode) {
    setTimeout(() => totpRef.current?.focus(), 100);
  }

  return (
    <div className="min-h-screen bg-ground flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface0 rounded-card p-6">
        <h1 className="text-xl font-semibold text-text mb-6 text-center">
          {t("login.title")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requiresTotp ? (
            <>
              <div>
                <label htmlFor="username" className="block text-sm text-subtext0 mb-1">
                  {t("login.username")} *
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm text-subtext0 mb-1">
                  {t("login.password")} *
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                />
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-subtext0 mb-3">
                {t("login.totp_hint")}
              </p>
              <input
                ref={totpRef}
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2 text-base text-center tracking-[0.3em] bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                placeholder="000000"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-peach text-ground font-semibold rounded-lg disabled:opacity-50"
          >
            {submitting ? t("login.logging_in") : t("login.submit")}
          </button>

          {!requiresTotp && typeof window !== "undefined" && window.PublicKeyCredential && (
            <>
              <div className="flex items-center gap-2 text-xs text-subtext0">
                <span className="flex-1 border-t border-surface1" />
                {tc("or")}
                <span className="flex-1 border-t border-surface1" />
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setError(null);
                  setSubmitting(true);
                  try {
                    const options = await loginBegin();
                    const credential = await navigator.credentials.get({ publicKey: options });
                    if (!credential) throw new Error(t("login.error_cancelled"));
                    await loginFinish(credential as PublicKeyCredential);
                    window.location.reload();
                  } catch {
                    setError(t("login.error_passkey"));
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full py-3 bg-sapphire/15 text-sapphire font-semibold rounded-lg disabled:opacity-50"
              >
                {t("login.use_passkey")}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
