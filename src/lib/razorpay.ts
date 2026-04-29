declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

/** Load Razorpay script dynamically */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface InitiatePaymentParams {
  orderId: string;
  amount: number; // in paise (₹200 = 20000)
  description: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  onSuccess: (response: RazorpayResponse) => void;
  onDismiss?: () => void;
}

/** Open Razorpay checkout */
export async function initiatePayment({
  orderId,
  amount,
  description,
  userName,
  userEmail,
  userPhone,
  onSuccess,
  onDismiss,
}: InitiatePaymentParams): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("Failed to load Razorpay. Check your internet connection.");
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error("Razorpay key not configured.");
  }

  const options: RazorpayOptions = {
    key: keyId,
    amount,
    currency: "INR",
    name: "CookOnCall",
    description,
    order_id: orderId,
    handler: onSuccess,
    prefill: {
      name: userName,
      email: userEmail,
      contact: userPhone,
    },
    theme: {
      color: "#D4721A",
    },
    modal: {
      ondismiss: onDismiss,
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.on("payment.failed", (response: unknown) => {
    console.error("Razorpay payment failed:", response);
  });
  razorpay.open();
}
