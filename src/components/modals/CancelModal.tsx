"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
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

// ─── REFUND POLICY V2 — Apr 26 LOCKED (matches backend getCancellationRefund) ──
// Option B: % applies to TOTAL. Platform absorbs chef compensation.
const refundPolicy = [
  { window: "24+ hours before slot", percent: 100, chefFee: 0, color: "text-[var(--green-ok)]" },
  { window: "8–24 hours before slot", percent: 75, chefFee: 25, color: "text-[var(--orange-500)]" },
  { window: "4–8 hours before slot", percent: 50, chefFee: 50, color: "text-[var(--orange-500)]" },
  { window: "2–4 hours before slot", percent: 25, chefFee: 75, color: "text-[var(--orange-500)]" },
  { window: "Less than 2 hours / no-show", percent: 0, chefFee: 100, color: "text-[var(--red-err)]" },
];

function getRefund(booking: Booking): {
  percent: number;
  reason: string;
  amount: number;
  chefFee: number;
} {
  const total = Number(booking.totalPrice) || 0;

  // Fallback if scheduledAt is missing — give full refund safely
  if (!booking.scheduledAt) {
    return { percent: 100, reason: "Full refund", amount: total, chefFee: 0 };
  }

  const scheduled = new Date(booking.scheduledAt);
  const now = new Date();
  const hoursUntil = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);

  let percent: number;
  let chefFee: number;
  let reason: string;

  if (hoursUntil >= 24) {
    percent = 100;
    chefFee = 0;
    reason = "24+ hours before slot — full refund";
  } else if (hoursUntil >= 8) {
    percent = 75;
    chefFee = 25;
    reason = "8–24 hours before slot — 75% refund";
  } else if (hoursUntil >= 4) {
    percent = 50;
    chefFee = 50;
    reason = "4–8 hours before slot — 50% refund";
  } else if (hoursUntil >= 2) {
    percent = 25;
    chefFee = 75;
    reason = "2–4 hours before slot — 25% refund";
  } else {
    percent = 0;
    chefFee = 100;
    reason = "Less than 2 hours before slot — no refund";
  }

  return {
    percent,
    reason,
    amount: Math.round((total * percent) / 100),
    chefFee,
  };
}

export default function CancelModal({
  isOpen,
  onClose,
  booking,
  onConfirmCancel,
}: CancelModalProps) {
  const [reason, setReason] = useState(cancellationReasons[0]);
  const [confirming, setConfirming] = useState(false);

  if (!booking) return null;

  const refund = getRefund(booking);

  async function handleConfirm() {
    setConfirming(true);
    try {
      onConfirmCancel(booking!.id, reason);
      if (refund.percent > 0) {
        toast.success(
          `Order cancelled. ₹${refund.amount} refund will be processed in 3–5 business days.`,
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
      {/* Policy */}
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

      {/* Refund estimate for this booking */}
      <div className="bg-[var(--cream-100)] rounded-[12px] p-4 mb-4 text-center">
        <div className="text-[0.78rem] text-[var(--text-muted)] mb-1">
          Your refund estimate
        </div>
        <div className="font-bold text-[var(--orange-500)] text-[1.4rem]">
          {formatCurrency(refund.amount)}{" "}
          <span className="text-[0.95rem] font-semibold">({refund.percent}%)</span>
        </div>
        <div className="text-[0.78rem] text-[var(--text-muted)] mt-1">
          {refund.reason}
        </div>
        {refund.chefFee > 0 && (
          <div className="text-[0.75rem] text-[var(--text-muted)] mt-2 italic">
            Your chef will be compensated ₹{refund.chefFee} for the blocked slot.
          </div>
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
        disabled={confirming}
        className="w-full py-3.5 border-none rounded-[12px] bg-[var(--red-err)] text-white font-bold text-[0.95rem] cursor-pointer transition-all hover:bg-[#B91C1C] disabled:opacity-60"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {confirming ? "Cancelling..." : "Confirm Cancellation"}
      </button>
    </Modal>
  );
}