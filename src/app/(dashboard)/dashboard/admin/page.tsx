"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import api, { authApi } from "@/lib/api";
import {
  LayoutGrid, Users, ChefHat, FileText, LogOut, Menu, Search,
  Shield, ShieldX, UserCheck, BadgeCheck,
  AlertCircle, Loader2, RefreshCw, Ban, Trash2, Pencil, X, Save,
  Eye, ExternalLink, CheckCircle2, XCircle, Phone, MapPin, CreditCard, Landmark,
} from "lucide-react";

/* ═══ TYPES ═══ */

type AdminPanel = "overview" | "users" | "cooks" | "bookings" | "areas";
type CookFilter = "all" | "verified" | "pending_review" | "unverified";

interface AdminStatsData {
  total_users: number; total_cooks: number; verified_cooks: number;
  pending_cooks: number; total_bookings: number; completed_bookings: number;
  active_bookings: number; total_revenue: number;
}

interface AdminUser {
  id: string; name: string; email: string; phone: string;
  role: string; is_active: boolean; created_at: string;
}

interface AdminCook {
  id: string; user_id: string; bio: string; cuisines: string[];
  price_per_session: string; rating: string; total_bookings: number;
  is_available: boolean; is_verified: boolean; created_at: string;
  // verification fields
  verification_status?: "not_submitted" | "pending" | "approved" | "rejected";
  verification_rejection_reason?: string | null;
  verified_at?: string | null;
  aadhaar_url?: string | null;
  pan_url?: string | null;
  address_proof_url?: string | null;
  fssai_url?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_account_holder?: string | null;
  city?: string | null;
  pincode?: string | null;
  user: { id: string; name: string; email: string; phone: string; role: string; is_active: boolean; created_at: string };
}

interface AdminBooking {
  id: string; type: string; status: string; scheduled_at: string;
  total_price: string; created_at: string; booking_type?: string;
  user?: { name: string; email: string };
  cook?: { user?: { name: string } };
}

interface Pagination { page: number; limit: number; total: number; total_pages: number; }

/* ═══ SIDEBAR ═══ */

const sidebarLinks: { id: AdminPanel; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutGrid className="w-5 h-5" /> },
  { id: "users", label: "Users", icon: <Users className="w-5 h-5" /> },
  { id: "cooks", label: "Cooks", icon: <ChefHat className="w-5 h-5" /> },
  { id: "bookings", label: "Bookings", icon: <FileText className="w-5 h-5" /> },
  { id: "areas", label: "Areas", icon: <MapPin className="w-5 h-5" /> },
];

/* ═══ HELPERS ═══ */

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtCurrency(val: number | string) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? "₹0" : "₹" + n.toLocaleString("en-IN");
}

function statusBadge(status: string) {
  const c: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400", confirmed: "bg-blue-500/15 text-blue-400",
    in_progress: "bg-purple-500/15 text-purple-400", completed: "bg-green-500/15 text-green-400",
    cancelled_by_user: "bg-red-500/15 text-red-400", cancelled_by_cook: "bg-red-500/15 text-red-400",
    expired: "bg-gray-500/15 text-gray-400",
    PENDING: "bg-yellow-500/15 text-yellow-400", CONFIRMED: "bg-blue-500/15 text-blue-400",
    IN_PROGRESS: "bg-purple-500/15 text-purple-400", COMPLETED: "bg-green-500/15 text-green-400",
    CANCELLED_BY_USER: "bg-red-500/15 text-red-400", CANCELLED_BY_COOK: "bg-red-500/15 text-red-400",
    EXPIRED: "bg-gray-500/15 text-gray-400",
  };
  return <span className={cn("px-2.5 py-1 rounded-full text-[0.72rem] font-semibold uppercase tracking-wide", c[status] || "bg-gray-500/15 text-gray-400")}>{status.replace(/_/g, " ")}</span>;
}

function roleBadge(role: string) {
  const c = role === "admin" ? "bg-purple-500/15 text-purple-400" : role === "cook" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400";
  return <span className={cn("px-2 py-0.5 rounded-full text-[0.72rem] font-semibold", c)}>{role}</span>;
}

/* ═══ CONFIRM DIALOG ═══ */

function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-5" onClick={onCancel}>
      <div className="bg-[#1A120D] border border-[rgba(255,255,255,0.1)] rounded-[16px] p-6 max-w-[400px] w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold text-[1.05rem] mb-2">{title}</h3>
        <p className="text-[rgba(255,255,255,0.5)] text-[0.88rem] mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.6)] text-[0.85rem] font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
            style={{ fontFamily: "var(--font-body)" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2.5 bg-red-500/20 border border-red-500/30 rounded-[10px] text-red-400 text-[0.85rem] font-semibold cursor-pointer hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
            style={{ fontFamily: "var(--font-body)" }}>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ EDIT USER MODAL ═══ */

function EditUserModal({ open, user, onSave, onCancel, loading }: {
  open: boolean; user: AdminUser | null;
  onSave: (data: { name: string; email: string; phone: string; role: string }) => void;
  onCancel: () => void; loading?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setRole(user.role || "user");
    }
  }, [user]);

  if (!open || !user) return null;

  const inputCls = "w-full px-4 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-white text-[0.9rem] outline-none placeholder:text-[rgba(255,255,255,0.3)] focus:border-[var(--orange-500)]";

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-5" onClick={onCancel}>
      <div className="bg-[#1A120D] border border-[rgba(255,255,255,0.1)] rounded-[16px] p-6 max-w-[450px] w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-[1.05rem]">Edit User</h3>
          <button onClick={onCancel} className="text-[rgba(255,255,255,0.3)] hover:text-white bg-transparent border-none cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[0.75rem] text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wider font-semibold">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={{ fontFamily: "var(--font-body)" }} />
          </div>
          <div>
            <label className="block text-[0.75rem] text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wider font-semibold">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={{ fontFamily: "var(--font-body)" }} />
          </div>
          <div>
            <label className="block text-[0.75rem] text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wider font-semibold">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} style={{ fontFamily: "var(--font-body)" }} />
          </div>
          <div>
            <label className="block text-[0.75rem] text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wider font-semibold">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className={cn(inputCls, "appearance-none cursor-pointer")} style={{ fontFamily: "var(--font-body)" }}>
              <option value="user">User</option>
              <option value="cook">Cook</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.6)] text-[0.85rem] font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
            style={{ fontFamily: "var(--font-body)" }}>Cancel</button>
          <button onClick={() => onSave({ name, email, phone, role })} disabled={loading}
            className="px-4 py-2.5 bg-[var(--orange-500)] rounded-[10px] text-white text-[0.85rem] font-semibold cursor-pointer hover:bg-[var(--orange-400)] transition-all disabled:opacity-50 flex items-center gap-2 border-none"
            style={{ fontFamily: "var(--font-body)" }}>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Save className="w-3.5 h-3.5" />
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ VERIFICATION STATUS BADGE ═══ */

function verificationStatusBadge(status?: string) {
  const s = (status || "not_submitted").toLowerCase();
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    not_submitted: { label: "Not Submitted", cls: "bg-gray-500/15 text-gray-400", icon: <AlertCircle className="w-3 h-3" /> },
    pending: { label: "Pending Review", cls: "bg-yellow-500/15 text-yellow-400", icon: <AlertCircle className="w-3 h-3" /> },
    approved: { label: "Approved", cls: "bg-green-500/15 text-green-400", icon: <BadgeCheck className="w-3 h-3" /> },
    rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400", icon: <XCircle className="w-3 h-3" /> },
  };
  const m = map[s] || map.not_submitted;
  return (
    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-semibold w-fit", m.cls)}>
      {m.icon}{m.label}
    </span>
  );
}

/* ═══ DOCUMENT PREVIEW ═══ */

function DocPreview({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return (
      <div className="flex-1 min-w-[140px]">
        <div className="text-[0.72rem] text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wider font-semibold">{label}</div>
        <div className="aspect-[4/3] bg-[rgba(255,255,255,0.03)] border border-dashed border-[rgba(255,255,255,0.1)] rounded-[10px] flex items-center justify-center text-[rgba(255,255,255,0.3)] text-[0.78rem]" style={{ fontFamily: "var(--font-body)" }}>
          Not uploaded
        </div>
      </div>
    );
  }
  const isPdf = /\.pdf($|\?)/i.test(url);
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="text-[0.72rem] text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wider font-semibold flex items-center justify-between">
        <span>{label}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--orange-400)] hover:text-[var(--orange-500)] flex items-center gap-1 normal-case tracking-normal text-[0.7rem]">
          Open <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[10px] overflow-hidden hover:border-[var(--orange-500)] transition-all">
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[rgba(255,255,255,0.5)]">
            <FileText className="w-8 h-8" />
            <span className="text-[0.78rem]" style={{ fontFamily: "var(--font-body)" }}>View PDF</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="w-full h-full object-cover" loading="lazy" />
        )}
      </a>
    </div>
  );
}

/* ═══ REVIEW CHEF MODAL ═══ */

function ReviewChefModal({
  open, cook, onApprove, onReject, onCancel, loading,
}: {
  open: boolean; cook: AdminCook | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [mode, setMode] = useState<"view" | "reject" | "approve">("view");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) { setMode("view"); setReason(""); }
  }, [open, cook?.id]);

  if (!open || !cook) return null;

  const reasonTrimmed = reason.trim();
  const reasonValid = reasonTrimmed.length >= 10;

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 overflow-y-auto" onClick={onCancel}>
      <div
        className="bg-[#1A120D] border border-[rgba(255,255,255,0.1)] rounded-[16px] w-full max-w-[780px] my-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A120D] border-b border-[rgba(255,255,255,0.08)] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-white font-bold text-[1.1rem]">Review Chef Application</h3>
            <p className="text-[rgba(255,255,255,0.45)] text-[0.82rem] mt-0.5">{cook.user?.name || "—"} · {cook.user?.email || "—"}</p>
          </div>
          <button onClick={onCancel} disabled={loading} className="text-[rgba(255,255,255,0.4)] hover:text-white bg-transparent border-none cursor-pointer disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[0.78rem] text-[rgba(255,255,255,0.4)]" style={{ fontFamily: "var(--font-body)" }}>Current status:</span>
            {verificationStatusBadge(cook.verification_status)}
            {cook.verified_at && (
              <span className="text-[0.74rem] text-[rgba(255,255,255,0.35)]">verified {new Date(cook.verified_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            )}
          </div>

          {/* Existing rejection reason */}
          {cook.verification_status === "rejected" && cook.verification_rejection_reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-[10px] px-4 py-3">
              <div className="text-[0.72rem] text-red-400 uppercase tracking-wider font-semibold mb-1">Previously rejected for</div>
              <div className="text-[0.86rem] text-[rgba(255,255,255,0.8)]" style={{ fontFamily: "var(--font-body)" }}>{cook.verification_rejection_reason}</div>
            </div>
          )}

          {/* Personal / Contact info */}
          <div>
            <div className="text-[0.75rem] text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-semibold mb-2">Personal Info</div>
            <div className="grid grid-cols-2 gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-4">
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={cook.user?.phone || "—"} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="City" value={cook.city ? `${cook.city}${cook.pincode ? ` · ${cook.pincode}` : ""}` : "—"} />
              {/* Batch B2: "Price / session" row removed. Flat ₹49 visit fee model — no per-chef rate. */}
              <InfoRow label="Cuisines" value={(cook.cuisines || []).join(", ") || "—"} />
            </div>
          </div>

          {/* Bio */}
          {cook.bio && (
            <div>
              <div className="text-[0.75rem] text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-semibold mb-2">Bio</div>
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-4 text-[0.88rem] text-[rgba(255,255,255,0.8)] leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                {cook.bio}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div>
            <div className="text-[0.75rem] text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-semibold mb-2">Emergency Contact</div>
            <div className="grid grid-cols-2 gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-4">
              <InfoRow label="Name" value={cook.emergency_contact_name || "—"} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={cook.emergency_contact_phone || "—"} />
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <div className="text-[0.75rem] text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-semibold mb-2">Bank Details</div>
            <div className="grid grid-cols-2 gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-4">
              <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Account Holder" value={cook.bank_account_holder || "—"} />
              <InfoRow icon={<Landmark className="w-3.5 h-3.5" />} label="IFSC" value={cook.bank_ifsc || "—"} />
              <InfoRow label="Account Number" value={cook.bank_account_number ? maskAccount(cook.bank_account_number) : "—"} full />
            </div>
          </div>

          {/* Documents */}
          <div>
            <div className="text-[0.75rem] text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-semibold mb-2">Documents</div>
            <div className="flex flex-wrap gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-4">
              <DocPreview label="Aadhaar" url={cook.aadhaar_url} />
              <DocPreview label="PAN" url={cook.pan_url} />
              <DocPreview label="Address Proof" url={cook.address_proof_url} />
              <DocPreview label="FSSAI" url={cook.fssai_url} />
            </div>
            <p className="text-[0.72rem] text-[rgba(255,255,255,0.35)] mt-2" style={{ fontFamily: "var(--font-body)" }}>
              Tap any document to view full-size. Verify name matches, document is valid and not expired.
            </p>
          </div>

          {/* REJECT MODE */}
          {mode === "reject" && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-[12px] p-4 space-y-3">
              <div>
                <label className="block text-[0.75rem] text-red-400 mb-1.5 uppercase tracking-wider font-semibold">Rejection Reason (required, min 10 chars)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Aadhaar image is blurry — please re-upload a clearer photo where all four corners are visible."
                  className="w-full px-4 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-white text-[0.9rem] outline-none placeholder:text-[rgba(255,255,255,0.3)] focus:border-red-500 resize-none"
                  style={{ fontFamily: "var(--font-body)" }}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className={cn("text-[0.72rem]", reasonValid ? "text-green-400" : "text-[rgba(255,255,255,0.3)]")}>
                    {reasonTrimmed.length}/10 minimum characters
                  </span>
                </div>
              </div>
              <p className="text-[0.76rem] text-[rgba(255,255,255,0.5)]" style={{ fontFamily: "var(--font-body)" }}>
                The chef will be notified via email and in-app with this exact reason. Be specific and constructive.
              </p>
            </div>
          )}

          {/* APPROVE CONFIRM */}
          {mode === "approve" && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-[12px] p-4">
              <p className="text-white text-[0.92rem] font-semibold mb-1">Approve this chef?</p>
              <p className="text-[rgba(255,255,255,0.6)] text-[0.84rem]" style={{ fontFamily: "var(--font-body)" }}>
                {cook.user?.name} will become publicly visible on the platform and start receiving bookings. They&apos;ll be notified immediately.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#1A120D] border-t border-[rgba(255,255,255,0.08)] px-6 py-4 flex items-center justify-end gap-3">
          {mode === "view" && (
            <>
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.6)] text-[0.85rem] font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >Close</button>
              <button
                onClick={() => setMode("reject")}
                disabled={loading}
                className="px-4 py-2.5 bg-red-500/15 border border-red-500/25 rounded-[10px] text-red-400 text-[0.85rem] font-semibold cursor-pointer hover:bg-red-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <XCircle className="w-3.5 h-3.5" />Reject
              </button>
              <button
                onClick={() => setMode("approve")}
                disabled={loading}
                className="px-4 py-2.5 bg-green-500/20 border border-green-500/30 rounded-[10px] text-green-400 text-[0.85rem] font-semibold cursor-pointer hover:bg-green-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />Approve
              </button>
            </>
          )}
          {mode === "reject" && (
            <>
              <button
                onClick={() => { setMode("view"); setReason(""); }}
                disabled={loading}
                className="px-4 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.6)] text-[0.85rem] font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >Back</button>
              <button
                onClick={() => reasonValid && onReject(reasonTrimmed)}
                disabled={loading || !reasonValid}
                className="px-4 py-2.5 bg-red-500/25 border border-red-500/40 rounded-[10px] text-red-400 text-[0.85rem] font-semibold cursor-pointer hover:bg-red-500/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Rejection
              </button>
            </>
          )}
          {mode === "approve" && (
            <>
              <button
                onClick={() => setMode("view")}
                disabled={loading}
                className="px-4 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.6)] text-[0.85rem] font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >Back</button>
              <button
                onClick={onApprove}
                disabled={loading}
                className="px-4 py-2.5 bg-green-500/25 border border-green-500/40 rounded-[10px] text-green-400 text-[0.85rem] font-semibold cursor-pointer hover:bg-green-500/35 transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Approval
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, full }: { icon?: React.ReactNode; label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[0.7rem] text-[rgba(255,255,255,0.35)] uppercase tracking-wider font-semibold mb-0.5 flex items-center gap-1">{icon}{label}</div>
      <div className="text-[0.88rem] text-white break-words" style={{ fontFamily: "var(--font-body)" }}>{value}</div>
    </div>
  );
}

function maskAccount(acc: string) {
  const s = String(acc || "");
  if (s.length <= 4) return s;
  return "••••" + s.slice(-4);
}

/* ═══ MAIN COMPONENT ═══ */

export default function AdminDashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [activePanel, setActivePanel] = useState<AdminPanel>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPag, setUsersPag] = useState<Pagination | null>(null);
  const [cooks, setCooks] = useState<AdminCook[]>([]);
  const [cooksPag, setCooksPag] = useState<Pagination | null>(null);
  const [cookFilter, setCookFilter] = useState<CookFilter>("all");
  const [reviewCook, setReviewCook] = useState<AdminCook | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsPag, setBookingsPag] = useState<Pagination | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // P1.6 — Area requests state
  type AreaRequestRow = {
    id: string;
    name: string;
    city: string;
    status: "pending" | "approved" | "rejected";
    requester_role: "cook" | "customer";
    requester?: { name: string; email: string };
    created_at: string;
    approved_slug?: string | null;
    reject_reason?: string | null;
  };
  const [areaReqs, setAreaReqs] = useState<AreaRequestRow[]>([]);
  const [areaReqsLoading, setAreaReqsLoading] = useState(false);
  const [areaReqStatusFilter, setAreaReqStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  // Approve/reject modal state
  const [approveTarget, setApproveTarget] = useState<AreaRequestRow | null>(null);
  const [approveSlug, setApproveSlug] = useState("");
  const [approveRegion, setApproveRegion] = useState("west");
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AreaRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Modal states
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const t = Cookies.get("coc_admin_token");
    const n = Cookies.get("coc_admin_name");
    if (t && n) { setAdminToken(t); setAdminName(n); setIsLoggedIn(true); }
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const ah = useCallback(() => ({ headers: { Authorization: `Bearer ${adminToken}` } }), [adminToken]);

  async function handleLogin() {
    if (!email || !password) { setLoginError("Please enter both email and password."); return; }
    setLoginLoading(true); setLoginError("");
    try {
      const { data } = await authApi.login({ email, password });
      const res = data.data || data;
      const user = res.user;
      const token = res.access_token || res.accessToken;
      if (user.role !== "admin") { setLoginError("This account does not have admin access."); setLoginLoading(false); return; }
      Cookies.set("coc_admin_token", token, { expires: 2 / 24 });
      Cookies.set("coc_admin_name", user.name, { expires: 2 / 24 });
      setAdminToken(token); setAdminName(user.name); setIsLoggedIn(true);
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || "Invalid credentials");
    } finally { setLoginLoading(false); }
  }

  function handleLogout() {
    Cookies.remove("coc_admin_token"); Cookies.remove("coc_admin_name");
    setIsLoggedIn(false); setAdminToken(""); setAdminName("");
  }

  const fetchOverview = useCallback(async () => {
    if (!adminToken) return; setLoading(true); setError("");
    try {
      const [s, ru, rb] = await Promise.all([
        api.get("/admin/stats", ah()), api.get("/admin/recent-users", ah()), api.get("/admin/recent-bookings", ah()),
      ]);
      setStats(s.data.data || s.data);
      const u = ru.data.data || ru.data; setRecentUsers(Array.isArray(u) ? u : []);
      const b = rb.data.data || rb.data; setRecentBookings(Array.isArray(b) ? b : []);
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to load overview"); }
    finally { setLoading(false); }
  }, [adminToken, ah]);

  const fetchUsers = useCallback(async (page = 1) => {
    if (!adminToken) return; setLoading(true); setError("");
    try {
      const p: any = { page, limit: 20 }; if (userSearch.trim()) p.search = userSearch.trim();
      const { data } = await api.get("/admin/users", { ...ah(), params: p });
      const r = data.data || data; setUsers(r.users || []); setUsersPag(r.pagination || null);
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to load users"); }
    finally { setLoading(false); }
  }, [adminToken, ah, userSearch]);

  const fetchCooks = useCallback(async (page = 1) => {
    if (!adminToken) return; setLoading(true); setError("");
    try {
      const p: any = { page, limit: 20 };
      let url = "/admin/cooks";
      if (cookFilter === "verified") p.verified = "true";
      else if (cookFilter === "unverified") p.verified = "false";
      else if (cookFilter === "pending_review") url = "/admin/cooks/pending";
      const { data } = await api.get(url, { ...ah(), params: p });
      const r = data.data || data; setCooks(r.cooks || []); setCooksPag(r.pagination || null);
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to load cooks"); }
    finally { setLoading(false); }
  }, [adminToken, ah, cookFilter]);

  const fetchBookings = useCallback(async (page = 1) => {
    if (!adminToken) return; setLoading(true); setError("");
    try {
      const p: any = { page, limit: 20 }; if (bookingSearch.trim()) p.search = bookingSearch.trim();
      const { data } = await api.get("/admin/bookings", { ...ah(), params: p });
      const r = data.data || data; setBookings(r.bookings || []); setBookingsPag(r.pagination || null);
    } catch (e: any) { setError(e?.response?.data?.message || "Failed to load bookings"); }
    finally { setLoading(false); }
  }, [adminToken, ah, bookingSearch]);

  // P1.6 — fetch area requests (filterable by status)
  const fetchAreaRequests = useCallback(async () => {
    if (!adminToken) return;
    setAreaReqsLoading(true);
    try {
      const params: any = {};
      if (areaReqStatusFilter !== "all") params.status = areaReqStatusFilter;
      const { data } = await api.get("/areas/admin/requests", { ...ah(), params });
      const list = (data?.data ?? data ?? []) as AreaRequestRow[];
      setAreaReqs(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load area requests");
    } finally {
      setAreaReqsLoading(false);
    }
  }, [adminToken, ah, areaReqStatusFilter]);

  function slugifyForApproval(name: string): string {
    return (name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
  }

  async function handleApproveAreaRequest() {
    if (!approveTarget) return;
    const slug = slugifyForApproval(approveSlug);
    if (!slug) { alert("Slug cannot be empty."); return; }
    setApproveSubmitting(true);
    try {
      await api.patch(`/areas/admin/requests/${approveTarget.id}/approve`, {
        slug,
        region: approveRegion,
      }, ah());
      setApproveTarget(null);
      setApproveSlug("");
      setApproveRegion("west");
      await fetchAreaRequests();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Approval failed");
    } finally {
      setApproveSubmitting(false);
    }
  }

  async function handleRejectAreaRequest() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { alert("Please enter a reason."); return; }
    setRejectSubmitting(true);
    try {
      await api.patch(`/areas/admin/requests/${rejectTarget.id}/reject`, {
        reason: rejectReason.trim(),
      }, ah());
      setRejectTarget(null);
      setRejectReason("");
      await fetchAreaRequests();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Rejection failed");
    } finally {
      setRejectSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn || !adminToken) return;
    if (activePanel === "overview") fetchOverview();
    if (activePanel === "users") fetchUsers();
    if (activePanel === "cooks") fetchCooks();
    if (activePanel === "bookings") fetchBookings();
    if (activePanel === "areas") fetchAreaRequests();
  }, [isLoggedIn, adminToken, activePanel, fetchOverview, fetchUsers, fetchCooks, fetchBookings, fetchAreaRequests]);

  async function handleVerifyCook(cookId: string, verified: boolean) {
    setActionLoading(cookId);
    try { await api.patch(`/admin/cooks/${cookId}/verify`, { verified }, ah()); await fetchCooks(); }
    catch (e: any) { alert(e?.response?.data?.message || "Action failed"); }
    finally { setActionLoading(null); }
  }

  async function handleApproveCook() {
    if (!reviewCook) return;
    setReviewLoading(true);
    try {
      await api.patch(`/admin/cooks/${reviewCook.id}/verify`, { verified: true }, ah());
      setSuccessMsg(`Chef "${reviewCook.user?.name || ""}" approved and notified`);
      setReviewCook(null);
      await fetchCooks();
      // refresh stats too
      api.get("/admin/stats", ah()).then(r => setStats(r.data.data || r.data)).catch(() => {});
    } catch (e: any) {
      alert(e?.response?.data?.message || "Approval failed");
    } finally { setReviewLoading(false); }
  }

  async function handleRejectCook(reason: string) {
    if (!reviewCook) return;
    setReviewLoading(true);
    try {
      await api.patch(`/admin/cooks/${reviewCook.id}/verify`, { verified: false, rejection_reason: reason }, ah());
      setSuccessMsg(`Chef "${reviewCook.user?.name || ""}" rejected and notified`);
      setReviewCook(null);
      await fetchCooks();
      api.get("/admin/stats", ah()).then(r => setStats(r.data.data || r.data)).catch(() => {});
    } catch (e: any) {
      alert(e?.response?.data?.message || "Rejection failed");
    } finally { setReviewLoading(false); }
  }

  async function handleToggleUser(userId: string) {
    setActionLoading(userId);
    try { await api.patch(`/admin/users/${userId}/toggle-active`, {}, ah()); await fetchUsers(); }
    catch (e: any) { alert(e?.response?.data?.message || "Action failed"); }
    finally { setActionLoading(null); }
  }

  // ─── DELETE HANDLER ───────────────────────────────────
  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const { type, id } = deleteConfirm;
      if (type === "user") await api.delete(`/admin/users/${id}`, ah());
      else if (type === "cook") await api.delete(`/admin/cooks/${id}`, ah());
      else if (type === "booking") await api.delete(`/admin/bookings/${id}`, ah());

      setSuccessMsg(`${type.charAt(0).toUpperCase() + type.slice(1)} "${deleteConfirm.name}" deleted successfully`);
      setDeleteConfirm(null);

      // Refresh the current panel
      if (type === "user") await fetchUsers();
      else if (type === "cook") await fetchCooks();
      else if (type === "booking") await fetchBookings();

      // Also refresh stats
      if (activePanel !== "overview") {
        api.get("/admin/stats", ah()).then(r => setStats(r.data.data || r.data)).catch(() => {});
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "Delete failed");
    } finally { setDeleteLoading(false); }
  }

  // ─── EDIT USER HANDLER ────────────────────────────────
  async function handleEditUserSave(data: { name: string; email: string; phone: string; role: string }) {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await api.patch(`/admin/users/${editUser.id}`, data, ah());
      setSuccessMsg(`User "${data.name}" updated successfully`);
      setEditUser(null);
      await fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Update failed");
    } finally { setEditLoading(false); }
  }

  /* ═══ LOGIN SCREEN ═══ */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0C0705] flex items-center justify-center p-5">
        <div className="w-full max-w-[400px] text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="w-8 h-8 text-[var(--orange-500)]" />
            <div className="font-display text-[1.4rem] font-[900] text-[var(--orange-500)]">COOK<span className="text-white">ONCALL</span></div>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Admin Panel</h2>
          <p className="text-[rgba(255,255,255,0.4)] text-[0.9rem] mb-6">Enter your admin email and password.</p>
          {loginError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-[10px] px-4 py-3 mb-4 text-red-400 text-[0.85rem] text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />{loginError}
            </div>
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email"
            className="w-full px-4 py-3.5 bg-[rgba(255,255,255,0.06)] border-[1.5px] border-[rgba(255,255,255,0.1)] rounded-[12px] text-white text-[0.95rem] outline-none mb-3 placeholder:text-[rgba(255,255,255,0.3)] focus:border-[var(--orange-500)]"
            style={{ fontFamily: "var(--font-body)" }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="Password"
            className="w-full px-4 py-3.5 bg-[rgba(255,255,255,0.06)] border-[1.5px] border-[rgba(255,255,255,0.1)] rounded-[12px] text-white text-[0.95rem] outline-none placeholder:text-[rgba(255,255,255,0.3)] focus:border-[var(--orange-500)]"
            style={{ fontFamily: "var(--font-body)" }} />
          <button onClick={handleLogin} disabled={loginLoading}
            className="w-full mt-3.5 py-4 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-base cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontFamily: "var(--font-body)" }}>
            {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loginLoading ? "Logging in..." : "Login to Admin"}
          </button>
          <div className="mt-4">
            <Link href="/" className="text-[rgba(255,255,255,0.3)] text-[0.82rem] no-underline hover:text-[var(--orange-400)]">&larr; Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ DASHBOARD ═══ */
  return (
    <div className="flex min-h-screen bg-[#0C0705] text-white">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-[99] lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Modals */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type || ""}?`}
        message={`Are you sure you want to delete "${deleteConfirm?.name || ""}"? This will permanently remove all related data (bookings, reviews, payments, notifications). This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteLoading}
      />
      <EditUserModal
        open={!!editUser}
        user={editUser}
        onSave={handleEditUserSave}
        onCancel={() => setEditUser(null)}
        loading={editLoading}
      />
      <ReviewChefModal
        open={!!reviewCook}
        cook={reviewCook}
        onApprove={handleApproveCook}
        onReject={handleRejectCook}
        onCancel={() => !reviewLoading && setReviewCook(null)}
        loading={reviewLoading}
      />

      {/* Sidebar */}
      <aside className={cn("w-[240px] fixed top-0 left-0 bottom-0 bg-[#120B07] z-[100] flex flex-col transition-transform duration-300 lg:translate-x-0 border-r border-[rgba(255,255,255,0.05)]", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="px-5 pt-6 pb-5 border-b border-[rgba(255,255,255,0.05)]">
          <div className="font-display font-[900] text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--orange-500)]" />COOKONCALL
          </div>
          <span className="block text-[0.65rem] font-normal text-[rgba(255,255,255,0.3)] mt-0.5 tracking-wider ml-7">Admin Panel</span>
        </div>
        <nav className="flex-1 py-4">
          {sidebarLinks.map((l) => (
            <button key={l.id} onClick={() => { setActivePanel(l.id); setSidebarOpen(false); }}
              className={cn("flex items-center gap-3 px-5 py-3 text-[0.88rem] font-medium w-full text-left border-none bg-transparent cursor-pointer transition-all",
                activePanel === l.id ? "bg-[rgba(212,114,26,0.12)] text-[var(--orange-400)]" : "text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[rgba(255,255,255,0.8)]"
              )} style={{ fontFamily: "var(--font-body)" }}>{l.icon}{l.label}</button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.05)]">
          <button onClick={handleLogout} className="flex items-center gap-2 text-[rgba(255,255,255,0.4)] text-[0.82rem] bg-transparent border-none cursor-pointer hover:text-white transition-colors w-full" style={{ fontFamily: "var(--font-body)" }}>
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[240px]">
        <header className="sticky top-0 z-50 bg-[rgba(12,7,5,0.95)] backdrop-blur-sm border-b border-[rgba(255,255,255,0.05)] px-5 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden bg-transparent border-none cursor-pointer text-white p-1"><Menu className="w-5 h-5" /></button>
            <div className="font-bold text-[0.95rem]">{sidebarLinks.find((l) => l.id === activePanel)?.label}</div>
          </div>
          <div className="text-[0.78rem] text-[rgba(255,255,255,0.3)]">Admin: <span className="text-[var(--orange-400)]">{adminName}</span></div>
        </header>

        <div className="p-5 md:p-7">
          {/* Success toast */}
          {successMsg && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-[10px] px-4 py-3 mb-5 text-green-400 text-[0.85rem]">
              <BadgeCheck className="w-4 h-4 shrink-0" />{successMsg}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-[10px] px-4 py-3 mb-5 text-red-400 text-[0.85rem]">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
              <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-400 bg-transparent border-none cursor-pointer text-lg">&times;</button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--orange-400)]" />
              <span className="ml-2 text-[rgba(255,255,255,0.4)] text-[0.85rem]">Loading...</span>
            </div>
          )}

          {/* ═══ OVERVIEW ═══ */}
          {activePanel === "overview" && !loading && (
            <div>
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Total Users", value: stats.total_users },
                    { label: "Total Cooks", value: stats.total_cooks },
                    { label: "Verified Cooks", value: stats.verified_cooks },
                    { label: "Pending Verification", value: stats.pending_cooks },
                    { label: "Total Bookings", value: stats.total_bookings },
                    { label: "Completed", value: stats.completed_bookings },
                    { label: "Active", value: stats.active_bookings },
                    { label: "Revenue", value: fmtCurrency(stats.total_revenue) },
                  ].map((s) => (
                    <div key={s.label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] p-5">
                      <div className="font-display text-[1.5rem] font-[800] text-[var(--orange-400)]">{s.value}</div>
                      <div className="text-[0.78rem] text-[rgba(255,255,255,0.4)] mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[0.9rem] text-[rgba(255,255,255,0.6)] uppercase tracking-wider">Recent Users</h3>
                <button onClick={() => setActivePanel("users")} className="text-[0.75rem] text-[var(--orange-400)] bg-transparent border-none cursor-pointer hover:underline" style={{ fontFamily: "var(--font-body)" }}>View all</button>
              </div>
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] overflow-x-auto mb-8">
                <table className="w-full text-left text-[0.85rem]">
                  <thead><tr className="border-b border-[rgba(255,255,255,0.06)]">{["Name","Email","Role","Joined"].map(h=><th key={h} className="px-4 py-3 text-[0.75rem] text-[rgba(255,255,255,0.3)] uppercase tracking-wider font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {recentUsers.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No users yet</td></tr> :
                    recentUsers.map(u=>(
                      <tr key={u.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{u.email}</td>
                        <td className="px-4 py-3">{roleBadge(u.role)}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.4)]">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[0.9rem] text-[rgba(255,255,255,0.6)] uppercase tracking-wider">Recent Bookings</h3>
                <button onClick={() => setActivePanel("bookings")} className="text-[0.75rem] text-[var(--orange-400)] bg-transparent border-none cursor-pointer hover:underline" style={{ fontFamily: "var(--font-body)" }}>View all</button>
              </div>
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] overflow-x-auto">
                <table className="w-full text-left text-[0.85rem]">
                  <thead><tr className="border-b border-[rgba(255,255,255,0.06)]">{["Customer","Chef","Amount","Status","Date"].map(h=><th key={h} className="px-4 py-3 text-[0.75rem] text-[rgba(255,255,255,0.3)] uppercase tracking-wider font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {recentBookings.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No bookings yet</td></tr> :
                    recentBookings.map(b=>(
                      <tr key={b.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="px-4 py-3 text-white">{b.user?.name||"—"}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{b.cook?.user?.name||"—"}</td>
                        <td className="px-4 py-3 text-[var(--orange-400)] font-medium">{fmtCurrency(b.total_price)}</td>
                        <td className="px-4 py-3">{statusBadge(b.status)}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.4)]">{formatDate(b.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ USERS ═══ */}
          {activePanel === "users" && !loading && (
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="font-bold text-[1.05rem]">All Users ({usersPag?.total || 0})</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
                    <input type="text" value={userSearch} onChange={e=>setUserSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchUsers()}
                      placeholder="Search by name..." className="pl-9 pr-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[0.85rem] text-white outline-none w-[220px] placeholder:text-[rgba(255,255,255,0.3)] focus:border-[var(--orange-500)]" style={{fontFamily:"var(--font-body)"}} />
                  </div>
                  <button onClick={()=>fetchUsers()} className="p-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.5)] hover:text-white cursor-pointer transition-colors"><RefreshCw className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] overflow-x-auto">
                <table className="w-full text-left text-[0.85rem]">
                  <thead><tr className="border-b border-[rgba(255,255,255,0.06)]">{["Name","Email","Phone","Role","Status","Joined","Actions"].map(h=><th key={h} className="px-4 py-3 text-[0.75rem] text-[rgba(255,255,255,0.3)] uppercase tracking-wider font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {users.length===0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No users found</td></tr> :
                    users.map(u=>(
                      <tr key={u.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{u.email}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{u.phone||"—"}</td>
                        <td className="px-4 py-3">{roleBadge(u.role)}</td>
                        <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-full text-[0.72rem] font-semibold",u.is_active?"bg-green-500/15 text-green-400":"bg-red-500/15 text-red-400")}>{u.is_active?"Active":"Blocked"}</span></td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.4)]">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {u.role!=="admin"&&(
                              <>
                                <button onClick={()=>setEditUser(u)} title="Edit user"
                                  className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg border-none cursor-pointer transition-all"
                                  style={{fontFamily:"var(--font-body)"}}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={()=>handleToggleUser(u.id)} disabled={actionLoading===u.id} title={u.is_active?"Block":"Unblock"}
                                  className={cn("p-1.5 rounded-lg border-none cursor-pointer transition-all disabled:opacity-50",
                                    u.is_active?"bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20":"bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                  )} style={{fontFamily:"var(--font-body)"}}>
                                  {actionLoading===u.id?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:u.is_active?<Ban className="w-3.5 h-3.5"/>:<UserCheck className="w-3.5 h-3.5"/>}
                                </button>
                                <button onClick={()=>setDeleteConfirm({ type:"user", id:u.id, name:u.name })} title="Delete user"
                                  className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border-none cursor-pointer transition-all"
                                  style={{fontFamily:"var(--font-body)"}}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {usersPag && usersPag.total_pages>1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  {Array.from({length:usersPag.total_pages},(_,i)=>i+1).map(p=>(
                    <button key={p} onClick={()=>fetchUsers(p)} className={cn("w-8 h-8 rounded-lg text-[0.8rem] font-medium border-none cursor-pointer transition-all",p===usersPag.page?"bg-[var(--orange-500)] text-white":"bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)]")} style={{fontFamily:"var(--font-body)"}}>{p}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ COOKS ═══ */}
          {activePanel === "cooks" && !loading && (
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="font-bold text-[1.05rem]">All Cooks ({cooksPag?.total || 0})</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {([
                    { id: "all", label: "All" },
                    { id: "pending_review", label: "Pending Review" },
                    { id: "verified", label: "Verified" },
                    { id: "unverified", label: "Unverified" },
                  ] as { id: CookFilter; label: string }[]).map(f=>(
                    <button key={f.id} onClick={()=>setCookFilter(f.id)}
                      className={cn("px-3.5 py-2 rounded-lg text-[0.8rem] font-medium border-none cursor-pointer transition-all",
                        cookFilter===f.id?"bg-[var(--orange-500)] text-white":"bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)]"
                      )} style={{fontFamily:"var(--font-body)"}}>{f.label}</button>
                  ))}
                  <button onClick={()=>fetchCooks()} className="p-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.5)] hover:text-white cursor-pointer transition-colors ml-1"><RefreshCw className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] overflow-x-auto">
                <table className="w-full text-left text-[0.85rem]">
                  <thead><tr className="border-b border-[rgba(255,255,255,0.06)]">{["Chef Name","Email","Cuisines","Rating","Bookings","Verification","Actions"].map(h=><th key={h} className="px-4 py-3 text-[0.75rem] text-[rgba(255,255,255,0.3)] uppercase tracking-wider font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {cooks.length===0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No cooks found</td></tr> :
                    cooks.map(c=>(
                      <tr key={c.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="px-4 py-3 text-white font-medium">{c.user?.name||"—"}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{c.user?.email||"—"}</td>
                        <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(c.cuisines||[]).map(cu=><span key={cu} className="px-2 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-[0.72rem] text-[rgba(255,255,255,0.5)]">{cu}</span>)}</div></td>
                        {/* Batch B2: "Rate" column removed from admin cooks table. */}
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{parseFloat(c.rating).toFixed(1)}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{c.total_bookings}</td>
                        <td className="px-4 py-3">
                          {verificationStatusBadge(c.verification_status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={()=>setReviewCook(c)} title="Review chef"
                              className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg border-none cursor-pointer transition-all"
                              style={{fontFamily:"var(--font-body)"}}>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {c.is_verified && (
                              <button onClick={()=>handleVerifyCook(c.id,false)} disabled={actionLoading===c.id} title="Quick unverify"
                                className="p-1.5 rounded-lg border-none cursor-pointer transition-all disabled:opacity-50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                                style={{fontFamily:"var(--font-body)"}}>
                                {actionLoading===c.id?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<ShieldX className="w-3.5 h-3.5"/>}
                              </button>
                            )}
                            <button onClick={()=>setDeleteConfirm({ type:"cook", id:c.id, name:c.user?.name||"Cook" })} title="Delete cook profile"
                              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border-none cursor-pointer transition-all"
                              style={{fontFamily:"var(--font-body)"}}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cooksPag && cooksPag.total_pages>1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  {Array.from({length:cooksPag.total_pages},(_,i)=>i+1).map(p=>(
                    <button key={p} onClick={()=>fetchCooks(p)} className={cn("w-8 h-8 rounded-lg text-[0.8rem] font-medium border-none cursor-pointer transition-all",p===cooksPag.page?"bg-[var(--orange-500)] text-white":"bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)]")} style={{fontFamily:"var(--font-body)"}}>{p}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ BOOKINGS ═══ */}
          {activePanel === "bookings" && !loading && (
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="font-bold text-[1.05rem]">All Bookings ({bookingsPag?.total || 0})</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
                    <input type="text" value={bookingSearch} onChange={e=>setBookingSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchBookings()}
                      placeholder="Search by name..." className="pl-9 pr-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[0.85rem] text-white outline-none w-[220px] placeholder:text-[rgba(255,255,255,0.3)] focus:border-[var(--orange-500)]" style={{fontFamily:"var(--font-body)"}} />
                  </div>
                  <button onClick={()=>fetchBookings()} className="p-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.5)] hover:text-white cursor-pointer transition-colors"><RefreshCw className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] overflow-x-auto">
                <table className="w-full text-left text-[0.85rem]">
                  <thead><tr className="border-b border-[rgba(255,255,255,0.06)]">{["Customer","Chef","Type","Date","Amount","Status","Actions"].map(h=><th key={h} className="px-4 py-3 text-[0.75rem] text-[rgba(255,255,255,0.3)] uppercase tracking-wider font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {bookings.length===0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[rgba(255,255,255,0.3)]">No bookings found</td></tr> :
                    bookings.map(b=>(
                      <tr key={b.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="px-4 py-3 text-white font-medium">{b.user?.name||"—"}</td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{b.cook?.user?.name||"—"}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-[0.72rem] text-[rgba(255,255,255,0.5)] capitalize">{(b.booking_type || b.type || "").replace(/_/g, " ")}</span></td>
                        <td className="px-4 py-3 text-[rgba(255,255,255,0.4)]">{formatDate(b.scheduled_at||b.created_at)}</td>
                        <td className="px-4 py-3 text-[var(--orange-400)] font-medium">{fmtCurrency(b.total_price)}</td>
                        <td className="px-4 py-3">{statusBadge(b.status)}</td>
                        <td className="px-4 py-3">
                          <button onClick={()=>setDeleteConfirm({ type:"booking", id:b.id, name:`Booking by ${b.user?.name||"unknown"}` })} title="Delete booking"
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border-none cursor-pointer transition-all"
                            style={{fontFamily:"var(--font-body)"}}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bookingsPag && bookingsPag.total_pages>1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  {Array.from({length:bookingsPag.total_pages},(_,i)=>i+1).map(p=>(
                    <button key={p} onClick={()=>fetchBookings(p)} className={cn("w-8 h-8 rounded-lg text-[0.8rem] font-medium border-none cursor-pointer transition-all",p===bookingsPag.page?"bg-[var(--orange-500)] text-white":"bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)]")} style={{fontFamily:"var(--font-body)"}}>{p}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* P1.6 — Areas panel: review chef/customer area requests */}
          {activePanel === "areas" && (
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="font-bold text-[1.05rem]">Area Requests</h2>
                  <p className="text-[0.8rem] text-[rgba(255,255,255,0.4)] mt-0.5">
                    Approve area names submitted by chefs/customers. Approved areas appear in dropdowns immediately.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setAreaReqStatusFilter(s)}
                      className={cn(
                        "px-3 py-1.5 text-[0.78rem] font-semibold rounded-full border cursor-pointer transition-all",
                        areaReqStatusFilter === s
                          ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                          : "bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.1)] hover:text-white"
                      )}
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchAreaRequests()}
                    className="p-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.5)] hover:text-white cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[14px] overflow-x-auto">
                {areaReqsLoading ? (
                  <div className="px-4 py-12 text-center text-[rgba(255,255,255,0.3)]">Loading…</div>
                ) : areaReqs.length === 0 ? (
                  <div className="px-4 py-12 text-center text-[rgba(255,255,255,0.3)]">
                    No {areaReqStatusFilter === "all" ? "" : areaReqStatusFilter + " "}requests.
                  </div>
                ) : (
                  <table className="w-full text-left text-[0.85rem]">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        {["Area Name", "City", "Requester", "Role", "Submitted", "Status", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[0.75rem] text-[rgba(255,255,255,0.3)] uppercase tracking-wider font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {areaReqs.map((r) => (
                        <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                          <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                          <td className="px-4 py-3 text-[rgba(255,255,255,0.5)]">{r.city}</td>
                          <td className="px-4 py-3">
                            <div className="text-white">{r.requester?.name || "—"}</div>
                            <div className="text-[0.72rem] text-[rgba(255,255,255,0.4)]">{r.requester?.email || ""}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.06)] rounded text-[0.72rem] text-[rgba(255,255,255,0.5)] capitalize">{r.requester_role}</span>
                          </td>
                          <td className="px-4 py-3 text-[rgba(255,255,255,0.4)] text-[0.78rem]">{formatDate(r.created_at)}</td>
                          <td className="px-4 py-3">
                            {r.status === "pending" && <span className="px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded text-[0.72rem] font-semibold capitalize">Pending</span>}
                            {r.status === "approved" && <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded text-[0.72rem] font-semibold capitalize">Approved → {r.approved_slug}</span>}
                            {r.status === "rejected" && <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded text-[0.72rem] font-semibold capitalize">Rejected</span>}
                          </td>
                          <td className="px-4 py-3">
                            {r.status === "pending" ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setApproveTarget(r);
                                    setApproveSlug(slugifyForApproval(r.name));
                                    setApproveRegion("west");
                                  }}
                                  className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 rounded-lg border-none cursor-pointer text-[0.74rem] font-semibold transition-all flex items-center gap-1"
                                  style={{ fontFamily: "var(--font-body)" }}
                                  title="Approve and add to active areas"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => { setRejectTarget(r); setRejectReason(""); }}
                                  className="px-2.5 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border-none cursor-pointer text-[0.74rem] font-semibold transition-all flex items-center gap-1"
                                  style={{ fontFamily: "var(--font-body)" }}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            ) : r.status === "rejected" && r.reject_reason ? (
                              <span className="text-[0.74rem] text-[rgba(255,255,255,0.4)] italic" title={r.reject_reason}>
                                {r.reject_reason.length > 30 ? r.reject_reason.slice(0, 30) + "…" : r.reject_reason}
                              </span>
                            ) : (
                              <span className="text-[0.74rem] text-[rgba(255,255,255,0.3)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* P1.6 — Approve area request modal */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => !approveSubmitting && setApproveTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#1A1209] border border-[rgba(255,255,255,0.1)] rounded-[16px] p-6 w-full max-w-[460px]">
            <h3 className="font-bold text-[1.05rem] text-white mb-1">Approve area</h3>
            <p className="text-[0.82rem] text-[rgba(255,255,255,0.5)] mb-4">
              Add <span className="text-white font-semibold">{approveTarget.name}</span> to the active areas list. Set a slug and region. Once approved, customers and chefs will see this immediately.
            </p>
            <label className="block mb-3">
              <span className="text-[0.78rem] text-[rgba(255,255,255,0.6)] mb-1 block">Slug (URL-safe id)</span>
              <input
                value={approveSlug}
                onChange={(e) => setApproveSlug(e.target.value)}
                placeholder="memnagar"
                maxLength={50}
                className="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[0.88rem] text-white outline-none focus:border-[var(--orange-500)]"
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              />
              <span className="text-[0.7rem] text-[rgba(255,255,255,0.3)] mt-1 block">
                Lowercase, hyphens only. Must be unique. We auto-suggested one — edit if needed.
              </span>
            </label>
            <label className="block mb-4">
              <span className="text-[0.78rem] text-[rgba(255,255,255,0.6)] mb-1 block">Region</span>
              <select
                value={approveRegion}
                onChange={(e) => setApproveRegion(e.target.value)}
                className="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[0.88rem] text-white outline-none focus:border-[var(--orange-500)]"
              >
                <option value="west">West</option>
                <option value="central">Central</option>
                <option value="north">North</option>
                <option value="east">East</option>
                <option value="south">South</option>
              </select>
            </label>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setApproveTarget(null)}
                disabled={approveSubmitting}
                className="px-4 py-2 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:text-white rounded-[10px] text-[0.85rem] font-semibold cursor-pointer border-none disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >Cancel</button>
              <button
                onClick={handleApproveAreaRequest}
                disabled={approveSubmitting}
                className="px-4 py-2 bg-emerald-500 text-white rounded-[10px] text-[0.85rem] font-semibold cursor-pointer border-none disabled:opacity-50 hover:opacity-90"
                style={{ fontFamily: "var(--font-body)" }}
              >{approveSubmitting ? "Approving…" : "Approve & add"}</button>
            </div>
          </div>
        </div>
      )}

      {/* P1.6 — Reject area request modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => !rejectSubmitting && setRejectTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#1A1209] border border-[rgba(255,255,255,0.1)] rounded-[16px] p-6 w-full max-w-[460px]">
            <h3 className="font-bold text-[1.05rem] text-white mb-1">Reject area request</h3>
            <p className="text-[0.82rem] text-[rgba(255,255,255,0.5)] mb-4">
              Tell the requester why <span className="text-white font-semibold">{rejectTarget.name}</span> isn't being added. They'll see this reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="e.g. Already covered by an existing area. Already exists as 'Memnagar'."
              className="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[0.88rem] text-white outline-none focus:border-[var(--orange-500)] resize-none mb-4"
              style={{ fontFamily: "var(--font-body)" }}
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={rejectSubmitting}
                className="px-4 py-2 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:text-white rounded-[10px] text-[0.85rem] font-semibold cursor-pointer border-none disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >Cancel</button>
              <button
                onClick={handleRejectAreaRequest}
                disabled={rejectSubmitting}
                className="px-4 py-2 bg-red-500 text-white rounded-[10px] text-[0.85rem] font-semibold cursor-pointer border-none disabled:opacity-50 hover:opacity-90"
                style={{ fontFamily: "var(--font-body)" }}
              >{rejectSubmitting ? "Rejecting…" : "Reject"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
