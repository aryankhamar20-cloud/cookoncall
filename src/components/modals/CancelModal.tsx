"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { bookingsApi } from "@/lib/api";
import type { Booking } from "@/types";
import toast from "react-hot-toast";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onConfirmCancel: (bookingId: string, reason: string) => void;
}

const cancellationReasons = [
  "Change of plans",
  "Found another chef",
  "Budget issue",
  "Emergency",
  "Other",
];

// ─── REFUND POLICY V2 (display-only, mirrors backend Apr 26 LOCKED) ─────
// Actual refund amount is computed server-side via GET /bookings/:id/refund-estimate.
// The table here is purely informational — we never compute it on the client.
const refundPolicy = [
  { window: "24+ hours before slot", percent: 100, color: "text-[var(--green-ok)]" },
  { window: "8–24 hours before slot", percent: 75, color: "text-[var(--orange-500)]" },
  { window: "4–8 hours before slot", percent: 50, color: "text-[var(--orange-500)]" },
  { window: "2–4 hours before slot", percent: 25, color: "text-[var(--orange-500)]" },
  { window: "Less than 2 hours / no-show", percent: 0, color: "text-[var(--red-err)]" },
];

interface ServerEstimate {
  refund_amount: number;
  chef_cancellation_fee: number;
  total_price: number;
  hours_until_session: number;
  policy: string;
}

export default function CancelModal({
  isOpen,
  onClose,
  booking,
  onConfirmCancel,
}: CancelModalProps) {
  const [reason, setReason] = useState(cancellationReasons[0]);
  const [confirming, setConfirming] = useState(false);
  const [estimate, setEstimate] = useState<ServerEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState(false);

  // Fetch the authoritative refund estimate from the server every time
  // the modal opens. The server is the source of truth — client-side
  // calculation could disagree due to timezone drift / clock skew.
  useEffect(() => {
    if (!isOpen || !booking?.id) {
      setEstimate(null);
      setEstimateError(false);
      return;
    }
    let cancelled = false;
    setLoadingEstimate(true);
    setEstimateError(false);
    bookingsApi
      .getRefundEstimate(booking.id)
      .then((res) => {
        if (cancelled) return;
        const data = (res.data?.data ?? res.data) as ServerEstimate;
        setEstimate(data);
      })
      .catch(() => {
        if (cancelled) return;
        setEstimateError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingEstimate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, booking?.id]);

  if (!booking) return null;

  async function handleConfirm() {
    setConfirming(true);
    try {
      onConfirmCancel(booking!.id, reason);
      if (estimate && estimate.refund_amount > 0) {
        toast.success(
          `Order cancelled. ₹${estimate.refund_amount} refund will be processed in 3–5 business days.`,
        );
      } else {
        toast.success("Order cancelled.");
      }
    } catch {
      toast.error("Failed to cancel. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Order" maxWidth="max-w-[440px]">
      {/* Policy reference table */}
      <div className="bg-[var(--cream-100)] rounded-[12px] p-4 mb-4">
        <div className="font-semibold text-[0.9rem] mb-2">Cancellation Policy</div>
        {refundPolicy.map((p) => (
          <div
            key={p.window}
            className="flex justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)] last:border-none text-[0.85rem]"
          >
            <span className="text-[var(--brown-800)]">{p.window}</span>
            <span className={`font-semibold ${p.color}`}>{p.percent}% refund</span>
          </div>
        ))}
      </div>

      {/* Refund estimate from server */}
      <div className="bg-[var(--cream-100)] rounded-[12px] p-4 mb-4 text-center">
        <div className="text-[0.78rem] text-[var(--text-muted)] mb-1">
          Your refund estimate
        </div>

        {loadingEstimate && (
          <div className="font-semibold text-[var(--text-muted)] text-[0.95rem] py-2">
            Calculating refund...
          </div>
        )}

        {estimateError && !loadingEstimate && (
          <div className="text-[var(--red-err)] text-[0.85rem] py-2">
            Couldn't load refund estimate. You can still cancel — the exact
            refund will be confirmed by our team.
          </div>
        )}

        {!loadingEstimate && !estimateError && estimate && (
          <>
            <div className="font-bold text-[var(--orange-500)] text-[1.4rem]">
              {formatCurrency(estimate.refund_amount)}
            </div>
            <div className="text-[0.78rem] text-[var(--text-muted)] mt-1">
              {estimate.policy}
            </div>
            {estimate.chef_cancellation_fee > 0 && (
              <div className="text-[0.75rem] text-[var(--text-muted)] mt-2 italic">
                Your chef will be compensated ₹{estimate.chef_cancellation_fee} for
                the blocked slot.
              </div>
            )}
          </>
        )}
      </div>

      {/* Reason */}
      <div className="mb-5">
        <label className="block font-semibold text-[0.88rem] mb-2">
          Reason for cancellation
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-3 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {cancellationReasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleConfirm}
        disabled={confirming || loadingEstimate}
        className="w-full py-3.5 border-none rounded-[12px] bg-[var(--red-err)] text-white font-bold text-[0.95rem] cursor-pointer transition-all hover:bg-[#B91C1C] disabled:opacity-60"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {confirming ? "Cancelling..." : "Confirm Cancellation"}
      </button>
    </Modal>
  );
}
