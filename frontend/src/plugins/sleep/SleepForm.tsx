/** Sleep entry form — create/edit sleep with start/stop timer + live running display. */

import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { TagSelector } from "../../components/TagSelector";
import { useActiveChild } from "../../context/ChildContext";
import { useCreateSleep, useUpdateSleep } from "../../hooks/useSleep";
import { formatDateTime, isoToLocalInput, localInputToISO, nowISO } from "../../lib/dateUtils";
import { ApiError } from "../../api/client";
import { attachTag } from "../../api/tags";
import type { SleepEntry, SleepType } from "../../api/types";

interface SleepFormProps {
  entry?: SleepEntry;
  onDone?: () => void;
  onCancel?: () => void;
}

/** Format elapsed seconds as HH:MM:SS. */
function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function SleepForm({ entry, onDone, onCancel }: SleepFormProps) {
  const { t } = useTranslation("sleep");
  const { t: tc } = useTranslation("common");
  const { activeChild } = useActiveChild();
  const createMut = useCreateSleep();
  const updateMut = useUpdateSleep();

  const SLEEP_TYPE_OPTIONS = [
    { value: "nap", label: t("type.nap") },
    { value: "night", label: t("type.night") },
  ];

  const LOCATION_OPTIONS = [
    { value: "bed", label: t("location.bed") },
    { value: "carrier", label: t("location.carrier") },
    { value: "stroller", label: t("location.stroller") },
    { value: "car", label: t("location.car") },
    { value: "other", label: t("location.other") },
  ];

  const [sleepType, setSleepType] = useState<SleepType>(entry?.sleep_type ?? "nap");
  const [startTime, setStartTime] = useState(
    entry?.start_time ? isoToLocalInput(entry.start_time) : isoToLocalInput(nowISO()),
  );
  const [endTime, setEndTime] = useState(
    entry?.end_time ? isoToLocalInput(entry.end_time) : "",
  );
  const [location, setLocation] = useState(entry?.location ?? "");
  const [showLocation, setShowLocation] = useState(!!entry?.location);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pendingTagIds, setPendingTagIds] = useState<number[]>([]);

  const isRunning = entry != null && entry.end_time == null;
  const isEditing = entry != null && entry.end_time != null;
  const isNew = entry == null;
  const isPending = createMut.isPending || updateMut.isPending;

  // Live timer for running sleep entries
  useEffect(() => {
    if (!isRunning || !entry?.start_time) return;

    function tick() {
      const start = new Date(entry!.start_time).getTime();
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, entry?.start_time]);

  /** Start timer: creates a sleep entry with start_time=now, no end_time */
  async function handleStartTimer() {
    if (!activeChild) return;
    setError(null);

    try {
      const result = await createMut.mutateAsync({
        child_id: activeChild.id,
        start_time: nowISO(),
        end_time: null,
        sleep_type: sleepType,
        location: location || null,
        notes: notes || null,
      });
      if (pendingTagIds.length > 0) {
        await Promise.all(pendingTagIds.map(tagId =>
          attachTag({ tag_id: tagId, entry_type: "sleep", entry_id: result.id })
        ));
      }
      onDone?.();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function handleStopAndSave() {
    if (!entry || !activeChild) return;
    setError(null);

    try {
      await updateMut.mutateAsync({
        id: entry.id,
        data: { end_time: nowISO() },
      });
      onDone?.();
    } catch (err) {
      handleApiError(err);
    }
  }

  /** Replace ISO timestamps in error messages with local date/time. */
  function localizeTimestamps(msg: string): string {
    return msg.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g, (match) => {
      try {
        // Timestamps without Z or offset are UTC from the backend — append Z
        const iso = /Z|[+-]\d{2}:\d{2}$/.test(match) ? match : match + "Z";
        return formatDateTime(iso);
      } catch {
        return match;
      }
    });
  }

  function handleApiError(err: unknown) {
    if (err instanceof ApiError) {
      try {
        const body = JSON.parse(err.message.replace(/^API \d+: /, ""));
        setError(localizeTimestamps(body.detail || err.message));
      } catch {
        const msg = err.message.replace(/^API \d+: /, "");
        setError(localizeTimestamps(msg));
      }
    } else if (err instanceof Error) {
      setError(localizeTimestamps(err.message));
    } else {
      setError(tc("errors.unknown"));
    }
  }

  /** Manual save: only for entries with start + end (nachtraegen or editing) */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeChild) return;
    setError(null);

    const payload = {
      child_id: activeChild.id,
      start_time: localInputToISO(startTime),
      end_time: endTime ? localInputToISO(endTime) : null,
      sleep_type: sleepType,
      location: location || null,
      notes: notes || null,
    };

    try {
      if (entry) {
        const { child_id: _, ...updateData } = payload;
        await updateMut.mutateAsync({ id: entry.id, data: updateData });
        onDone?.();
      } else {
        const result = await createMut.mutateAsync(payload);
        if (pendingTagIds.length > 0) {
          await Promise.all(pendingTagIds.map(tagId =>
            attachTag({ tag_id: tagId, entry_type: "sleep", entry_id: result.id })
          ));
        }
        onDone?.();
      }
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Running timer banner */}
      {isRunning && (
        <div className="rounded-[8px] border-2 border-green bg-green/10 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label text-sm font-semibold text-green">
              {t("timer_running")}
            </span>
            <span className="font-mono text-lg font-bold text-green">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <Button
            type="button"
            variant="success"
            onClick={handleStopAndSave}
            disabled={isPending}
          >
            {isPending ? t("stopping") : t("stop_now")}
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-[8px] border border-red bg-red/10 p-3 text-sm text-red">
          {error}
        </div>
      )}

      {/* New entry: Timer start OR manual entry */}
      {isNew && (
        <>
          <Select
            label={tc("type")}
            options={SLEEP_TYPE_OPTIONS}
            value={sleepType}
            onChange={(e) => setSleepType(e.target.value as SleepType)}
          />

          {/* Optional location toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={showLocation}
              onClick={() => { setShowLocation(!showLocation); if (showLocation) setLocation(""); }}
              className={`relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors ${showLocation ? "bg-green" : "bg-surface2"}`}
            >
              <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${showLocation ? "translate-x-[26px]" : "translate-x-[2px]"}`} />
            </button>
            <span className="font-label text-sm text-subtext0">{t("location.toggle")}</span>
          </div>
          {showLocation && (
            <div className="grid grid-cols-5 gap-1.5">
              {LOCATION_OPTIONS.map((loc) => (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setLocation(location === loc.value ? "" : loc.value)}
                  className={`min-h-[44px] rounded-[8px] font-label text-xs font-medium transition-colors ${
                    location === loc.value
                      ? "bg-mauve text-ground"
                      : "bg-surface1 text-text hover:bg-surface2"
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-surface1">
            <TagSelector entryType="sleep" pendingTagIds={pendingTagIds} onPendingChange={setPendingTagIds} />
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleStartTimer}
            disabled={isPending}
            className="bg-mauve text-ground"
          >
            {isPending ? t("starting") : t("start_now")}
          </Button>

          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 h-px bg-overlay0/30" />
            <span className="font-label text-xs text-overlay0">{tc("add")}</span>
            <div className="flex-1 h-px bg-overlay0/30" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              label={t("label_start")}
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label={t("label_end")}
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
            <Input
              label={tc("notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tc("notes_placeholder")}
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{tc("cancel")}</Button>}
              <Button type="submit" disabled={isPending || !startTime || !endTime}>
                {isPending ? tc("saving") : tc("add")}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* Edit existing (completed) entry */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Select
            label={tc("type")}
            options={SLEEP_TYPE_OPTIONS}
            value={sleepType}
            onChange={(e) => setSleepType(e.target.value as SleepType)}
          />
          <Select
            label={t("location.toggle")}
            options={[{ value: "", label: "-" }, ...LOCATION_OPTIONS]}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Input
            label="Beginn"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="Ende"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <Input
            label="Notizen"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionale Notizen..."
            maxLength={2000}
          />
          <div className="pt-3 border-t border-surface1">
            <TagSelector entryType="sleep" entryId={entry!.id} />
          </div>
          <div className="flex justify-end gap-2">
            {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{tc("cancel")}</Button>}
            <Button type="submit" disabled={isPending || !startTime}>
              {isPending ? tc("saving") : tc("update")}
            </Button>
          </div>
        </form>
      )}

      {/* Running entry: start time + notes editable below timer */}
      {isRunning && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Select
            label={tc("type")}
            options={SLEEP_TYPE_OPTIONS}
            value={sleepType}
            onChange={(e) => setSleepType(e.target.value as SleepType)}
          />
          <Input
            label="Beginn"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="Notizen"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionale Notizen..."
            maxLength={2000}
          />
          <div className="pt-3 border-t border-surface1">
            <TagSelector entryType="sleep" entryId={entry!.id} />
          </div>
          <div className="flex justify-end gap-2">
            {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{tc("cancel")}</Button>}
            <Button type="submit" disabled={isPending}>
              {isPending ? tc("saving") : tc("update")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
