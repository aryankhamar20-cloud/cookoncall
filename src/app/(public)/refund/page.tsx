// src/app/(public)/refund/page.tsx
"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import { APP_CONFIG } from "@/lib/utils";

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream-100)] pt-[100px] pb-16 px-5">
        <div className="max-w-[780px] mx-auto">
          <h1 className="font-display text-[2rem] font-[900] text-[var(--brown-800)] mb-2">
            Cancellation &amp; Refund Policy
          </h1>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-8">
            Last updated: April 2026
          </p>

          <div className="bg-white rounded-[20px] p-7 md:p-10 border border-[rgba(212,114,26,0.06)] space-y-6 text-[0.92rem] leading-[1.7] text-[var(--brown-800)]">
            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">
                1. How Refunds Work
              </h2>
              <p>
                When you cancel a booking, your refund is calculated as a{" "}
                <strong>percentage of the total amount paid</strong> (visit fee + dish
                amount), based on how far in advance you cancel before your scheduled
                slot. The earlier you cancel, the higher your refund. CookOnCall absorbs
                the chef compensation cost from the platform&apos;s share — you never pay
                it on top.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">
                2. Cancellation Refund Tiers
              </h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>24+ hours before slot:</strong> 100% refund. No charge to you,
                  no compensation to chef.
                </li>
                <li>
                  <strong>8–24 hours before slot:</strong> 75% refund. CookOnCall pays
                  the chef ₹25 from the platform&apos;s share for the blocked slot.
                </li>
                <li>
                  <strong>4–8 hours before slot:</strong> 50% refund. CookOnCall pays the
                  chef ₹50.
                </li>
                <li>
                  <strong>2–4 hours before slot:</strong> 25% refund. CookOnCall pays the
                  chef ₹75.
                </li>
                <li>
                  <strong>Less than 2 hours / no-show:</strong> 0% refund. CookOnCall
                  pays the chef ₹100.
                </li>
                <li>
                  <strong>Cancelled by the chef (any time):</strong> 100% refund of the
                  full amount within 3–5 business days. We will also help you book
                  another top-rated chef for the same slot.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">
                3. Ingredient Cost
              </h2>
              <p>
                Ingredients are arranged by the customer. At booking time you can choose
                whether you will provide the ingredients yourself or request the chef to
                bring them at additional cost. If the chef brings ingredients on your
                behalf and the booking is cancelled afterwards, the ingredient cost is
                non-refundable.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">
                4. Refund Process
              </h2>
              <p>
                All refunds are processed back to your <strong>original payment method</strong>{" "}
                (UPI, card, or netbanking) via Razorpay. Refunds typically reach your account
                within <strong>3–5 business days</strong>. We will email you the moment the refund
                is initiated. You can track refund status from the Orders section of your dashboard.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">
                5. No-Show Policy
              </h2>
              <p>
                If the chef does not arrive within 30 minutes of the booked time and does not
                respond to calls, you can mark the booking as a no-show from your dashboard. A
                no-show booking gets a 100% refund (visit fee + dish amount), processed within 3–5
                business days after our team verifies the no-show.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">
                6. Quality Issues
              </h2>
              <p>
                If you are unhappy with the food or service, please raise the complaint within 24
                hours of the booking via WhatsApp or email. Our team will review the case and may
                offer a partial refund, a credit for a future booking, or other resolution at its
                discretion.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">
                7. Contact for Refunds
              </h2>
              <p>
                For any refund queries, reach us at:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  Email:{" "}
                  <a
                    href="mailto:support@thecookoncall.com"
                    className="text-[var(--orange-500)] no-underline hover:underline"
                  >
                    support@thecookoncall.com
                  </a>
                </li>
                <li>
                  WhatsApp:{" "}
                  <a
                    href={APP_CONFIG.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--orange-500)] no-underline hover:underline"
                  >
                    +91 90814 44326
                  </a>{" "}
                  (9 AM – 9 PM)
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-[0.9rem] text-[var(--orange-500)] no-underline hover:underline"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
      <FooterSimple />
      <WhatsAppFAB />
    </>
  );
}
