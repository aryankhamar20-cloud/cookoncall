"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream-100)] pt-[100px] pb-16 px-5">
        <div className="max-w-[780px] mx-auto">
          <h1 className="font-display text-[2rem] font-[900] text-[var(--brown-800)] mb-2">
            Privacy Policy
          </h1>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-8">
            Last updated: April 2026
          </p>

          <div className="bg-white rounded-[20px] p-7 md:p-10 border border-[rgba(212,114,26,0.06)] space-y-6 text-[0.92rem] leading-[1.7] text-[var(--brown-800)]">
            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">1. Information We Collect</h2>
              <p className="mb-2">
                <strong>Account Information:</strong> When you register, we collect your name, email address,
                phone number, and password. Chefs also provide identity documents (Aadhaar, PAN),
                emergency contact details, and profile photos.
              </p>
              <p className="mb-2">
                <strong>Booking Information:</strong> We collect your address, preferred dates and times,
                dish preferences, and special dietary requirements when you make a booking.
              </p>
              <p>
                <strong>Payment Information:</strong> Payments are processed securely through Razorpay.
                CookOnCall does not store your credit card or bank account details. Razorpay&apos;s
                privacy policy governs the handling of payment data.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">2. How We Use Your Information</h2>
              <p>
                We use your information to operate the platform, process bookings, send OTP codes for
                session verification, send booking confirmations and notifications via email (through Brevo),
                verify chef identities, display chef profiles and reviews to customers, and improve the platform.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">3. Information Sharing</h2>
              <p className="mb-2">
                <strong>Between Users:</strong> When a booking is confirmed, your name, phone number,
                and address are shared with the assigned chef so they can reach your location.
                The chef&apos;s name, cuisines, rating, and profile photo are visible to customers.
              </p>
              <p>
                <strong>Third Parties:</strong> We share data with Razorpay (payments), Cloudinary (image storage),
                Brevo (email delivery), and Supabase (database). We do not sell your personal information
                to advertisers or other third parties.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">4. Chef Identity Documents</h2>
              <p>
                Aadhaar and PAN documents uploaded by chefs are stored securely on Cloudinary and are only
                accessible to CookOnCall administrators for verification purposes. These documents are not
                shared with customers or any third party.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">5. Data Security</h2>
              <p>
                We use HTTPS encryption, JWT-based authentication, and bcrypt password hashing to protect
                your data. However, no system is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">6. Your Rights</h2>
              <p>
                You can update your profile information at any time from your dashboard.
                To request deletion of your account and associated data, contact us at{" "}
                <a href="mailto:support@thecookoncall.com" className="text-[var(--orange-500)] no-underline hover:underline">
                  support@thecookoncall.com
                </a>.
                We will process deletion requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">7. Cookies</h2>
              <p>
                CookOnCall uses cookies to store your authentication token and session preferences.
                These are essential cookies required for the platform to function. We do not use
                third-party tracking or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="font-display font-[800] text-[1.15rem] mb-2">8. Contact</h2>
              <p>
                For privacy-related questions, contact us via WhatsApp or email at{" "}
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
