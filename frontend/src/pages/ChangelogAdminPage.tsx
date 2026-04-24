/** Admin page for managing changelog entries — CRUD on /api/v1/changelog. */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";

type ChangelogVariant = "update" | "info" | "warning";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  entries: string[];
  variant?: ChangelogVariant;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api/v1${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res;
}

async function listChangelog(): Promise<ChangelogEntry[]> {
  const res = await apiFetch("/changelog");
  return res.json();
}

async function createChangelog(payload: ChangelogEntry): Promise<ChangelogEntry> {
  const res = await apiFetch("/changelog", { method: "POST", body: JSON.stringify(payload) });
  return res.json();
}

async function updateChangelog(version: string, payload: Partial<Omit<ChangelogEntry, "version">>): Promise<ChangelogEntry> {
  const res = await apiFetch(`/changelog/${encodeURIComponent(version)}`, { method: "PUT", body: JSON.stringify(payload) });
  return res.json();
}

async function deleteChangelog(version: string): Promise<void> {
  await apiFetch(`/changelog/${encodeURIComponent(version)}`, { method: "DELETE" });
}

interface FormState {
  version: string;
  date: string;
  title: string;
  entriesText: string; // markdown text
  variant: ChangelogVariant;
}

const emptyForm = (): FormState => ({
  version: "",
  date: new Date().toISOString().slice(0, 10),
  title: "",
  entriesText: "",
  variant: "update",
});

const VARIANT_OPTIONS: { value: ChangelogVariant; label: string; color: string }[] = [
  { value: "update", label: "Update", color: "bg-peach text-ground" },
  { value: "info", label: "Info", color: "bg-sapphire text-ground" },
  { value: "warning", label: "Warnung", color: "bg-red text-ground" },
];

export default function ChangelogAdminPage() {
  const { t } = useTranslation("admin");
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editVersion, setEditVersion] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await listChangelog();
      setEntries(data);
    } catch {
      setMsg({ ok: false, text: t("changelog.load_failed") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(emptyForm());
    setEditVersion(null);
    setShowForm(true);
    setMsg(null);
  }

  function openEdit(entry: ChangelogEntry) {
    setForm({
      version: entry.version,
      date: entry.date,
      title: entry.title,
      entriesText: entry.entries.join("\n"),
      variant: entry.variant ?? "update",
    });
    setEditVersion(entry.version);
    setShowForm(true);
    setMsg(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditVersion(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const entriesList = form.entriesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      if (editVersion) {
        await updateChangelog(editVersion, { date: form.date, title: form.title, entries: entriesList, variant: form.variant });
        setMsg({ ok: true, text: t("changelog.updated") });
      } else {
        await createChangelog({ version: form.version, date: form.date, title: form.title, entries: entriesList, variant: form.variant });
        setMsg({ ok: true, text: t("changelog.created") });
      }
      cancelForm();
      await load();
    } catch (err: unknown) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("changelog.save_failed") });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(version: string) {
    try {
      await deleteChangelog(version);
      setMsg({ ok: true, text: t("changelog.deleted") });
      setDeleteConfirm(null);
      await load();
    } catch {
      setMsg({ ok: false, text: t("changelog.delete_failed") });
    }
  }

  const inputClass =
    "w-full min-h-[44px] px-3 py-2 rounded-[8px] bg-surface0 text-text font-body text-base border border-surface2 focus:outline-none focus:ring-2 focus:ring-peach";

  return (
    <div className="space-y-4">
      <PageHeader title={t("changelog.title")} />

      {msg && (
        <div
          className={`px-4 py-3 rounded-[8px] font-body text-sm ${
            msg.ok ? "bg-green/20 text-green" : "bg-red/20 text-red"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* New entry button */}
      {!showForm && (
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-[8px] bg-peach text-base font-label font-medium text-crust"
        >
          <Plus className="h-4 w-4" />
          {t("changelog.add")}
        </button>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <Card className="p-4 space-y-3">
          <h3 className="font-headline text-base font-semibold text-text">
            {editVersion ? t("changelog.edit") : t("changelog.new")}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="font-label text-sm text-subtext0 block mb-1">
                {t("changelog.version")} *
              </label>
              <input
                type="text"
                required
                disabled={!!editVersion}
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                placeholder="0.6.4"
                className={inputClass}
              />
            </div>
            <div>
              <label className="font-label text-sm text-subtext0 block mb-1">
                {t("changelog.date")} *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="font-label text-sm text-subtext0 block mb-1">
                {t("changelog.title_label")} *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("changelog.title_placeholder")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="font-label text-sm text-subtext0 block mb-1">
                Variante
              </label>
              <div className="flex gap-2">
                {VARIANT_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, variant: v.value }))}
                    className={`min-h-[44px] px-4 py-2 rounded-[8px] font-label text-sm font-medium transition-colors ${
                      form.variant === v.value ? v.color : "bg-surface1 text-subtext0"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-label text-sm text-subtext0 block mb-1">
                Text
              </label>
              <textarea
                rows={6}
                value={form.entriesText}
                onChange={(e) => setForm((f) => ({ ...f, entriesText: e.target.value }))}
                placeholder={t("changelog.entries_placeholder")}
                className={`${inputClass} min-h-[120px] resize-y`}
              />
              <p className="font-body text-xs text-subtext0 mt-1">{t("changelog.entries_hint")}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-[8px] bg-peach text-ground font-label font-medium text-sm disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {editVersion ? t("changelog.update_btn") : t("changelog.create_btn")}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-[8px] bg-surface1 text-text font-label font-medium text-sm"
              >
                <X className="h-4 w-4" />
                {t("changelog.cancel")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Entry list */}
      {loading ? (
        <p className="font-body text-sm text-subtext0 text-center py-8">{t("changelog.loading")}</p>
      ) : entries.length === 0 ? (
        <Card className="p-4 text-center">
          <p className="font-body text-sm text-subtext0">{t("changelog.no_entries")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.version} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-label text-sm font-semibold text-peach">v{entry.version}</span>
                    <span className="font-body text-xs text-subtext0">{entry.date}</span>
                  </div>
                  <p className="font-headline text-sm font-medium text-text mt-0.5">{entry.title}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    className="p-2 rounded-[8px] text-subtext0 hover:text-text hover:bg-surface1 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={t("changelog.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {deleteConfirm === entry.version ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.version)}
                        className="p-2 rounded-[8px] text-red hover:bg-red/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={t("changelog.confirm_delete")}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="p-2 rounded-[8px] text-subtext0 hover:bg-surface1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={t("changelog.cancel")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(entry.version)}
                      className="p-2 rounded-[8px] text-subtext0 hover:text-red hover:bg-red/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={t("changelog.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {entry.entries.length > 0 && (
                <ul className="space-y-0.5 pl-3 border-l-2 border-surface2">
                  {entry.entries.map((item, i) => (
                    <li key={i} className="font-body text-xs text-subtext1">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
