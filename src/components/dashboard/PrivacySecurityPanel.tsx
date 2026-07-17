"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react";
import { authApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

/**
 * Settings → Privacy & security
 *
 * Two things live here:
 *   1. Change password — wired to POST /auth/change-password. Requires
 *      the current password + a new one (min 8, letter + digit, matches
 *      the backend ChangePasswordDto rules so we fail fast client-side).
 *   2. Delete account — a "danger zone" that calls DELETE /users/me. The
 *      backend soft-deletes + anonymises the row (bookings/payments stay
 *      intact) and blocks the delete while any booking is still live.
 *      We require a typed "DELETE" confirmation and the current password
 *      (blank is allowed for Google sign-in accounts, which have none).
 *      On success we log the user out.
 */
export default function PrivacySecurityPanel({
  onBack,
}: {
  onBack?: () => void;
}) {
  const { logout } = useAuthStore();

  // ─── Change password state ──────────────────────────
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  // ─── Delete account state ───────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delConfirmText, setDelConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const passwordRuleOk = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(next);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (!current) return setPwError("Enter your current password.");
    if (!passwordRuleOk)
      return setPwError(
        "New password must be at least 8 characters and include a letter and a digit.",
      );
    if (next !== confirm) return setPwError("New passwords don’t match.");
    if (next === current)
      return setPwError("New password must be different from the current one.");

    setPwSaving(true);
    try {
      await authApi.changePassword({
        current_password: current,
        new_password: next,
      });
      setPwSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setPwError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not change your password. Please try again.",
      );
    } finally {
      setPwSaving(false);
    }
  };

  const submitDelete = async () => {
    setDelError(null);
    if (delConfirmText.trim().toUpperCase() !== "DELETE")
      return setDelError('Please type "DELETE" to confirm.');

    setDeleting(true);
    try {
      // current_password is verified for password accounts; confirm:true
      // covers Google sign-in accounts that have no password on file.
      await usersApi.deleteAccount({
        current_password: delPassword.trim() || undefined,
        confirm: true,
      });
      // Account gone → sign out and bounce to /login.
      logout();
    } catch (err: any) {
      setDelError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not delete your account. Please try again.",
      );
      setDeleting(false);
    }
  };

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
            Privacy &amp; security
          </div>
        </div>
        <p className="text-[0.85rem] text-[var(--text-muted)] mt-1 mb-6">
          Update your password or delete your account.
        </p>

        {/* ─── Change password ─────────────────────────── */}
        <div className="flex items-center gap-2 mb-3 text-[var(--brown-800)]">
          <Lock className="w-4 h-4 text-[var(--orange-500)]" />
          <h3 className="font-semibold text-[0.95rem]">Change password</h3>
        </div>

        <form onSubmit={submitPassword} className="space-y-3">
          <PasswordField
            label="Current password"
            value={current}
            onChange={setCurrent}
            show={showPw}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={next}
            onChange={setNext}
            show={showPw}
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a digit."
          />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            show={showPw}
            autoComplete="new-password"
          />

          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="flex items-center gap-1.5 text-[0.78rem] text-[var(--text-muted)] hover:text-[var(--brown-800)]"
          >
            {showPw ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {showPw ? "Hide passwords" : "Show passwords"}
          </button>

          {pwError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-red-50 border border-red-200 text-red-800 text-[0.82rem]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}
          {pwSaved && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-[0.82rem]">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Password updated.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[var(--orange-500)] text-white font-semibold text-[0.88rem] hover:opacity-90 disabled:opacity-60 transition"
          >
            {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </form>

        {/* ─── Danger zone ─────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-[rgba(212,114,26,0.1)]">
          <div className="flex items-center gap-2 mb-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="font-semibold text-[0.95rem]">Delete account</h3>
          </div>
          <p className="text-[0.82rem] text-[var(--text-muted)] mb-3">
            Permanently deletes your profile and personal details. Past
            bookings and payment records are retained for legal reasons but no
            longer linked to you. You can&apos;t undo this.
          </p>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] border border-red-300 text-red-700 font-semibold text-[0.88rem] hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              Delete my account
            </button>
          ) : (
            <div className="rounded-[14px] border border-red-200 bg-red-50/60 p-4 space-y-3">
              <PasswordField
                label="Current password"
                value={delPassword}
                onChange={setDelPassword}
                show={false}
                autoComplete="current-password"
                hint="Leave blank if you signed up with Google."
              />
              <div>
                <label className="block text-[0.8rem] font-medium text-[var(--brown-800)] mb-1">
                  Type <span className="font-bold">DELETE</span> to confirm
                </label>
                <input
                  value={delConfirmText}
                  onChange={(e) => setDelConfirmText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] border border-red-200 bg-white text-[0.88rem] outline-none focus:border-red-400"
                  placeholder="DELETE"
                />
              </div>

              {delError && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-red-100 border border-red-300 text-red-800 text-[0.82rem]">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{delError}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={submitDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-red-600 text-white font-semibold text-[0.88rem] hover:bg-red-700 disabled:opacity-60 transition"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
                <button
                  onClick={() => {
                    setShowDelete(false);
                    setDelError(null);
                    setDelPassword("");
                    setDelConfirmText("");
                  }}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-[12px] border border-gray-300 text-[var(--brown-800)] font-semibold text-[0.88rem] hover:bg-white disabled:opacity-60 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[0.8rem] font-medium text-[var(--brown-800)] mb-1">
        {label}
      </label>
      <input
        type={show ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(212,114,26,0.15)] bg-white text-[0.88rem] outline-none focus:border-[var(--orange-500)]"
      />
      {hint && (
        <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">{hint}</p>
      )}
    </div>
  );
}
