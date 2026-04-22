/** Login page — username + password form with optional 2FA step. */

import { useState, useRef, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
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
          ? "Ungueltiger 2FA-Code"
          : "Benutzername oder Passwort falsch",
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
          MyBaby Login
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requiresTotp ? (
            <>
              <div>
                <label htmlFor="username" className="block text-sm text-subtext0 mb-1">
                  Benutzername *
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
                  Passwort *
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
                Gib den 6-stelligen Code aus deiner Authenticator-App ein.
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
            {submitting ? "Anmelden..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
