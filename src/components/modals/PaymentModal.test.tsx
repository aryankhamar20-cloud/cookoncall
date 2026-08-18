/**
 * PaymentModal — payment-status consistency spec.
 *
 * A payment-flow audit found that a customer retrying "Pay" after a
 * dropped connection (their previous /payments/verify call captured the
 * money server-side, but the browser never saw the success response)
 * would hit /payments/create-order's "Payment already completed" guard
 * and be shown a scary generic error for a booking they'd already paid
 * for. This spec locks in the fix:
 *
 *   1. On open, if the booking is already CAPTURED (checked via
 *      GET /payments/booking/:id before Razorpay is even touched),
 *      the modal immediately reports success — no checkout, no error.
 *   2. If that race is instead only caught by /payments/create-order's
 *      "already completed" guard (payment captured in the gap between
 *      the pre-check and this call), the modal still treats it as
 *      success rather than failure.
 *   3. When /payments/verify itself genuinely fails, the toast shows
 *      the backend's specific reason — not a generic Axios message.
 *
 * Razorpay's real checkout.js is never loaded in this test: window.Razorpay
 * is pre-seeded, which makes the component's own loadRazorpayScript()
 * short-circuit (it resolves immediately when window.Razorpay already
 * exists) instead of injecting a live <script> tag into jsdom.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentModal from "./PaymentModal";
import api, { paymentsApi, walletApi } from "@/lib/api";
import toast from "react-hot-toast";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  paymentsApi: { payFromWallet: vi.fn(), getByBooking: vi.fn() },
  walletApi: { get: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};
const mockedPaymentsApi = paymentsApi as unknown as {
  payFromWallet: ReturnType<typeof vi.fn>;
  getByBooking: ReturnType<typeof vi.fn>;
};
const mockedWalletApi = walletApi as unknown as {
  get: ReturnType<typeof vi.fn>;
};
const mockedToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const BOOKING_ID = "booking-123";

function renderModal(onPaymentSuccess = vi.fn()) {
  render(
    <PaymentModal
      isOpen={true}
      onClose={vi.fn()}
      amount={500}
      description="Test booking"
      bookingId={BOOKING_ID}
      onPaymentSuccess={onPaymentSuccess}
    />,
  );
  return { onPaymentSuccess };
}

beforeEach(() => {
  mockedApi.get.mockReset();
  mockedApi.post.mockReset();
  mockedPaymentsApi.payFromWallet.mockReset();
  mockedPaymentsApi.getByBooking.mockReset();
  mockedWalletApi.get.mockReset();
  mockedToast.success.mockReset();
  mockedToast.error.mockReset();
  delete (window as any).Razorpay;
  delete (window as any).__rzp__;

  // No wallet balance by default — keeps the "pay from wallet" button
  // out of the way for tests that don't care about it.
  mockedWalletApi.get.mockResolvedValue({ data: { data: { balance: 0 } } });
  // /auth/me pre-flight passes by default.
  mockedApi.get.mockImplementation((url: string) => {
    if (url === "/auth/me") return Promise.resolve({ data: {} });
    return Promise.resolve({ data: {} });
  });
});

describe("PaymentModal — already-paid detection", () => {
  it("reports success immediately when the booking is already CAPTURED, without touching Razorpay", async () => {
    const user = userEvent.setup();
    mockedPaymentsApi.getByBooking.mockResolvedValueOnce({
      data: { data: { status: "captured" } },
    });
    const { onPaymentSuccess } = renderModal();

    await user.click(screen.getByRole("button", { name: /^pay ₹/i }));

    await waitFor(() =>
      expect(onPaymentSuccess).toHaveBeenCalledWith("upi"),
    );
    expect(mockedToast.success).toHaveBeenCalledWith(
      expect.stringMatching(/already completed/i),
    );
    // Never reached create-order or opened a Razorpay checkout.
    expect(mockedApi.post).not.toHaveBeenCalledWith(
      "/payments/create-order",
      expect.anything(),
    );
  });

  it("treats create-order's 'Payment already completed' guard as success, not an error", async () => {
    const user = userEvent.setup();
    // Pre-check sees no payment yet (the race hasn't landed when this
    // call fires)...
    mockedPaymentsApi.getByBooking.mockResolvedValueOnce({
      data: { data: null },
    });
    // ...but by the time create-order runs, the webhook already
    // captured it, so the backend's idempotency guard rejects the order.
    mockedApi.post.mockImplementation((url: string) => {
      if (url === "/payments/create-order") {
        return Promise.reject({
          response: { status: 400, data: { message: "Payment already completed" } },
        });
      }
      return Promise.reject(new Error(`unexpected call to ${url}`));
    });
    const { onPaymentSuccess } = renderModal();

    await user.click(screen.getByRole("button", { name: /^pay ₹/i }));

    await waitFor(() =>
      expect(onPaymentSuccess).toHaveBeenCalledWith("upi"),
    );
    expect(mockedToast.success).toHaveBeenCalledWith(
      expect.stringMatching(/already completed/i),
    );
    expect(mockedToast.error).not.toHaveBeenCalled();
  });
});

describe("PaymentModal — verify failure surfaces the backend's specific reason", () => {
  it("shows the backend message from /payments/verify, not a generic Axios error", async () => {
    const user = userEvent.setup();
    mockedPaymentsApi.getByBooking.mockResolvedValueOnce({
      data: { data: null },
    });
    mockedApi.post.mockImplementation((url: string) => {
      if (url === "/payments/create-order") {
        return Promise.resolve({
          data: {
            data: {
              razorpay_key: "rzp_test_key",
              amount: 50000,
              currency: "INR",
              razorpay_order_id: "order_abc",
              booking_id: BOOKING_ID,
            },
          },
        });
      }
      if (url === "/payments/verify") {
        return Promise.reject({
          response: {
            status: 400,
            data: {
              message:
                'Payment is still "authorized" at Razorpay. Please retry in a minute.',
            },
          },
        });
      }
      return Promise.reject(new Error(`unexpected call to ${url}`));
    });

    // Fake Razorpay checkout: synchronously invoke the success handler
    // as soon as .open() is called, simulating a completed checkout
    // that then fails backend verification.
    let capturedOptions: any;
    class FakeRazorpay {
      constructor(options: any) {
        capturedOptions = options;
      }
      on() {}
      open() {
        capturedOptions.handler({
          razorpay_order_id: "order_abc",
          razorpay_payment_id: "pay_abc",
          razorpay_signature: "sig_abc",
        });
      }
    }
    (window as any).Razorpay = FakeRazorpay;

    renderModal();

    await user.click(screen.getByRole("button", { name: /^pay ₹/i }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/still "authorized" at razorpay/i),
      ),
    );
    // Never the generic fallback.
    expect(mockedToast.error).not.toHaveBeenCalledWith(
      "Payment verification failed.",
    );
  });
});
