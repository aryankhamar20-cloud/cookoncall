"use client";

import { useState } from "react";

/**
 * Homepage FAQ.
 *
 * IMPORTANT: these five Q&A pairs must stay in sync with `faqSchema` in
 * src/app/layout.tsx. That schema emits FAQPage structured data, and
 * Google requires the marked-up questions/answers to be visible on the
 * page — otherwise the markup is a guideline violation and can trigger a
 * structured-data manual action. Edit both together.
 */
const faqs = [
  {
    q: "How much does a home chef cost in Ahmedabad?",
    a: "Home chefs in Ahmedabad typically charge ₹600–₹900 for a family of 4. This includes a visit fee (₹49–₹79 based on distance) and a 2.5% convenience fee. You provide the ingredients or the chef brings them as an optional add-on.",
  },
  {
    q: "How do I book a home chef on CookOnCall?",
    a: "Browse verified chefs at thecookoncall.com/chef, select a chef, choose your date and menu, and pay online via Razorpay. The chef comes to your home and cooks fresh in your kitchen. Booking takes under 2 minutes.",
  },
  {
    q: "Are the home chefs on CookOnCall verified?",
    a: "Yes. Every chef on CookOnCall goes through identity verification (Aadhaar + PAN), FSSAI food safety check, and is personally reviewed by our admin team before being listed.",
  },
  {
    q: "What cuisines can I get cooked at home in Ahmedabad?",
    a: "CookOnCall chefs in Ahmedabad specialize in Gujarati, Punjabi, South Indian, Continental, and Chinese cuisines. You can filter by cuisine on our chef listing page.",
  },
  {
    q: "Can I cancel a home chef booking?",
    a: "Yes. You get 100% refund if you cancel 24+ hours before. 75% for 8+ hours, 50% for 4+ hours, 25% for 2+ hours. Under 2 hours — no refund. Chef-initiated cancellations always get 100% refund.",
  },
];

export default function FaqSection() {
  // First question open by default so the section never looks empty.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      className="py-[100px] px-6 md:px-12 max-w-[860px] mx-auto"
      id="faq"
      aria-labelledby="faq-heading"
    >
      <div className="text-[0.8rem] tracking-[2.5px] uppercase text-[var(--orange-500)] font-bold mb-3">
        Questions
      </div>
      <h2
        id="faq-heading"
        className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-[var(--brown-800)] mb-3"
      >
        FREQUENTLY ASKED QUESTIONS
      </h2>
      <p className="text-[1.05rem] text-[var(--text-muted)] max-w-[560px] mb-12 leading-[1.7]">
        Everything you need to know before booking your first home chef.
      </p>

      <div className="space-y-3">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.08)] overflow-hidden transition-shadow duration-300 hover:shadow-[0_8px_28px_rgba(26,15,10,0.06)]"
            >
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 cursor-pointer"
                >
                  <span className="font-bold text-[1rem] text-[var(--brown-800)]">
                    {item.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-7 h-7 rounded-full bg-[rgba(212,114,26,0.08)] text-[var(--orange-500)] flex items-center justify-center text-[1.1rem] font-bold transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
              </h3>
              {/* Always rendered (grid-rows animation) so the answer text is
                  present in the DOM for crawlers even while collapsed. */}
              <div
                id={`faq-answer-${i}`}
                className={`grid transition-all duration-300 ease-out ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-[0.94rem] text-[var(--text-muted)] leading-[1.75]">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
