"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar, Clock, Plus, Trash2, Save, Loader2, AlertCircle,
  CalendarOff, Settings as SettingsIcon, X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  availabilityApi,
  type AvailSchedule,
  type AvailOverride,
  type AvailSettings,
  type TimeWindow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Empty editable row keyed by weekday — local state, syncs with server on save
type EditableDay = { enabled: boolean; windows: TimeWindow[]; saving: boolean; dirty: boolean };

function emptyDay(): EditableDay {
  return { enabled: false, windows: [], saving: false, dirty: false };
}

function timeOk(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function todayYmd() {
  const d = new Date();
  // local-ish IST is fine since chefs are all in Ahmedabad
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function AvailabilityPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState<EditableDay[]>(
    Array.from({ length: 7 }, () => emptyDay()),
  );
  const [overrides, setOverrides] = useState<AvailOverride[]>([]);
  const [settings, setSettings] = useState<AvailSettings>({
    min_advance_notice_minutes: 60,
    booking_buffer_minutes: 30,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // New override draft
  const [ovDate, setOvDate] = useState("");
  const [ovClosed, setOvClosed] = useState(true);
  const [ovWindows, setOvWindows] = useState<TimeWindow[]>([]);
  const [ovNote, setOvNote] = useState("");
  const [savingOv, setSavingOv] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await availabilityApi.getMine();
      const payload = data?.data ?? data;
      const sched: AvailSchedule[] = payload?.schedules ?? [];
      const ovrs: AvailOverride[] = payload?.overrides ?? [];
      const sett: AvailSettings = payload?.settings ?? {
        min_advance_notice_minutes: 60,
        booking_buffer_minutes: 30,
      };

      const next = Array.from({ length: 7 }, () => emptyDay());
      for (const s of sched) {
        if (s.weekday >= 0 && s.weekday <= 6) {
          next[s.weekday] = {
            enabled: s.enabled,
            windows: Array.isArray(s.windows) ? s.windows : [],
            saving: false,
            dirty: false,
          };
        }
      }
      setDays(next);
      setOverrides(ovrs);
      setSettings(sett);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load availability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Day editing ────────────────────────────────────
  function setDay(idx: number, patch: Partial<EditableDay>) {
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch, dirty: true } : d)),
    );
  }

  function toggleDay(idx: number) {
    const d = days[idx];
    const enabled = !d.enabled;
    setDay(idx, {
      enabled,
      windows: enabled && d.windows.length === 0 ? [{ start: "11:00", end: "14:00" }] : d.windows,
    });
  }

  function addWindow(idx: number) {
    const d = days[idx];
    setDay(idx, { windows: [...d.windows, { start: "18:00", end: "22:00" }] });
  }

  function removeWindow(idx: number, wIdx: number) {
    const d = days[idx];
    setDay(idx, { windows: d.windows.filter((_, i) => i !== wIdx) });
  }

  function updateWindow(idx: number, wIdx: number, patch: Partial<TimeWindow>) {
    const d = days[idx];
    setDay(idx, {
      windows: d.windows.map((w, i) => (i === wIdx ? { ...w, ...patch } : w)),
    });
  }

  async function saveDay(idx: number) {
    const d = days[idx];
    // Validate
    if (d.enabled) {
      if (d.windows.length === 0) {
        toast.error("Add at least one time window or turn the day off.");
        return;
      }
      for (const w of d.windows) {
        if (!timeOk(w.start) || !timeOk(w.end)) {
          toast.error("Use 24-hour HH:mm times.");
          return;
        }
        if (w.end <= w.start) {
          toast.error("End time must be after start time.");
          return;
        }
      }
    }
    setDays((prev) => prev.map((x, i) => (i === idx ? { ...x, saving: true } : x)));
    try {
      await availabilityApi.upsertSchedule({
        weekday: idx,
        enabled: d.enabled,
        windows: d.enabled ? d.windows : [],
      });
      toast.success(`${WEEKDAYS[idx]} saved`);
      setDays((prev) =>
        prev.map((x, i) => (i === idx ? { ...x, saving: false, dirty: false } : x)),
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Save failed");
      setDays((prev) => prev.map((x, i) => (i === idx ? { ...x, saving: false } : x)));
    }
  }

  // ─── Settings ───────────────────────────────────────
  async function saveSettings() {
    setSavingSettings(true);
    try {
      const { data } = await availabilityApi.updateSettings(settings);
      const next = data?.data ?? data;
      setSettings({
        min_advance_notice_minutes: next.min_advance_notice_minutes ?? settings.min_advance_notice_minutes,
        booking_buffer_minutes: next.booking_buffer_minutes ?? settings.booking_buffer_minutes,
      });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Save failed");
    } finally {
      setSavingSettings(false);
    }
  }

  // ─── Overrides ──────────────────────────────────────
  function addOvWindow() {
    setOvWindows([...ovWindows, { start: "11:00", end: "14:00" }]);
  }
  function removeOvWindow(i: number) {
    setOvWindows(ovWindows.filter((_, idx) => idx !== i));
  }
  function updateOvWindow(i: number, patch: Partial<TimeWindow>) {
    setOvWindows(ovWindows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }

  async function submitOverride() {
    if (!ovDate) return toast.error("Pick a date.");
    if (ovDate < todayYmd()) return toast.error("Cannot override past dates.");
    if (!ovClosed) {
      if (ovWindows.length === 0) return toast.error("Add at least one window or mark closed.");
      for (const w of ovWindows) {
        if (!timeOk(w.start) || !timeOk(w.end) || w.end <= w.start) {
          return toast.error("Invalid window times.");
        }
      }
    }
    setSavingOv(true);
    try {
      await availabilityApi.upsertOverride({
        date: ovDate,
        closed: ovClosed,
        windows: ovClosed ? [] : ovWindows,
        note: ovNote || undefined,
      });
      toast.success("Override saved");
      setOvDate(""); setOvClosed(true); setOvWindows([]); setOvNote("");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Save failed");
    } finally {
      setSavingOv(false);
    }
  }

  async function deleteOverride(id: string) {
    if (!confirm("Remove this override?")) return;
    try {
      await availabilityApi.deleteOverride(id);
      setOverrides(overrides.filter((o) => o.id !== id));
      toast.success("Override removed");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--orange-500)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
        <span className="text-[0.88rem] text-red-700">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings */}
      <div className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <SettingsIcon className="w-4 h-4 text-[var(--orange-500)]" />
          <h3 className="font-bold text-[0.95rem]">Booking Rules</h3>
        </div>
        <p className="text-[0.82rem] text-[var(--text-muted)] mb-4">
          These rules apply across all your available days.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[0.78rem] font-semibold mb-1.5 block">
              Minimum advance notice
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={10080} step={15}
                value={settings.min_advance_notice_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, min_advance_notice_minutes: Math.max(0, parseInt(e.target.value || "0", 10)) })
                }
                className="w-28 px-3 py-2 rounded-[10px] border border-[var(--cream-300)] text-[0.88rem]"
              />
              <span className="text-[0.82rem] text-[var(--text-muted)]">minutes</span>
            </div>
            <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">
              Customers can&apos;t book within this window. Default: 60.
            </p>
          </div>
          <div>
            <label className="text-[0.78rem] font-semibold mb-1.5 block">
              Buffer between bookings
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={240} step={15}
                value={settings.booking_buffer_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, booking_buffer_minutes: Math.max(0, parseInt(e.target.value || "0", 10)) })
                }
                className="w-28 px-3 py-2 rounded-[10px] border border-[var(--cream-300)] text-[0.88rem]"
              />
              <span className="text-[0.82rem] text-[var(--text-muted)]">minutes</span>
            </div>
            <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">
              Travel/setup gap between back-to-back bookings. Default: 30.
            </p>
          </div>
        </div>
        <button
          onClick={saveSettings} disabled={savingSettings}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--brown-800)] text-white text-[0.85rem] font-semibold disabled:opacity-50"
        >
          {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Rules
        </button>
      </div>

      {/* Weekly schedule */}
      <div className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-[var(--orange-500)]" />
          <h3 className="font-bold text-[0.95rem]">Weekly Schedule</h3>
        </div>
        <p className="text-[0.82rem] text-[var(--text-muted)] mb-4">
          Set which days and hours you&apos;re available each week. Customers will only be able to book inside these windows.
        </p>

        <div className="space-y-3">
          {days.map((d, idx) => (
            <div key={idx} className="border border-[var(--cream-300)] rounded-[12px] p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox" checked={d.enabled}
                      onChange={() => toggleDay(idx)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[var(--cream-300)] peer-checked:bg-[var(--green-ok)] rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                  <span className="font-semibold text-[0.9rem] w-12">{WEEKDAYS[idx]}</span>
                  {!d.enabled && <span className="text-[0.78rem] text-[var(--text-muted)]">Closed</span>}
                </div>
                {d.dirty && (
                  <button
                    onClick={() => saveDay(idx)} disabled={d.saving}
                    className="text-[0.78rem] font-semibold text-[var(--orange-500)] inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {d.saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                )}
              </div>

              {d.enabled && (
                <div className="space-y-2 pl-12">
                  {d.windows.map((w, wIdx) => (
                    <div key={wIdx} className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <input
                        type="time" value={w.start}
                        onChange={(e) => updateWindow(idx, wIdx, { start: e.target.value })}
                        className="px-2 py-1 rounded-[8px] border border-[var(--cream-300)] text-[0.85rem]"
                      />
                      <span className="text-[0.82rem] text-[var(--text-muted)]">to</span>
                      <input
                        type="time" value={w.end}
                        onChange={(e) => updateWindow(idx, wIdx, { end: e.target.value })}
                        className="px-2 py-1 rounded-[8px] border border-[var(--cream-300)] text-[0.85rem]"
                      />
                      <button
                        onClick={() => removeWindow(idx, wIdx)}
                        className="ml-1 text-[var(--text-muted)] hover:text-red-500"
                        title="Remove window"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addWindow(idx)}
                    className="text-[0.78rem] text-[var(--orange-500)] font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add window
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overrides */}
      <div className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <CalendarOff className="w-4 h-4 text-[var(--orange-500)]" />
          <h3 className="font-bold text-[0.95rem]">Date Overrides</h3>
        </div>
        <p className="text-[0.82rem] text-[var(--text-muted)] mb-4">
          Block specific dates (festivals, vacations) or set custom hours for one date.
        </p>

        {/* Existing overrides */}
        {overrides.length > 0 && (
          <div className="space-y-2 mb-5">
            {overrides.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between bg-[var(--cream-100)] rounded-[10px] px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[0.85rem]">{o.date}</div>
                  <div className="text-[0.78rem] text-[var(--text-muted)] truncate">
                    {o.closed
                      ? "Closed"
                      : o.windows.map((w) => `${w.start}–${w.end}`).join(", ")}
                    {o.note ? ` · ${o.note}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => deleteOverride(o.id)}
                  className="ml-2 p-1.5 rounded-full hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New override form */}
        <div className="border-t border-[var(--cream-300)] pt-4 space-y-3">
          <div className="text-[0.85rem] font-semibold">Add override</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[0.78rem] font-semibold mb-1 block">Date</label>
              <input
                type="date" value={ovDate} min={todayYmd()}
                onChange={(e) => setOvDate(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] border border-[var(--cream-300)] text-[0.88rem]"
              />
            </div>
            <div>
              <label className="text-[0.78rem] font-semibold mb-1 block">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOvClosed(true)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-[10px] text-[0.85rem] font-semibold border transition-all",
                    ovClosed
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-white text-[var(--text-muted)] border-[var(--cream-300)]",
                  )}
                >
                  Closed
                </button>
                <button
                  onClick={() => setOvClosed(false)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-[10px] text-[0.85rem] font-semibold border transition-all",
                    !ovClosed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-[var(--text-muted)] border-[var(--cream-300)]",
                  )}
                >
                  Custom hours
                </button>
              </div>
            </div>
          </div>

          {!ovClosed && (
            <div className="space-y-2">
              {ovWindows.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  <input
                    type="time" value={w.start}
                    onChange={(e) => updateOvWindow(i, { start: e.target.value })}
                    className="px-2 py-1 rounded-[8px] border border-[var(--cream-300)] text-[0.85rem]"
                  />
                  <span className="text-[0.82rem] text-[var(--text-muted)]">to</span>
                  <input
                    type="time" value={w.end}
                    onChange={(e) => updateOvWindow(i, { end: e.target.value })}
                    className="px-2 py-1 rounded-[8px] border border-[var(--cream-300)] text-[0.85rem]"
                  />
                  <button
                    onClick={() => removeOvWindow(i)}
                    className="ml-1 text-[var(--text-muted)] hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addOvWindow}
                className="text-[0.78rem] text-[var(--orange-500)] font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add window
              </button>
            </div>
          )}

          <div>
            <label className="text-[0.78rem] font-semibold mb-1 block">Note (optional)</label>
            <input
              type="text" value={ovNote} maxLength={120}
              onChange={(e) => setOvNote(e.target.value)}
              placeholder="e.g. Diwali holiday"
              className="w-full px-3 py-2 rounded-[10px] border border-[var(--cream-300)] text-[0.88rem]"
            />
          </div>

          <button
            onClick={submitOverride} disabled={savingOv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--orange-500)] text-white text-[0.85rem] font-semibold disabled:opacity-50"
          >
            {savingOv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Override
          </button>
        </div>
      </div>
    </div>
  );
}
