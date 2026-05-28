"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
} from "lucide-react";
import { usersApi } from "@/lib/api";

/**
 * Settings → Notifications (Round 4)
 *
 * Three independent toggles backed by `users.{push,email,sms}_enabled`.
 *
 * UX choices:
 *   • In-app notifications are NOT shown — they can't be disabled
 *     (the user has to be able to see their booking timeline).
 *   • Each toggle saves on flip with optimistic UI; on error we revert
 *     and show a toast.
 *   • Save bursts are debounced lightly (200ms) so flipping two
 *     toggles quickly only fires one PATCH.
 */

type Prefs = {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
};

type ChannelKey = keyof Prefs;

export default function NotificationSettingsPanel({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Per-toggle pending writes (so we don't lose intent if the user
  // flips a second toggle while the first PATCH is in flight).
  const pendingPatchRef = useRef<Partial<Prefs>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load ───────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await usersApi.getNotificationPreferences();
        const body = (res.data as any)?.data ?? res.data;
        if (active) {
          setPrefs({
            push_enabled: body?.push_enabled ?? true,
            email_enabled: body?.email_enabled ?? true,
            sms_enabled: body?.sms_enabled ?? true,
          });
        }
      } catch (err: any) {
        if (active)
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Could not load notification settings.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Auto-clear the "saved" pulse so it doesn't sit forever.
  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 1500);
    return () => clearTimeout(t);
  }, [savedFlash]);

  // ─── Toggle handler ─────────────────────────────────
  const flip = (key: ChannelKey) => {
    if (!prefs || saving) return;

    // Optimistic UI: flip immediately, queue the patch, debounce.
    const next = !prefs[key];
    setPrefs((p) => (p ? { ...p, [key]: next } : p));
    pendingPatchRef.current = { ...pendingPatchRef.current, [key]: next };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const patch = pendingPatchRef.current;
      pendingPatchRef.current = {};
      setSaving(true);
      setError(null);
      try {
        const res = await usersApi.updateNotificationPreferences(patch);
        const body = (res.data as any)?.data ?? res.data;
        // Reconcile with server-truth so the UI never drifts.
        if (
          typeof body?.push_enabled === "boolean" ||
          typeof body?.email_enabled === "boolean" ||
          typeof body?.sms_enabled === "boolean"
        ) {
          setPrefs((p) =>
            p
              ? {
                  push_enabled: body?.push_enabled ?? p.push_enabled,
                  email_enabled: body?.email_enabled ?? p.email_enabled,
                  sms_enabled: body?.sms_enabled ?? p.sms_enabled,
                }
              : p,
          );
        }
        setSavedFlash(true);
      } catch (err: any) {
        // Revert the optimistic flip(s).
        setPrefs((p) =>
          p
            ? {
                ...p,
                ...Object.fromEntries(
                  Object.entries(patch).map(([k, v]) => [k, !v]),
                ),
              }
            : p,
        );
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Could not save your preferences. Please try again.",
        );
      } finally {
        setSaving(false);
      }
    }, 200);
  };

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-[20px] p-6 md:p-8 border border-[rgba(212,114,26,0.06)]">
        <div className="flex items-center gap-3 mb-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-[8px] hover:bg-[var(--cream-100)] text-[var(--text-muted)]"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="font-display text-[1.4rem] font-[900] text-[var(--brown-800)]">
            Notifications
          </div>
        </div>
        <p className="text-[0.85rem] text-[var(--text-muted)] mt-1 mb-5">
          Choose which channels we use to reach you. In-app notifications stay
          on so you don&apos;t miss booking updates.
        </p>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 mb-4 rounded-[10px] bg-red-50 border border-red-200 text-red-800 text-[0.82rem]">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading || !prefs ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading…
          </div>
        ) : (
          <div className="space-y-2">
            <ChannelRow
              icon={<Bell className="w-5 h-5" />}
              title="Push notifications"
              desc="Order updates and chef messages on your phone."
              checked={prefs.push_enabled}
              onChange={() => flip("push_enabled")}
            />
            <ChannelRow
              icon={<Mail className="w-5 h-5" />}
              title="Email"
              desc="Booking confirmations, payment receipts, important updates."
              checked={prefs.email_enabled}
              onChange={() => flip("email_enabled")}
            />
            <ChannelRow
              icon={<MessageSquare className="w-5 h-5" />}
              title="SMS"
              desc="Critical alerts only — chef arrival, payment, cancellation."
              checked={prefs.sms_enabled}
              onChange={() => flip("sms_enabled")}
            />
          </div>
        )}

        {/* Save indicator — small, non-blocking */}
        <div className="mt-4 h-5 flex items-center text-[0.78rem] text-[var(--text-muted)]">
          {saving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
            </span>
          ) : savedFlash ? (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChannelRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center gap-3 p-3.5 rounded-[12px] border bg-white border-[rgba(212,114,26,0.08)] hover:bg-[var(--cream-100)] cursor-pointer transition-all text-left"
    >
      <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,114,26,0.08)] flex items-center justify-center text-[var(--orange-500)] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[0.9rem] text-[var(--brown-800)]">
          {title}
        </div>
        <div className="text-[0.78rem] text-[var(--text-muted)]">{desc}</div>
      </div>
      <ToggleSwitch checked={checked} />
    </button>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked
          ? "bg-[var(--orange-500)] border-[var(--orange-500)]"
          : "bg-gray-200 border-gray-200"
      }`}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}
