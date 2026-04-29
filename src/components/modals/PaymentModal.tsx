"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { formatCurrency, cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";
import toast from "react-hot-toast";
import { Smartphone, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/lib/api";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  deliveryFee?: number;
  bookingId?: string;
  onPaymentSuccess: (method: PaymentMethod) => void;
}

const paymentMethods: {
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  subtext: string;
}[] = [
  {
    id: "upi",
    label: "UPI",
    icon: <Smartphone className="w-4 h-4 inline -mt-0.5" />,
    subtext: "GPay, PhonePe, Paytm",
  },
  {
    id: "card",
    label: "Card",
    icon: <CreditCard className="w-4 h-4 inline -mt-0.5" />,
    subtext: "Debit / Credit",
  },
  // ─── COD removed for launch (Apr 27, 2026) ─────────────────────────────
  // Reason: backend has zero COD handling — selecting "Cash" silently let
  // bookings expire in AWAITING_PAYMENT. Re-introduce in Month 2 only for
  // bookings <₹1500 from repeat customers. See chat 2026-04-27.
];

// ─── Load Razorpay script dynamically ────────────────────
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  description,
  deliveryFee,
  bookingId,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const { user } = useAuthStore();

  const total = amount;

  async function handlePay() {
    setProcessing(true);
    setStatus("");

    try {
      // ─── COD removed for launch ──────────────────────────────────────────
      // Previously: COD path called onPaymentSuccess("cod") with NO API call,
      // booking expired in 3hr. The button is gone now (see paymentMethods
      // array above) but this guard stays in case PaymentMethod type still
      // allows "cod" elsewhere.
      if (selectedMethod === "cod") {
        throw new Error("Cash payments aren't available right now. Please use UPI or Card.");
      }

      // ─── RAZORPAY FLOW ───────────────────────────────
      if (!bookingId) {
        throw new Error("Booking ID missing. Please try again.");
      }

      // Step 1: Pre-flight — verify token is valid
      setStatus("Verifying session...");
      try {
        await api.get("/auth/me");
      } catch {
        throw new Error("Session expired. Please refresh the page and try again.");
      }

      // Step 2: Create Razorpay order on backend
      setStatus("Creating payment order...");
      const { data: orderData } = await api.post("/payments/create-order", {
        booking_id: bookingId,
      });

      const order = orderData?.data?.data ?? orderData?.data ?? orderData;

      const razorpayKey = order.razorpay_key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        throw new Error("Razorpay not configured. Contact support.");
      }

      // Only block truly zero/null amounts — backend already validates > 0
      if (!order.amount || Number(order.amount) <= 0) {
        throw new Error(`Payment setup failed (amount=${order.amount}). Please refresh and try again.`);
      }

      // Step 3: Load Razorpay script
      setStatus("Loading payment gateway...");
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Failed to load payment gateway. Check your internet.");
      }

      // Step 4: Open Razorpay checkout
      setStatus("Opening Razorpay...");

      await new Promise<void>((resolve, reject) => {
        const options = {
          key: razorpayKey,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "CookOnCall",
          description: description || "Chef Booking Payment",
          order_id: order.razorpay_order_id,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              setStatus("Verifying payment...");
              await api.post("/payments/verify", {
                booking_id: bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success("Payment successful! Booking confirmed.");
              onPaymentSuccess(selectedMethod);
              resolve();
            } catch (err: any) {
              toast.error(err.message || "Payment verification failed.");
              reject(err);
            }
          },
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
          theme: {
            color: "#D4721A",
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled"));
            },
          },
        };

        if ((window as any).__rzp__) {
          try { (window as any).__rzp__.close(); } catch (_) {}
          (window as any).__rzp__ = null;
        }
        const razorpay = new (window as any).Razorpay(options);
        (window as any).__rzp__ = razorpay;
        razorpay.on("payment.failed", (failResponse: any) => {
          console.error("Razorpay payment failed:", failResponse);
          const msg =
            failResponse?.error?.description ||
            "Payment failed. Please try again.";
          reject(new Error(msg));
        });
        razorpay.open();
      });
    } catch (err: any) {
      if (err.message !== "Payment cancelled") {
        toast.error(err.message || "Payment failed. Please try again.");
      }
    } finally {
      setProcessing(false);
      setStatus("");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={processing ? undefined : onClose}
      title="Payment"
      maxWidth="max-w-[440px]"
    >
      {/* Summary */}
      <div className="bg-[var(--cream-100)] rounded-[12px] p-4 mb-4">
        <div className="font-semibold text-[0.9rem] mb-2">{description}</div>
        <div className="flex justify-between text-[0.88rem] py-1">
          <span>Amount</span>
          <span>{formatCurrency(amount - (deliveryFee || 0))}</span>
        </div>
        {deliveryFee ? (
          <div className="flex justify-between text-[0.88rem] py-1">
            <span>Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-[1.05rem] border-t border-[rgba(212,114,26,0.1)] pt-2.5 mt-1.5">
          <span>Total</span>
          <span className="text-[var(--orange-500)]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Method selection */}
      <div className="font-semibold text-[0.9rem] mb-2">
        Choose Payment Method
      </div>
      <div className="flex gap-2.5 mb-5">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => !processing && setSelectedMethod(method.id)}
            className={cn(
              "flex-1 py-3 rounded-[12px] border-[1.5px] bg-white cursor-pointer text-center transition-all",
              selectedMethod === method.id
                ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.04)]"
                : "border-[var(--cream-300)] hover:border-[var(--orange-500)]",
              processing && "opacity-60 cursor-not-allowed"
            )}
            style={{ fontFamily: "var(--font-body)" }}
            disabled={processing}
          >
            <div
              className={cn(
                "text-[0.88rem] font-semibold",
                selectedMethod === method.id
                  ? "text-[var(--orange-500)]"
                  : "text-[var(--brown-800)]"
              )}
            >
              {method.icon} {method.label}
            </div>
            <div className="text-[0.7rem] text-[var(--text-muted)] mt-0.5">
              {method.subtext}
            </div>
          </button>
        ))}
      </div>

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={processing}
        className="w-full py-4 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-base cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {status || "Processing..."}
          </>
        ) : (
          `Pay ${formatCurrency(total)}`
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-[var(--green-ok)]" />
        <p className="text-[0.75rem] text-[var(--text-muted)]">
          Powered by Razorpay · 100% Secure Payments
        </p>
      </div>
    </Modal>
  );
}
