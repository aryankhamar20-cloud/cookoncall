// src/app/(public)/pricing/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import { cn } from "@/lib/utils";


const faqs = [
  {
    q: "Are ingredients included in the price?",
    a: "No. You arrange ingredients yourself — the chef sends a shopping list 2 hours before the session so you know exactly what to keep ready. This is our HYBRID model: chef brings skills, tools, and expertise; you provide fresh ingredients at actual market cost. No markup, no surprises.",
  },
  {
    q: "Is the visit fee refundable?",
    a: "If the chef declines the booking, the full visit fee is refunded within 3–5 business days. Once a chef confirms, the visit fee is non-refundable since it covers their travel time and commitment.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes. Cancel 24+ hours before the slot for a 100% refund. 8–24 hours before: 75% refund. 4–8 hours before: 50% refund. 2–4 hours before: 25% refund. Under 2 hours: no refund. If the chef cancels, you always get 100% back.",
  },
  {
    q: "How do I pay?",
    a: "All payments are handled securely via Razorpay — UPI, debit/credit cards, and net-banking are supported. Payment is only requested after the chef accepts your booking. We do not store your card details.",
  },
  {
    q: "Where do chefs serve?",
    a: "Each chef chooses the specific areas in Ahmedabad they serve (e.g. Bodakdev, Thaltej, Naroda). When you set your address area, you'll only see chefs who serve it. If your area isn't listed, you can request it — admins review within 24 hours. We're live in Ahmedabad and expanding city-by-city across Gujarat.",
  },
  {
    q: "What if the chef doesn't show up?",
    a: "If the chef is more than 30 minutes late and doesn't respond, mark it as a no-show in the Orders section. After verification, we issue a 100% refund within 3–5 business days.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream-100)] pt-[100px] pb-16 px-5">
        <div className="max-w-[960px] mx-auto">
          {/* Header */}
          <h1 className="font-display text-[2rem] md:text-[2.4rem] font-[900] text-[var(--brown-800)] mb-2 text-center">
            Simple, transparent pricing
          </h1>
          <p className="text-[1rem] text-[var(--text-muted)] mb-10 text-center max-w-[640px] mx-auto">
            No subscriptions, no surprises. You pay a per-area visit fee set by the chef,
            chef-set dish prices, a small convenience fee, and arrange ingredients yourself
            at actual market cost.
          </p>

          {/* How pricing works */}
          <section className="bg-white rounded-[20px] p-7 md:p-9 border border-[rgba(212,114,26,0.06)] mb-8">
            <h2 className="font-display font-[800] text-[1.3rem] text-[var(--brown-800)] mb-5">
              How pricing works
            </h2>

            <div className="space-y-4">
              <PriceLine
                amount="₹49–₹79"
                title="Visit fee (per area, every booking)"
                body="Each chef picks the areas they serve and sets ₹49 or ₹79 per area based on travel time. You'll see the exact fee on the chef's profile and at the booking step. Charged once per booking, not per dish."
              />
              <PriceLine
                amount="+ Dish prices"
                title="Set by each chef"
                body="Every chef sets their own menu prices. You see the full price breakdown before confirming — no hidden charges, no negotiation needed."
              />
              <PriceLine
                amount="+ 2.5%"
                title="Convenience fee"
                body="Platform cost — covers payments, support, and verification. Shown clearly in your order summary before you pay."
              />
              <PriceLine
                amount="+ Ingredients"
                title="You arrange at actual market cost"
                body="Chef sends you a shopping list 2 hours before the session. You keep ingredients ready at home. Chef brings all tools and expertise. This keeps your food fresh and cost fully transparent."
              />
            </div>
          </section>

          {/* Worked example */}
          <section className="bg-gradient-to-br from-[rgba(212,114,26,0.05)] to-[rgba(212,114,26,0.02)] rounded-[20px] p-7 md:p-9 border border-[rgba(212,114,26,0.15)] mb-8">
            <h2 className="font-display font-[800] text-[1.3rem] text-[var(--brown-800)] mb-2">
              How a typical bill looks
            </h2>
            <p className="text-[0.9rem] text-[var(--text-muted)] mb-4">
              Each chef sets their own dish prices. Here's what your final bill structure looks like.
            </p>

            <div className="bg-white rounded-[14px] p-5 space-y-2 text-[0.92rem]">
              <Row label="Selected dishes (set by chef)" value="₹X" />
              <Row label="Visit fee (₹49 or ₹79 — set by chef per area)" value="₹49 / ₹79" />
              <Row label="Convenience fee (2.5% of dishes)" value="₹X × 0.025" />
              <div className="border-t border-[var(--cream-300)] my-2" />
              <Row label="Total payable online" value="Sum of above" bold />
              <p className="text-[0.78rem] text-[var(--text-muted)] pt-1">
                + Ingredients at actual market cost (you arrange, chef sends shopping list 2h before).
              </p>
            </div>
          </section>

          {/* For chefs */}
          <section className="bg-[var(--brown-800)] rounded-[20px] p-7 md:p-9 mb-8 text-white">
            <h2 className="font-display font-[800] text-[1.3rem] mb-3">For chefs</h2>
            <ul className="space-y-2.5 text-[0.95rem] text-[rgba(255,255,255,0.85)]">
              {[
                "Keep 97.5% of every booking — we only take a 2.5% platform fee.",
                "Set your own menu prices and availability. Cook what you love, when you want.",
                "Payouts within 24 hours of booking completion, directly to your UPI.",
                "Free Aadhaar + FSSAI verification. No joining fee, no monthly charge.",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-[var(--orange-400)] shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login?tab=signup&role=chef"
              className="inline-block mt-5 px-6 py-3 rounded-[10px] bg-[var(--orange-500)] text-white font-semibold no-underline hover:bg-[var(--orange-400)] active:scale-[0.98] transition-all"
            >
              Apply as a chef →
            </Link>
          </section>

          {/* FAQ */}
          <section id="faq" className="bg-white rounded-[20px] p-7 md:p-9 border border-[rgba(212,114,26,0.06)]">
            <h2 className="font-display font-[800] text-[1.3rem] text-[var(--brown-800)] mb-5">
              Frequently asked
            </h2>
            <div className="divide-y divide-[var(--cream-200)]">
              {faqs.map((faq, i) => (
                <div key={i} className="py-3">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between text-left gap-4"
                  >
                    <span className="text-[0.95rem] font-semibold text-[var(--brown-800)]">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-[var(--orange-500)] shrink-0 transition-transform",
                        openFaq === i && "rotate-180",
                      )}
                    />
                  </button>
                  {openFaq === i && (
                    <p className="mt-2 text-[0.9rem] text-[var(--text-muted)] leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link
              href="/login?tab=signup"
              className="inline-block px-8 py-3.5 rounded-full bg-[var(--orange-500)] text-white font-bold text-[1rem] no-underline shadow-[0_4px_20px_rgba(212,114,26,0.3)] hover:bg-[var(--orange-400)] hover:-translate-y-0.5 transition-all"
            >
              Book a chef from ₹49 →
            </Link>
            <p className="text-[0.82rem] text-[var(--text-muted)] mt-3">
              Currently serving Ahmedabad · expanding across Gujarat soon
            </p>
          </div>
        </div>
      </main>
      <FooterSimple />
      <WhatsAppFAB />
    </>
  );
}

function PriceLine({ amount, title, body }: { amount: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 w-[110px] font-display font-[800] text-[1.15rem] text-[var(--orange-500)]">
        {amount}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-[0.95rem] text-[var(--brown-800)]">{title}</div>
        <div className="text-[0.85rem] text-[var(--text-muted)] leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center", bold && "text-[1.05rem]")}>
      <span className={cn(bold && "font-semibold text-[var(--brown-800)]")}>{label}</span>
      <span className={cn(bold ? "font-display font-[800] text-[var(--orange-500)]" : "font-medium text-[var(--brown-800)]")}>
        {value}
      </span>
    </div>
  );
}