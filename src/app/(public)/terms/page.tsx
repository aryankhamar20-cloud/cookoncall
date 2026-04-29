"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream-100)] pt-[100px] pb-16 px-5">
        <div className="max-w-[780px] mx-auto">
          <h1 className="font-display text-[2rem] font-[900] text-[var(--brown-800)] mb-2">
            Terms of Service
          </h1>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-8">
            Last updated: April 2026
          </p>

          <div className="bg-white rounded-[20px] p-7 md:p-10 border border-[rgba(212,114,26,0.06)] space-y-6 text-[0.92rem] leading-[1.7] text-[var(--brown-800)]">
            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">1. About CookOnCall</h2>
              <p>
                CookOnCall is a home chef marketplace platform operated in Ahmedabad, Gujarat, India.
                We connect customers who want freshly cooked meals at their home with verified home chefs
                ("Cook Partners"). CookOnCall acts as an intermediary platform — we are not a restaurant,
                catering company, or food delivery service.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">2. Eligibility</h2>
              <p>
                You must be at least 18 years of age to use CookOnCall as a customer or cook.
                By registering, you confirm that the information you provide is accurate and complete.
                CookOnCall reserves the right to suspend or terminate accounts that provide false information.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">3. For Customers</h2>
              <p className="mb-2">
                <strong>Booking:</strong> When you book a chef through CookOnCall, you are entering into an
                agreement for the chef to visit your home and cook. You must provide a valid address,
                contact number, and be present (or have someone present) at the scheduled time.
              </p>
              <p className="mb-2">
                <strong>Payment:</strong> All payments are processed through Razorpay. Each booking includes:
                (a) a flat ₹49 visit fee charged by CookOnCall, (b) dish prices as listed on the platform
                menu (set by CookOnCall), and (c) a 2.5% convenience fee on the total. The full breakdown
                is shown before you confirm the booking.
              </p>
              <p className="mb-2">
                <strong>Cancellation Policy:</strong> If you cancel 2 or more hours before your scheduled
                slot, you receive an 80% refund on dish charges. The ₹49 visit fee is non-refundable once
                the chef has confirmed the booking. Cancellations within 2 hours of the scheduled time
                are non-refundable. Chef cancellation results in a full refund (including visit fee).
              </p>
              <p>
                <strong>Cooking Session:</strong> The chef will use an OTP-based system to start and end
                the cooking session. You will receive an OTP on your registered email when the chef
                starts and ends cooking — please share these codes with the chef to verify the session.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">4. For Cook Partners</h2>
              <p className="mb-2">
                <strong>Verification:</strong> All chefs must complete identity verification (Aadhaar card,
                PAN card, profile photo, emergency contact) before they can accept bookings. CookOnCall
                reserves the right to approve or reject verification submissions.
              </p>
              <p className="mb-2">
                <strong>Earnings:</strong> Chefs receive 97.5% of all dish revenue they cook. The remaining
                2.5% is retained by CookOnCall as a transaction fee. The ₹49 visit fee and the customer-side
                2.5% convenience fee are retained by the platform and are not shared with chefs. Payouts are
                settled to the chef&apos;s registered bank account on a rolling basis.
              </p>
              <p className="mb-2">
                <strong>Pricing:</strong> All dish prices on the platform are set by CookOnCall. Chefs do
                not set or negotiate their own rates — a fixed, fair price is assigned to every dish to
                ensure consistency and transparency for customers.
              </p>
              <p className="mb-2">
                <strong>Conduct:</strong> Chefs must arrive on time, maintain hygiene standards, and
                behave professionally. CookOnCall may suspend or remove chefs who receive repeated
                negative reviews or complaints.
              </p>
              <p>
                <strong>FSSAI:</strong> While not mandatory at launch, chefs with valid FSSAI certification
                receive a &quot;Preferred&quot; badge on their profile.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">5. Platform Rules</h2>
              <p className="mb-2">
                You agree not to use CookOnCall for any unlawful purpose, to harass other users,
                or to circumvent the platform (e.g., arranging bookings directly with chefs to avoid
                the platform fee).
              </p>
              <p>
                CookOnCall reserves the right to modify these terms at any time. Continued use of the
                platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">6. Liability</h2>
              <p>
                CookOnCall is a marketplace platform and does not directly employ the chefs.
                We are not liable for any injury, illness, damage, or loss arising from a chef&apos;s
                visit to your home. We facilitate the connection and provide verification tools,
                but the cooking service is provided by independent cook partners.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">7. Contact</h2>
              <p>
                For questions about these terms, contact us via WhatsApp or email at{" "}
                <a href="mailto:support@thecookoncall.com" className="text-[var(--orange-500)] no-underline hover:underline">
                  support@thecookoncall.com
                </a>.
              </p>
            </section>
          </div>

          <div className="text-center mt-8">
            <Link href="/" className="text-[var(--orange-500)] text-[0.9rem] font-semibold no-underline hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
      <FooterSimple />
    </>
  );
}