/** User management page — list, create, edit, deactivate users (admin only). */

import { useState, useEffect } from "react";
import { Plus, Pencil, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import {
  listUsers,
  createUser,
  updateUser,
  setUserPassword,
  deleteUser,
  type AdminUser,
  type UserCreateData,
} from "../api/users";

type ModalMode = "create" | "edit" | "password" | null;

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Form state
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formRole, setFormRole] = useState("caregiver");
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    try {
      const data = await listUsers();
      setUsers(data);
    } catch {
      setMsg({ ok: false, text: "Benutzer konnten nicht geladen werden" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openCreate() {
    setFormUsername("");
    setFormPassword("");
    setFormDisplayName("");
    setFormRole("caregiver");
    setEditUser(null);
    setModal("create");
    setMsg(null);
  }

  function openEdit(u: AdminUser) {
    setEditUser(u);
    setFormDisplayName(u.display_name || "");
    setFormRole(u.role);
    setModal("edit");
    setMsg(null);
  }

  function openPassword(u: AdminUser) {
    setEditUser(u);
    setFormPassword("");
    setModal("password");
    setMsg(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const data: UserCreateData = {
        username: formUsername,
        password: formPassword,
        display_name: formDisplayName || undefined,
        role: formRole,
      };
      await createUser(data);
      setModal(null);
      await loadUsers();
      setMsg({ ok: true, text: `Benutzer "${formUsername}" erstellt` });
    } catch {
      setMsg({ ok: false, text: "Erstellen fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateUser(editUser.id, {
        display_name: formDisplayName,
        role: formRole,
      });
      setModal(null);
      await loadUsers();
      setMsg({ ok: true, text: "Benutzer aktualisiert" });
    } catch {
      setMsg({ ok: false, text: "Aktualisieren fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    setMsg(null);
    try {
      await setUserPassword(editUser.id, formPassword);
      setModal(null);
      setMsg({ ok: true, text: `Passwort fuer "${editUser.username}" gesetzt` });
    } catch {
      setMsg({ ok: false, text: "Passwort setzen fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(u: AdminUser) {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      await loadUsers();
    } catch {
      setMsg({ ok: false, text: "Status-Aenderung fehlgeschlagen" });
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Benutzer "${u.username}" wirklich loeschen?`)) return;
    try {
      await deleteUser(u.id);
      await loadUsers();
      setMsg({ ok: true, text: `Benutzer "${u.username}" geloescht` });
    } catch {
      setMsg({ ok: false, text: "Loeschen fehlgeschlagen" });
    }
  }

  if (loading) return <div className="text-center text-subtext0 py-8">Laden...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="Benutzerverwaltung" />
        <button
          onClick={openCreate}
          className="flex items-center gap-1 px-3 py-2 bg-peach text-ground font-semibold rounded-lg text-sm"
        >
          <Plus className="h-4 w-4" />
          Neu
        </button>
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p>
      )}

      {/* User List */}
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className={`p-3 ${!u.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text truncate">{u.display_name || u.username}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface1 text-subtext0">
                    {u.role}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface1 text-subtext0">
                    {u.auth_type === "forward_auth" ? "SSO" : "Lokal"}
                  </span>
                  {u.totp_enabled && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green/15 text-green">2FA</span>
                  )}
                  {!u.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red/15 text-red">Inaktiv</span>
                  )}
                </div>
                <p className="text-xs text-subtext0 mt-0.5">@{u.username}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(u)} className="p-2 text-subtext0" title="Bearbeiten">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => openPassword(u)} className="p-2 text-subtext0" title="Passwort setzen">
                  <KeyRound className="h-4 w-4" />
                </button>
                <button onClick={() => handleToggleActive(u)} className="p-2 text-subtext0" title={u.is_active ? "Deaktivieren" : "Aktivieren"}>
                  {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </button>
                <button onClick={() => handleDelete(u)} className="p-2 text-red" title="Loeschen">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-subtext0 text-center py-4">Keine Benutzer vorhanden</p>
        )}
      </div>

      {/* Modal Overlay */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-surface0 rounded-card p-5 space-y-4">
            <h3 className="font-headline text-base font-semibold text-text">
              {modal === "create" && "Neuer Benutzer"}
              {modal === "edit" && `${editUser?.username} bearbeiten`}
              {modal === "password" && `Passwort: ${editUser?.username}`}
            </h3>

            {modal === "create" && (
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm text-subtext0 mb-1">Benutzername *</label>
                  <input
                    type="text" required minLength={1} maxLength={100}
                    value={formUsername} onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  />
                </div>
                <div>
                  <label className="block text-sm text-subtext0 mb-1">Passwort * (min. 8)</label>
                  <input
                    type="password" required minLength={8} maxLength={200}
                    value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  />
                </div>
                <div>
                  <label className="block text-sm text-subtext0 mb-1">Anzeigename</label>
                  <input
                    type="text" maxLength={200}
                    value={formDisplayName} onChange={(e) => setFormDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  />
                </div>
                <div>
                  <label className="block text-sm text-subtext0 mb-1">Rolle</label>
                  <select
                    value={formRole} onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  >
                    <option value="caregiver">Caregiver</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-subtext0">Abbrechen</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-peach text-ground font-semibold rounded-lg disabled:opacity-50">
                    {saving ? "Erstelle..." : "Erstellen"}
                  </button>
                </div>
              </form>
            )}

            {modal === "edit" && (
              <form onSubmit={handleEdit} className="space-y-3">
                <div>
                  <label className="block text-sm text-subtext0 mb-1">Anzeigename</label>
                  <input
                    type="text" maxLength={200}
                    value={formDisplayName} onChange={(e) => setFormDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  />
                </div>
                <div>
                  <label className="block text-sm text-subtext0 mb-1">Rolle</label>
                  <select
                    value={formRole} onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  >
                    <option value="caregiver">Caregiver</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-subtext0">Abbrechen</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-peach text-ground font-semibold rounded-lg disabled:opacity-50">
                    {saving ? "Speichere..." : "Speichern"}
                  </button>
                </div>
              </form>
            )}

            {modal === "password" && (
              <form onSubmit={handleSetPassword} className="space-y-3">
                <div>
                  <label className="block text-sm text-subtext0 mb-1">Neues Passwort * (min. 8)</label>
                  <input
                    type="password" required minLength={8} maxLength={200}
                    value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-base bg-ground text-text rounded-lg border border-surface1 focus:outline-none focus:ring-2 focus:ring-peach"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-subtext0">Abbrechen</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-peach text-ground font-semibold rounded-lg disabled:opacity-50">
                    {saving ? "Setze..." : "Passwort setzen"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
