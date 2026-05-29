"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN ACCOUNT PANEL — change password (logged-in self-service)
   ═══════════════════════════════════════════════════════════════════════════
   Calls POST /auth/change-password (cookoncall-backend PR #28). The form
   re-verifies the current password server-side via bcrypt, hashes the new
   one, and clears refresh_token on the user row to invalidate other
   sessions.

   Uses the admin's bearer token (passed in via authHeader from the parent's
   ah() helper) — NOT the global `coc_token` cookie that the regular axios
   request interceptor would attach. The admin panel stores its token in
   coc_admin_token, and the global interceptor only reads coc_token, so it
   leaves our explicit Authorization header alone.

   For the "I forgot my password entirely" case, link out to /login which
   already has the email-OTP-gated forgot-password flow that works for
   admin accounts (admins are users with email + bcrypt password rows).

   Extracted from src/app/(dashboard)/dashboard/admin/page.tsx as part of
   the Vitest setup (test/web-vitest-setup-...) so the component can be
   tested in isolation. No logic or styling changes vs. the inline original.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";

export interface AdminAccountPanelProps {
  adminName: string;
  authHeader: { headers: { Authorization: string } };
}

export default function AdminAccountPanel({
  adminName,
  authHeader,
}: AdminAccountPanelProps) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Match the backend complexity rules from RegisterDto / ChangePasswordDto:
  // min 8 chars, must contain at least one letter and one digit.
  function clientValidate(): string | null {
    if (!currentPw) return "Enter your current password.";
    if (!newPw) return "Enter a new password.";
    if (newPw.length < 8) return "New password must be at least 8 characters.";
    if (newPw.length > 128) return "New password is too long (max 128).";
    if (!/[A-Za-z]/.test(newPw) || !/\d/.test(newPw)) {
      return "New password must contain at least one letter and one digit.";
    }
    if (newPw === currentPw) return "New password must differ from current.";
    if (newPw !== confirmPw) return "New password and confirmation don't match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const clientErr = clientValidate();
    if (clientErr) {
      setError(clientErr);
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        "/auth/change-password",
        { current_password: currentPw, new_password: newPw },
        authHeader,
      );
      setSuccess(
        "Password changed successfully. Other sessions have been signed out.",
      );
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      // Surface the backend's BadRequest / Unauthorized message
      // verbatim — it's already user-friendly. Falls back to a
      // generic message on network / unexpected errors.
      const apiMsg =
        err?.response?.data?.message ?? err?.response?.data?.error ?? null;
      setError(
        Array.isArray(apiMsg)
          ? apiMsg[0]
          : typeof apiMsg === "string"
            ? apiMsg
            : "Could not change password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Cheap visual strength meter — not load-bearing security, just UX.
  // Kept local so the dark admin theme stays self-contained without
  // pulling in @/components/ui/PasswordStrength (which is styled for
  // the light customer/cook panels).
  function strengthScore(pw: string): {
    label: string;
    pct: number;
    color: string;
  } {
    if (!pw) return { label: "", pct: 0, color: "transparent" };
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return { label: "Very weak", pct: 20, color: "#ef4444" };
    if (s === 2) return { label: "Weak", pct: 40, color: "#f59e0b" };
    if (s === 3) return { label: "Fair", pct: 60, color: "#eab308" };
    if (s === 4) return { label: "Good", pct: 80, color: "#3b82f6" };
    return { label: "Strong", pct: 100, color: "#22c55e" };
  }

  const meter = strengthScore(newPw);

  return (
    <div className="max-w-[560px]">
      {/* Identity card */}
      <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[14px] p-5 mb-6">
        <div
          className="text-[rgba(255,255,255,0.4)] text-[0.78rem] uppercase tracking-wider mb-2"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Signed in as
        </div>
        <div
          className="text-white font-bold text-[1rem]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {adminName || "Admin"}
        </div>
      </div>

      {/* Change password */}
      <form
        onSubmit={handleSubmit}
        className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[14px] p-5"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <h3 className="text-white text-[1.05rem] font-bold mb-1">
          Change password
        </h3>
        <p className="text-[rgba(255,255,255,0.5)] text-[0.85rem] mb-5">
          You&apos;ll need your current password. Other devices will be signed
          out after the change.
        </p>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-[10px] px-3 py-2.5 mb-3 text-red-300 text-[0.85rem]"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-[10px] px-3 py-2.5 mb-3 text-emerald-300 text-[0.85rem]"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Current password */}
        <label className="block text-[0.8rem] text-[rgba(255,255,255,0.6)] mb-1.5">
          Current password
        </label>
        <div className="relative mb-3">
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            disabled={submitting}
            autoComplete="current-password"
            className="w-full px-3.5 py-3 pr-10 bg-[rgba(255,255,255,0.06)] border-[1.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] text-white text-[0.9rem] outline-none placeholder:text-[rgba(255,255,255,0.25)] focus:border-[var(--orange-500)] disabled:opacity-50"
            placeholder="Your current password"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)] hover:text-white bg-transparent border-none cursor-pointer p-1.5"
            aria-label={
              showCurrent ? "Hide current password" : "Show current password"
            }
          >
            {showCurrent ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* New password */}
        <label className="block text-[0.8rem] text-[rgba(255,255,255,0.6)] mb-1.5">
          New password
        </label>
        <div className="relative mb-2">
          <input
            type={showNew ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            disabled={submitting}
            autoComplete="new-password"
            className="w-full px-3.5 py-3 pr-10 bg-[rgba(255,255,255,0.06)] border-[1.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] text-white text-[0.9rem] outline-none placeholder:text-[rgba(255,255,255,0.25)] focus:border-[var(--orange-500)] disabled:opacity-50"
            placeholder="At least 8 chars, a letter and a digit"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.4)] hover:text-white bg-transparent border-none cursor-pointer p-1.5"
            aria-label={showNew ? "Hide new password" : "Show new password"}
          >
            {showNew ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Strength meter */}
        {newPw && (
          <div className="mb-3">
            <div className="h-1 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${meter.pct}%`,
                  backgroundColor: meter.color,
                }}
              />
            </div>
            <div className="text-[0.72rem] mt-1" style={{ color: meter.color }}>
              {meter.label}
            </div>
          </div>
        )}

        {/* Confirm new password */}
        <label className="block text-[0.8rem] text-[rgba(255,255,255,0.6)] mb-1.5">
          Confirm new password
        </label>
        <input
          type={showNew ? "text" : "password"}
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          disabled={submitting}
          autoComplete="new-password"
          className="w-full px-3.5 py-3 bg-[rgba(255,255,255,0.06)] border-[1.5px] border-[rgba(255,255,255,0.1)] rounded-[10px] text-white text-[0.9rem] outline-none placeholder:text-[rgba(255,255,255,0.25)] focus:border-[var(--orange-500)] disabled:opacity-50 mb-4"
          placeholder="Re-enter new password"
        />

        <button
          type="submit"
          disabled={submitting || !currentPw || !newPw || !confirmPw}
          className="w-full py-3 border-none rounded-[10px] bg-[var(--orange-500)] text-white font-bold text-[0.9rem] cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Changing…" : "Change password"}
        </button>
      </form>

      {/* Forgot path — opens the existing public flow on /login */}
      <div className="mt-5 text-center">
        <p
          className="text-[rgba(255,255,255,0.45)] text-[0.82rem] mb-1"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Forgot your password?
        </p>
        <Link
          href="/login"
          className="text-[var(--orange-400)] text-[0.85rem] hover:underline"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Use the email-OTP reset flow on the login page →
        </Link>
      </div>
    </div>
  );
}
