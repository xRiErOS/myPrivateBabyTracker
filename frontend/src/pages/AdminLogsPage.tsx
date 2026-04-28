/** Admin /logs page — list, filter, auto-refresh, download, clear. */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../context/ToastContext";
import { clearLogs, getDownloadUrl, listLogs, type LogEntry, type LogListResponse } from "../api/adminLogs";

const LEVEL_FILTERS = ["", "DEBUG", "INFO", "WARNING", "ERROR"] as const;
const PAGE_LIMIT = 100;

function levelBadgeClass(level: string | null): string {
  switch ((level || "").toLowerCase()) {
    case "error":
      return "bg-red/15 text-red";
    case "warning":
      return "bg-peach/15 text-peach";
    case "info":
      return "bg-sapphire/15 text-sapphire";
    case "debug":
      return "bg-overlay0/20 text-subtext0";
    default:
      return "bg-surface2 text-subtext0";
  }
}

function levelChipActiveClass(level: string): string {
  switch (level.toLowerCase()) {
    case "error":
      return "bg-red text-ground border-red";
    case "warning":
      return "bg-peach text-ground border-peach";
    case "info":
      return "bg-sapphire text-ground border-sapphire";
    case "debug":
      return "bg-overlay0 text-ground border-overlay0";
    default:
      return "bg-mauve text-ground border-mauve";
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString("de-DE", { hour12: false });
  } catch {
    return ts;
  }
}

function ExtraTable({ extras }: { extras: Record<string, unknown> }) {
  const entries = Object.entries(extras).filter(([k]) => k !== "logger");
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-1 gap-1 text-xs font-mono text-subtext0">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-overlay0">{k}=</span>
          <span className="break-all">{typeof v === "string" ? v : JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminLogsPage() {
  const { t } = useTranslation("admin");
  const { showToast } = useToast();
  const [data, setData] = useState<LogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);
  const [level, setLevel] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef<number | null>(null);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    setRefreshing(true);
    setError(null);
    setIs404(false);
    try {
      const resp = await listLogs({
        level: level || undefined,
        limit: PAGE_LIMIT,
        offset,
      });
      setData(resp);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (msg.includes("404")) {
        setIs404(true);
      } else if (msg.includes("403")) {
        showToast(t("logs.no_permission"), "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, offset]);

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      load(false);
    }, 5000);
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, level, offset]);

  async function handleClear() {
    if (!window.confirm(t("logs.confirm_clear"))) return;
    try {
      await clearLogs();
      showToast(t("logs.cleared"), "success");
      setOffset(0);
      await load(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(msg, "error");
    }
  }

  function handleDownload() {
    window.location.href = getDownloadUrl();
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <div className="space-y-4">
      <PageHeader title={t("logs.title")} />

      {/* Filter-Bar — Level-Chips prominent */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-label text-sm font-semibold text-text">
            {t("logs.filter_level")}
          </span>
          {data && (
            <span className="font-body text-xs text-subtext0">
              {t("logs.summary", { total: data.total, size: formatBytes(data.file_size) })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("logs.filter_level")}>
          {LEVEL_FILTERS.map((lvl) => {
            const isActive = level === lvl;
            const labelText = lvl === "" ? t("logs.all_levels") : lvl;
            return (
              <button
                key={lvl || "ALL"}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  setLevel(lvl);
                  setOffset(0);
                }}
                className={`min-h-[44px] px-4 rounded-[8px] border-2 font-label text-sm font-semibold transition-colors ${
                  isActive
                    ? levelChipActiveClass(lvl)
                    : "bg-surface0 text-subtext0 border-surface2 hover:border-overlay0 hover:text-text"
                }`}
              >
                {labelText}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Action-Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              {t("logs.refresh")}
            </span>
          </Button>

          <label
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-[8px] cursor-pointer select-none border-2 transition-colors ${
              autoRefresh
                ? "bg-green/15 text-green border-green"
                : "bg-surface0 text-subtext0 border-surface2 hover:border-overlay0"
            }`}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="sr-only"
            />
            <RefreshCw
              size={16}
              className={autoRefresh ? "animate-spin" : "opacity-60"}
            />
            <span className="font-label text-sm font-semibold">
              {t("logs.auto_refresh")}
            </span>
          </label>

          <div className="flex-1" />

          <Button type="button" variant="secondary" onClick={handleDownload}>
            <span className="inline-flex items-center gap-2">
              <Download size={18} />
              {t("logs.download")}
            </span>
          </Button>

          <Button type="button" variant="danger" onClick={handleClear}>
            <span className="inline-flex items-center gap-2">
              <Trash2 size={18} />
              {t("logs.clear")}
            </span>
          </Button>
        </div>
      </Card>

      {error && !is404 && (
        <div className="rounded-[8px] border border-red bg-red/10 p-3 text-sm text-red">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : is404 ? (
        <Card className="p-6 text-center space-y-2">
          <p className="font-body text-sm font-semibold text-peach">
            {t("logs.endpoint_404_title")}
          </p>
          <p className="font-body text-sm text-subtext0">
            {t("logs.endpoint_404_hint")}
          </p>
        </Card>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="space-y-1.5">
            {data.items.map((entry: LogEntry, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${levelBadgeClass(
                      entry.level,
                    )}`}
                  >
                    {entry.level || "-"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono text-sm text-text">
                        {entry.event || "(kein event)"}
                      </span>
                      {entry.logger && (
                        <span className="text-[10px] text-overlay0">[{entry.logger}]</span>
                      )}
                      <span className="text-xs text-subtext0 ml-auto">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <ExtraTable extras={entry.extras} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
              >
                {t("logs.prev")}
              </Button>
              <span className="font-body text-sm text-subtext0">
                {t("logs.page_of", { current: currentPage, total: totalPages })}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={offset + PAGE_LIMIT >= (data.total ?? 0)}
                onClick={() => setOffset(offset + PAGE_LIMIT)}
              >
                {t("logs.next")}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="p-6 text-center text-subtext0">
          {data && !data.file_exists ? t("logs.no_file") : t("logs.empty")}
        </Card>
      )}
    </div>
  );
}
