"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import api, { bookingsApi, reviewsApi } from "@/lib/api";
import { OrderRowSkeleton } from "@/components/ui/Skeleton";
import ReviewModal from "@/components/modals/ReviewModal";
import PaymentModal from "@/components/modals/PaymentModal";
import {
  AlertCircle, MapPin, Clock, ChefHat, XCircle, Calendar,
  Users, IndianRupee, Star, Edit3, CreditCard, RotateCcw,
  BadgeCheck, Hourglass, ChevronDown, ChevronUp, Leaf, Award, Search,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Cook } from "@/types";
import { getInitials, formatCurrency } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

// ─── Filter options (lowercase to match backend status values) ──
const filters = [
  { label: "All", value: "" },
  { label: "Awaiting Chef", value: "pending_chef_approval" },
  { label: "Pay Now", value: "awaiting_payment" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled by You", value: "cancelled_by_user" },
  { label: "Chef Unavailable", value: "cancelled_by_cook" },
];

const statusStyles: Record<string, string> = {
  pending_chef_approval: "bg-amber-50 text-amber-700 border-amber-200",
  awaiting_payment: "bg-orange-50 text-orange-700 border-orange-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200", // legacy
  confirmed: "bg-green-50 text-green-700 border-green-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled_by_user: "bg-red-50 text-red-600 border-red-200",
  cancelled_by_cook: "bg-red-50 text-red-600 border-red-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

const statusLabels: Record<string, string> = {
  pending_chef_approval: "Awaiting Chef",
  awaiting_payment: "Pay Now",
  pending: "Pending", // legacy
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled_by_user: "Cancelled",
  cancelled_by_cook: "Chef Unavailable",
  expired: "Expired",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Bug 4 fix — Normalize legacy address strings with bad comma spacing.
function normalizeAddress(addr?: string | null): string {
  if (!addr) return "";
  return addr
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*$/g, "")
    .trim();
}

// Price color by status
function priceColorClass(status: string): string {
  if (
    status === "cancelled_by_user" ||
    status === "cancelled_by_cook" ||
    status === "expired"
  ) {
    return "text-red-500 line-through";
  }
  if (status === "completed") {
    return "text-[var(--brown-800)]";
  }
  return "text-[var(--orange-500)]";
}

/**
 * Countdown timer component.
 * Shows "Xh Ym left" for the given ISO deadline. Updates every 30s.
 * Returns null if deadline is invalid.
 */
function CountdownTimer({
  deadline,
  warningMinutes = 30,
  expiredLabel = "Expired",
}: {
  deadline: string | undefined;
  warningMinutes?: number;
  expiredLabel?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return null;
  const end = new Date(deadline).getTime();
  if (!Number.isFinite(end)) return null;

  const msLeft = end - now;
  if (msLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-red-600">
        <Hourglass className="w-3 h-3" /> {expiredLabel}
      </span>
    );
  }

  const totalMin = Math.floor(msLeft / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const label = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  const critical = totalMin <= warningMinutes;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[0.78rem] font-semibold",
        critical ? "text-red-600" : "text-amber-700"
      )}
    >
      <Hourglass className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function OrdersPanel() {
  const [activeFilter, setActiveFilter] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Review modal
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    bookingId: string;
    chefName: string;
    existingReview?: { rating: number; comment: string } | null;
  }>({ open: false, bookingId: "", chefName: "", existingReview: null });
  const [reviewMap, setReviewMap] = useState<Record<string, { rating: number; comment: string } | null>>({});

  // Apr 21 NEW FLOW — payment modal lives here now (not BookChefPanel).
  // Customer taps "Pay Now" on an AWAITING_PAYMENT booking → modal opens.
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    bookingId: string;
    amount: number;
    chefName: string;
  }>({ open: false, bookingId: "", amount: 0, chefName: "" });

  // Apr 21 NEW FLOW — rebook modal state.
  // When chef rejects, customer can book another chef with same date/time/address/guests.
  const [rebookModal, setRebookModal] = useState<{
    open: boolean;
    originalBookingId: string;
    originalChefName: string;
  }>({ open: false, originalBookingId: "", originalChefName: "" });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (activeFilter) params.status = activeFilter;
      const res = await api.get("/bookings", { params });
      const data = res.data?.data ?? res.data;
      const list = Array.isArray(data) ? data : data?.bookings ?? data?.data ?? [];
      const safeList = Array.isArray(list) ? list : [];
      setBookings(safeList);

      const map: Record<string, { rating: number; comment: string } | null> = {};
      safeList.forEach((b: any) => {
        if (b.review && typeof b.review === "object") {
          map[b.id] = {
            rating: Number(b.review.rating) || 0,
            comment: b.review.comment || "",
          };
        } else if (b.has_review) {
          map[b.id] = { rating: 0, comment: "" };
        }
      });
      setReviewMap(map);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Auto-refresh every 60s so AWAITING_PAYMENT/PENDING_CHEF_APPROVAL
  // bookings update without user needing to click Retry.
  useEffect(() => {
    const id = setInterval(() => fetchBookings(), 60_000);
    return () => clearInterval(id);
  }, [fetchBookings]);

  async function handleCancel(bookingId: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      setCancellingId(bookingId);
      await api.patch(`/bookings/${bookingId}/status`, {
        status: "cancelled_by_user",
        cancellation_reason: "Cancelled by customer",
      });
      toast.success("Booking cancelled.");
      fetchBookings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSubmitReview(bookingId: string, rating: number, comment: string) {
    try {
      await reviewsApi.submit({ booking_id: bookingId, rating, comment });
      setReviewMap((prev) => ({ ...prev, [bookingId]: { rating, comment } }));
      setReviewModal({ open: false, bookingId: "", chefName: "", existingReview: null });
      toast.success("Review saved!");
      fetchBookings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit review.");
    }
  }

  function openPayment(b: any) {
    const rawTotal = Number(b.total_price);
    const amount = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;
    if (amount <= 0) {
      toast.error("Invalid amount. Please refresh and try again.");
      return;
    }
    const cookUser = b.cook?.user;
    const chefName = cookUser
      ? `${cookUser.name || ""} ${cookUser.lastName || cookUser.last_name || ""}`.trim() || "Chef"
      : "Chef";
    setPaymentModal({ open: true, bookingId: b.id, amount, chefName });
  }

  function onPaymentSuccess() {
    setPaymentModal({ open: false, bookingId: "", amount: 0, chefName: "" });
    toast.success("Payment successful! Booking confirmed.");
    fetchBookings();
  }

  function openRebook(b: any) {
    const cookUser = b.cook?.user;
    const chefName = cookUser
      ? `${cookUser.name || ""} ${cookUser.lastName || cookUser.last_name || ""}`.trim() || "Chef"
      : "Chef";
    setRebookModal({
      open: true,
      originalBookingId: b.id,
      originalChefName: chefName,
    });
  }

  return (
    <div>
      <h2 className="font-bold text-[1.05rem] mb-1">My Orders</h2>
      <p className="text-[0.88rem] text-[var(--text-muted)] mb-5">
        Track your chef bookings and order history.
      </p>

      {/* Filter tabs */}
      <div className="-mx-1 px-1 mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex flex-nowrap gap-2 pb-1 min-w-max">
          {filters.map((f) => (
            <button key={f.value} onClick={() => setActiveFilter(f.value)}
              className={cn(
                "px-4 py-2 rounded-full text-[0.82rem] font-semibold border cursor-pointer transition-all shrink-0 whitespace-nowrap",
                activeFilter === f.value
                  ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                  : "bg-white text-[var(--text-muted)] border-[rgba(212,114,26,0.1)] hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]"
              )}
              style={{ fontFamily: "var(--font-body)" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">{[1, 2, 3].map((i) => <OrderRowSkeleton key={i} />)}</div>
      )}

      {error && (
        <div className="bg-white rounded-[16px] p-12 border border-red-100 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-[0.9rem] text-red-400">Could not load bookings.</p>
          <button onClick={fetchBookings}
            className="mt-3 px-5 py-2 rounded-full bg-[var(--orange-500)] text-white text-[0.82rem] font-semibold border-none cursor-pointer"
            style={{ fontFamily: "var(--font-body)" }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)]">
          <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[0.9rem]">
            {activeFilter ? "No bookings with this status." : "No orders yet. Book a chef to get started!"}
          </p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((b) => {
            const cookUser = b.cook?.user;
            const chefName = cookUser
              ? `${cookUser.name || ""} ${cookUser.lastName || cookUser.last_name || ""}`.trim() || "Chef"
              : "Chef";
            const status = b.status || "pending_chef_approval";

            // ─── Apr 21 new-flow action flags ───
            const isAwaitingChef = status === "pending_chef_approval" || status === "pending";
            const isAwaitingPayment = status === "awaiting_payment";
            const isRejectedByChef = status === "cancelled_by_cook";

            // Customer can cancel while awaiting chef OR awaiting their own payment.
            // `confirmed` cancels go through refund policy (handled by backend).
            const canCancel = isAwaitingChef || isAwaitingPayment || status === "confirmed";

            const existingReview = reviewMap[b.id];
            const hasReviewed = !!existingReview;
            const canLeaveReview = status === "completed" && !hasReviewed;
            const canEditReview = status === "completed" && hasReviewed;
            const cleanAddress = normalizeAddress(b.address);

            // Deadlines for countdown timers.
            // Chef has 3hr from booking creation.
            // Customer has 3hr from chef_responded_at to pay.
            const createdAtMs = b.created_at ? new Date(b.created_at).getTime() : 0;
            const chefDeadline = createdAtMs > 0
              ? new Date(createdAtMs + 3 * 60 * 60 * 1000).toISOString()
              : undefined;
            const paymentDeadline = b.payment_expires_at
              || (b.chef_responded_at
                ? new Date(new Date(b.chef_responded_at).getTime() + 3 * 60 * 60 * 1000).toISOString()
                : undefined);

            return (
              <div key={b.id}
                className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)] transition-all hover:shadow-[0_4px_16px_rgba(26,15,10,0.05)]">

                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] flex items-center justify-center font-display font-[800] text-[0.8rem] text-[rgba(0,0,0,0.3)] shrink-0">
                      {chefName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[0.95rem] truncate">{chefName}</div>
                      <div className="text-[0.78rem] text-[var(--text-muted)] truncate">
                        {b.cook?.cuisines?.join(", ") || "Home Cooking"}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[0.72rem] font-semibold border whitespace-nowrap shrink-0 self-start",
                    statusStyles[status] || "bg-gray-50 text-gray-500"
                  )}>
                    {statusLabels[status] || status}
                  </span>
                </div>

                {/* Countdown timer banner — ONLY for pending_chef_approval & awaiting_payment */}
                {isAwaitingChef && chefDeadline && (
                  <div className="flex items-center justify-between gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-[10px] px-3 py-2">
                    <div className="flex items-center gap-2 text-[0.82rem] text-amber-800">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Waiting for chef to accept</span>
                    </div>
                    <CountdownTimer deadline={chefDeadline} expiredLabel="Auto-expired" />
                  </div>
                )}
                {isAwaitingPayment && paymentDeadline && (
                  <div className="flex items-center justify-between gap-2 mb-3 bg-orange-50 border border-orange-200 rounded-[10px] px-3 py-2">
                    <div className="flex items-center gap-2 text-[0.82rem] text-orange-800">
                      <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-green-600" />
                      <span className="font-semibold">Chef accepted — pay to confirm</span>
                    </div>
                    <CountdownTimer deadline={paymentDeadline} expiredLabel="Window closed" />
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="flex items-center gap-1.5 text-[0.82rem] text-[var(--text-muted)]">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{b.scheduled_at ? formatDate(b.scheduled_at) : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.82rem] text-[var(--text-muted)]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{b.scheduled_at ? formatTime(b.scheduled_at) : "—"} · {b.duration_hours || 2}h</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.82rem] text-[var(--text-muted)]">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{b.guests || 2} guests</span>
                  </div>
                  <div className={cn("flex items-center gap-1.5 text-[0.82rem] font-semibold", priceColorClass(status))}>
                    <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                    <span>{Number(b.total_price || 0).toFixed(0)}</span>
                  </div>
                </div>

                {cleanAddress && (
                  <div className="flex items-start gap-1.5 text-[0.82rem] text-[var(--text-muted)] mb-3">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{cleanAddress}</span>
                  </div>
                )}

                {b.dishes && (
                  <div className="text-[0.82rem] text-[var(--text-muted)] mb-3 bg-[var(--cream-100)] rounded-[8px] px-3 py-2">
                    <span className="font-semibold text-[var(--brown-800)]">Dishes:</span> {b.dishes}
                  </div>
                )}

                {/* Apr 21 NEW FLOW — Rejection banner with 2 options */}
                {isRejectedByChef && (
                  <div className="mt-3 mb-3 bg-red-50 border border-red-200 rounded-[12px] p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-[0.85rem] text-red-700">
                        <div className="font-semibold mb-0.5">Chef unavailable</div>
                        <div className="text-[0.8rem] text-red-600">
                          {chefName} couldn't take this booking. You have two options.
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openRebook(b)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.82rem] font-semibold text-white bg-[var(--orange-500)] border-none cursor-pointer hover:bg-[var(--orange-400)] transition-all"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Book Another Chef
                      </button>
                      <span className="text-[0.78rem] text-[var(--text-muted)] self-center">
                        or just leave it — no charge
                      </span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-2 border-t border-[rgba(212,114,26,0.06)] gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Apr 21 NEW FLOW — Pay Now button (only for AWAITING_PAYMENT) */}
                    {isAwaitingPayment && (
                      <button
                        onClick={() => openPayment(b)}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-white bg-[var(--orange-500)] border-none cursor-pointer hover:bg-[var(--orange-400)] transition-all"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Now · {formatCurrency(Number(b.total_price || 0))}
                      </button>
                    )}

                    {canLeaveReview && (
                      <button
                        onClick={() => setReviewModal({ open: true, bookingId: b.id, chefName, existingReview: null })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.82rem] font-semibold text-[var(--orange-500)] bg-[rgba(212,114,26,0.06)] border border-[rgba(212,114,26,0.1)] cursor-pointer transition-all hover:bg-[rgba(212,114,26,0.12)]"
                        style={{ fontFamily: "var(--font-body)" }}>
                        <Star className="w-3.5 h-3.5" />
                        Leave Review
                      </button>
                    )}
                    {canEditReview && (
                      <>
                        <span className="flex items-center gap-1 text-[0.78rem] text-emerald-600 font-medium">
                          <Star className="w-3.5 h-3.5 fill-emerald-500" />
                          Reviewed
                        </span>
                        <button
                          onClick={() => setReviewModal({
                            open: true, bookingId: b.id, chefName,
                            existingReview: existingReview || null,
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.78rem] font-semibold text-[var(--text-muted)] bg-white border border-[var(--cream-300)] cursor-pointer transition-all hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]"
                          style={{ fontFamily: "var(--font-body)" }}>
                          <Edit3 className="w-3 h-3" /> Edit Review
                        </button>
                      </>
                    )}
                  </div>
                  <div>
                    {canCancel && (
                      <button onClick={() => handleCancel(b.id)} disabled={cancellingId === b.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.82rem] font-semibold text-red-500 bg-red-50 border border-red-100 cursor-pointer transition-all hover:bg-red-100 disabled:opacity-50"
                        style={{ fontFamily: "var(--font-body)" }}>
                        <XCircle className="w-3.5 h-3.5" />
                        {cancellingId === b.id ? "Cancelling..." : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>

                {(status === "cancelled_by_user") && b.cancellation_reason && (
                  <div className="mt-2 text-[0.78rem] text-red-400 italic">Reason: {b.cancellation_reason}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModal.open}
        onClose={() => setReviewModal({ open: false, bookingId: "", chefName: "", existingReview: null })}
        bookingId={reviewModal.bookingId}
        chefName={reviewModal.chefName}
        onSubmitReview={handleSubmitReview}
        existingReview={reviewModal.existingReview ?? undefined}
      />

      {/* Apr 21 NEW FLOW — Payment Modal (moved here from BookChefPanel) */}
      {paymentModal.open && (
        <PaymentModal
          isOpen={paymentModal.open}
          onClose={() => setPaymentModal({ open: false, bookingId: "", amount: 0, chefName: "" })}
          bookingId={paymentModal.bookingId}
          amount={paymentModal.amount}
          description={`Chef booking — ${paymentModal.chefName}`}
          onPaymentSuccess={onPaymentSuccess}
        />
      )}

      {/* Apr 21 NEW FLOW — Rebook Modal */}
      {rebookModal.open && (
        <RebookModal
          isOpen={rebookModal.open}
          onClose={() => setRebookModal({ open: false, originalBookingId: "", originalChefName: "" })}
          originalBookingId={rebookModal.originalBookingId}
          originalChefName={rebookModal.originalChefName}
          onSuccess={() => {
            setRebookModal({ open: false, originalBookingId: "", originalChefName: "" });
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RebookModal — pick a new chef + new dishes after rejection.
// Carries over date/time/address/guests from the original booking
// (handled server-side by the /bookings/:id/rebook endpoint).
// ═══════════════════════════════════════════════════════════
function RebookModal({
  isOpen,
  onClose,
  originalBookingId,
  originalChefName,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  originalBookingId: string;
  originalChefName: string;
  onSuccess: () => void;
}) {
  const [chefs, setChefs] = useState<Cook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedChef, setSelectedChef] = useState<Cook | null>(null);
  const [chefMenu, setChefMenu] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, { name: string; price: number; qty: number }>>({});
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset everything when closed
      setSelectedChef(null);
      setChefMenu([]);
      setSelectedItems({});
      setInstructions("");
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        const { data } = await api.get("/cooks", { params });
        const raw = data?.data ?? data;
        const list = Array.isArray(raw) ? raw : raw?.cooks ?? raw?.data ?? [];
        if (!cancelled) setChefs(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setChefs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, debouncedSearch]);

  async function pickChef(chef: Cook) {
    setSelectedChef(chef);
    setSelectedItems({});
    try {
      setMenuLoading(true);
      const { data } = await api.get(`/cooks/${chef.id}/menu`);
      const items = data?.data ?? data;
      setChefMenu(Array.isArray(items) ? items : []);
    } catch {
      setChefMenu([]);
    } finally {
      setMenuLoading(false);
    }
  }

  function toggleItem(item: any) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = { name: item.name, price: Number(item.price) || 0, qty: 1 };
      }
      return next;
    });
  }

  function setQty(itemId: string, qty: number) {
    setSelectedItems((prev) => {
      if (!prev[itemId]) return prev;
      if (qty < 1) return prev;
      return { ...prev, [itemId]: { ...prev[itemId], qty } };
    });
  }

  const selectedList = Object.entries(selectedItems);
  const dishesSubtotal = selectedList.reduce(
    (sum, [, v]) => sum + v.price * v.qty,
    0,
  );
  const canSubmit = !!selectedChef && selectedList.length > 0 && !submitting;

  async function handleSubmit() {
    if (!selectedChef || selectedList.length === 0) {
      toast.error("Please select a chef and at least one dish.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        new_cook_id: selectedChef.id,
        selected_items: selectedList.map(([menuItemId, v]) => ({
          menuItemId,
          qty: v.qty,
        })),
        instructions: instructions.trim() || undefined,
      };
      await bookingsApi.rebook(originalBookingId, payload);
      toast.success("Request sent to the new chef!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to rebook. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none sm:rounded-[16px] max-w-2xl w-full min-h-screen sm:min-h-0 sm:my-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--cream-200)]">
          <div>
            <h3 className="font-bold text-[1.05rem]">Book Another Chef</h3>
            <p className="text-[0.8rem] text-[var(--text-muted)]">
              Same date, time &amp; address. {originalChefName} couldn't take it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-[var(--cream-100)] flex items-center justify-center bg-transparent border-none cursor-pointer"
            aria-label="Close"
          >
            <XCircle className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Chef picker */}
          {!selectedChef && (
            <>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by chef name or cuisine..."
                  className="w-full pl-10 pr-4 py-3 rounded-[12px] border border-[var(--cream-300)] bg-white text-[0.9rem] outline-none focus:border-[var(--orange-500)]"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>

              {loading && (
                <div className="text-center py-8 text-[var(--text-muted)] text-[0.9rem]">
                  Loading chefs...
                </div>
              )}

              {!loading && chefs.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)] text-[0.9rem]">
                  No other chefs match. Try a different search.
                </div>
              )}

              {!loading && chefs.length > 0 && (
                <div className="space-y-2">
                  {chefs.map((chef) => {
                    const name = `${chef.user?.name || ""} ${chef.user?.lastName || ""}`.trim() || "Chef";
                    const ini = getInitials(name);
                    const rating = Number(chef.rating) || 0;
                    return (
                      <button
                        key={chef.id}
                        onClick={() => pickChef(chef)}
                        className="w-full bg-white border border-[var(--cream-300)] rounded-[12px] p-3 flex items-center gap-3 text-left cursor-pointer hover:border-[var(--orange-500)] transition-all"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] flex items-center justify-center font-display font-[800] text-[0.85rem] text-[rgba(0,0,0,0.3)] shrink-0">
                          {chef.user?.avatar ? (
                            <img src={chef.user.avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                          ) : ini}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="font-semibold text-[0.9rem] truncate">{name}</div>
                            {(chef.is_verified || chef.isVerified) && (
                              <BadgeCheck className="w-3.5 h-3.5 text-[var(--green-ok)] shrink-0" />
                            )}
                            {(chef.is_veg_only || chef.isVegOnly) && (
                              <Leaf className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            )}
                            {chef.fssai_url && (
                              <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-[0.78rem] text-[var(--text-muted)] truncate">
                            {chef.cuisines?.join(", ") || "Home Cooking"}
                          </div>
                          {rating > 0 && (
                            <div className="flex items-center gap-0.5 text-[0.75rem] mt-0.5">
                              <Star className="w-3 h-3 fill-[#F5A623] text-[#F5A623]" />
                              <span className="font-semibold">{rating.toFixed(1)}</span>
                              {chef.total_bookings != null && (
                                <span className="text-[var(--text-muted)]">· {chef.total_bookings} bookings</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Dish picker for selected chef */}
          {selectedChef && (
            <>
              <div className="flex items-center gap-3 bg-[var(--cream-100)] rounded-[12px] p-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] flex items-center justify-center font-display font-[800] text-[0.85rem] text-[rgba(0,0,0,0.3)] shrink-0">
                  {selectedChef.user?.avatar ? (
                    <img src={selectedChef.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : getInitials(`${selectedChef.user?.name || ""} ${selectedChef.user?.lastName || ""}`.trim())}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[0.9rem] truncate">
                    {`${selectedChef.user?.name || ""} ${selectedChef.user?.lastName || ""}`.trim() || "Chef"}
                  </div>
                  <div className="text-[0.78rem] text-[var(--text-muted)] truncate">
                    {selectedChef.cuisines?.join(", ") || "Home Cooking"}
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedChef(null); setChefMenu([]); setSelectedItems({}); }}
                  className="text-[0.78rem] text-[var(--orange-500)] font-semibold bg-transparent border-none cursor-pointer underline"
                >
                  Change
                </button>
              </div>

              <div>
                <div className="font-semibold text-[0.9rem] mb-2">Select dishes</div>
                {menuLoading && (
                  <div className="text-center py-4 text-[var(--text-muted)] text-[0.85rem]">
                    Loading menu...
                  </div>
                )}
                {!menuLoading && chefMenu.length === 0 && (
                  <div className="text-center py-4 text-[var(--text-muted)] text-[0.85rem]">
                    This chef hasn't added any dishes yet.
                  </div>
                )}
                {!menuLoading && chefMenu.length > 0 && (
                  <div className="space-y-2">
                    {chefMenu.map((item: any) => {
                      const isSelected = !!selectedItems[item.id];
                      const qty = selectedItems[item.id]?.qty || 0;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 border rounded-[10px] p-3 transition-all",
                            isSelected
                              ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.04)]"
                              : "border-[var(--cream-300)] bg-white"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item)}
                            className="w-4 h-4 accent-[var(--orange-500)] cursor-pointer"
                          />
                          {item.image && (
                            <img src={item.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={cn(
                                  "w-3 h-3 border-[1.5px] rounded-sm flex items-center justify-center shrink-0",
                                  item.type === "veg" ? "border-green-600" : "border-red-600"
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    item.type === "veg" ? "bg-green-600" : "bg-red-600"
                                  )}
                                />
                              </div>
                              <div className="font-semibold text-[0.85rem] truncate">{item.name}</div>
                            </div>
                            <div className="text-[0.78rem] text-[var(--orange-500)] font-semibold">
                              {formatCurrency(Number(item.price) || 0)}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setQty(item.id, qty - 1)}
                                disabled={qty <= 1}
                                className="w-7 h-7 rounded-full border border-[var(--cream-300)] bg-white text-[var(--text-muted)] cursor-pointer disabled:opacity-40 font-semibold"
                              >
                                –
                              </button>
                              <span className="w-6 text-center font-semibold text-[0.85rem]">{qty}</span>
                              <button
                                type="button"
                                onClick={() => setQty(item.id, qty + 1)}
                                className="w-7 h-7 rounded-full border border-[var(--cream-300)] bg-white text-[var(--text-muted)] cursor-pointer font-semibold"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[0.82rem] font-semibold mb-1.5">
                  Notes for the chef <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any allergies, spice level, or special requests?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-[10px] border border-[var(--cream-300)] bg-white text-[0.85rem] outline-none focus:border-[var(--orange-500)] resize-none"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {selectedChef && (
          <div className="p-5 border-t border-[var(--cream-200)] bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[0.82rem] text-[var(--text-muted)]">
                Dishes subtotal
              </div>
              <div className="font-bold text-[0.95rem] text-[var(--orange-500)]">
                {formatCurrency(dishesSubtotal)}
              </div>
            </div>
            <div className="text-[0.72rem] text-[var(--text-muted)] mb-3">
              Final total includes ₹49 visit fee + 2.5% convenience fee. Date, time, address, and guests carry over from your original booking.
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] border-none cursor-pointer hover:bg-[var(--orange-400)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {submitting ? "Sending request..." : `Send Request to New Chef${selectedList.length > 0 ? ` (${selectedList.length} dishes)` : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
