/** API Key management page — list, create, toggle, delete keys. */

import { useState } from "react";
import { ArrowLeft, Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { useApiKeys, useCreateApiKey, useDeleteApiKey, useUpdateApiKey } from "../hooks/useApiKeys";
import type { ApiKeyScope } from "../api/types";

const ALL_SCOPES: ApiKeyScope[] = ["read", "write", "admin"];

export default function ApiKeyPage() {
  const navigate = useNavigate();
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const updateKey = useUpdateApiKey();
  const deleteKey = useDeleteApiKey();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<ApiKeyScope[]>(["read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  function toggleScope(scope: ApiKeyScope) {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const result = await createKey.mutateAsync({ name: newName.trim(), scopes: newScopes });
    setCreatedKey(result.key);
    setNewName("");
    setNewScopes(["read"]);
    setShowForm(false);
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleToggleActive(id: number, currentActive: boolean) {
    updateKey.mutate({ id, data: { is_active: !currentActive } });
  }

  function handleDelete(id: number) {
    deleteKey.mutate(id);
    setDeleteConfirmId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 -ml-2 rounded-lg active:bg-surface1"
          aria-label="Zurueck"
        >
          <ArrowLeft className="h-5 w-5 text-subtext0" />
        </button>
        <KeyRound className="h-5 w-5 text-mauve" />
        <h2 className="font-headline text-lg font-semibold">API-Keys</h2>
      </div>

      {/* Created key display (one-time) */}
      {createdKey && (
        <Card className="p-4 space-y-2 border-2 border-peach">
          <p className="font-label text-sm font-medium text-red">
            Dieser Key wird nur einmal angezeigt. Bitte jetzt kopieren und sicher aufbewahren.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-mantle text-text font-mono text-sm break-all">
              {createdKey}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-surface1 active:bg-surface2"
              aria-label="Key kopieren"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green" />
              ) : (
                <Copy className="h-5 w-5 text-subtext0" />
              )}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="text-sm text-subtext0 underline"
          >
            Schliessen
          </button>
        </Card>
      )}

      {/* Create form */}
      {showForm ? (
        <Card className="p-4 space-y-3">
          <h3 className="font-headline text-base font-semibold">Neuer API-Key</h3>
          <div>
            <label className="font-label text-sm text-subtext0">Name *</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="z.B. Home Assistant"
              maxLength={100}
              className="mt-1 w-full min-h-[44px] px-3 rounded-[8px] bg-surface0 text-text font-body text-base border border-surface2 focus:outline-none focus:ring-2 focus:ring-peach"
            />
          </div>
          <div>
            <label className="font-label text-sm text-subtext0">Berechtigungen</label>
            <div className="flex gap-2 mt-1">
              {ALL_SCOPES.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    newScopes.includes(scope)
                      ? "bg-peach text-mantle"
                      : "bg-surface1 text-subtext0"
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || newScopes.length === 0 || createKey.isPending}
              className="flex-1 min-h-[44px] rounded-[8px] bg-peach text-mantle font-label text-sm font-medium disabled:opacity-50"
            >
              {createKey.isPending ? "Erstelle..." : "Key erstellen"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="min-h-[44px] px-4 rounded-[8px] bg-surface1 text-text font-label text-sm font-medium"
            >
              Abbrechen
            </button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 w-full min-h-[44px] px-4 rounded-[8px] bg-surface0 text-text font-label text-sm font-medium active:bg-surface1"
        >
          <Plus className="h-4 w-4" />
          Neuen Key erstellen
        </button>
      )}

      {/* Key list */}
      {isLoading ? (
        <p className="text-subtext0 text-sm">Lade...</p>
      ) : keys && keys.length > 0 ? (
        <div className="space-y-2">
          {keys.map((k) => (
            <Card key={k.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-label text-sm font-medium text-text truncate">{k.name}</p>
                  <p className="font-mono text-xs text-subtext0">{k.key_prefix}...</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={k.is_active}
                  onClick={() => handleToggleActive(k.id, k.is_active)}
                  className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${
                    k.is_active ? "bg-green" : "bg-surface2"
                  }`}
                  aria-label={`Key ${k.name} ${k.is_active ? "deaktivieren" : "aktivieren"}`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                      k.is_active ? "translate-x-[26px]" : "translate-x-[2px]"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {k.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-surface1 text-subtext0"
                  >
                    {scope}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-subtext0">
                <span>
                  Erstellt: {new Date(k.created_at).toLocaleDateString("de-DE")}
                </span>
                <span>
                  {k.last_used_at
                    ? `Zuletzt: ${new Date(k.last_used_at).toLocaleDateString("de-DE")}`
                    : "Noch nicht verwendet"}
                </span>
              </div>
              <div className="flex justify-end">
                {deleteConfirmId === k.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red">Wirklich loeschen?</span>
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="px-3 py-1 rounded bg-red text-mantle text-xs font-medium"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1 rounded bg-surface1 text-text text-xs font-medium"
                    >
                      Nein
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(k.id)}
                    className="p-2 rounded-lg active:bg-surface1"
                    aria-label={`Key ${k.name} loeschen`}
                  >
                    <Trash2 className="h-4 w-4 text-subtext0" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-subtext0 text-sm text-center py-8">
          Keine API-Keys vorhanden. Erstelle einen Key fuer den Zugriff durch externe Systeme.
        </p>
      )}
    </div>
  );
}
