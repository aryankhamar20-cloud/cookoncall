"use client";

import { useState } from "react";
import { Mail, MessageCircle, ChevronDown, Phone } from "lucide-react";

const FAQS = [
  {
    q: "How does chef verification work?",
    a: "Every chef on CookOnCall submits Aadhaar and PAN documents. We manually review each one. Only verified chefs appear in search results. Chefs with FSSAI food-safety certification show an extra badge.",
  },
  {
    q: "What if I need to cancel my booking?",
    a: "You can cancel any booking from 'My Bookings'. Refund amounts depend on how close to the session time you cancel — the exact refund is shown before you confirm cancellation.",
  },
  {
    q: "How does payment work?",
    a: "We support UPI, cards, netbanking, and Cash on Delivery. Online payments are held securely and released to the chef only after your session is completed.",
  },
  {
    q: "The chef hasn't arrived — what do I do?",
    a: "Call the chef directly from the booking detail screen. If they're unreachable, reach out to our support on WhatsApp and we'll help immediately.",
  },
  {
    q: "How is the final bill calculated?",
    a: "Bill = ₹49 visit fee + dish prices (from the chef's menu you pick) + 2.5% convenience fee. You see the full breakdown before payment — no surprises.",
  },
];

const SUPPORT = {
  whatsapp: "+919081444326",
  email: "support@thecookoncall.com",
  phone: "+919081444326",
};

export default function HelpSupportPanel() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const waUrl = `https://wa.me/${SUPPORT.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    "Hi CookOnCall, I need help with my account.",
  )}`;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Contact row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-[16px] p-4 border border-[rgba(212,114,26,0.06)] text-center hover:-translate-y-0.5 transition-transform no-underline"
        >
          <div className="w-11 h-11 rounded-full bg-[var(--green-ok)]/10 text-[var(--green-ok)] flex items-center justify-center mx-auto mb-2">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="font-semibold text-[0.88rem] text-[var(--brown-800)]">
            Chat on WhatsApp
          </div>
          <div className="text-[0.72rem] text-[var(--text-muted)] mt-0.5">
            Fastest response
          </div>
        </a>

        <a
          href={`tel:${SUPPORT.phone}`}
          className="bg-white rounded-[16px] p-4 border border-[rgba(212,114,26,0.06)] text-center hover:-translate-y-0.5 transition-transform no-underline"
        >
          <div className="w-11 h-11 rounded-full bg-[rgba(212,114,26,0.1)] text-[var(--orange-500)] flex items-center justify-center mx-auto mb-2">
            <Phone className="w-5 h-5" />
          </div>
          <div className="font-semibold text-[0.88rem] text-[var(--brown-800)]">
            Call us
          </div>
          <div className="text-[0.72rem] text-[var(--text-muted)] mt-0.5">
            10 AM – 10 PM
          </div>
        </a>

        <a
          href={`mailto:${SUPPORT.email}`}
          className="bg-white rounded-[16px] p-4 border border-[rgba(212,114,26,0.06)] text-center hover:-translate-y-0.5 transition-transform no-underline"
        >
          <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <Mail className="w-5 h-5" />
          </div>
          <div className="font-semibold text-[0.88rem] text-[var(--brown-800)]">
            Email support
          </div>
          <div className="text-[0.72rem] text-[var(--text-muted)] mt-0.5 truncate">
            {SUPPORT.email}
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-[20px] p-5 md:p-6 border border-[rgba(212,114,26,0.06)]">
        <div className="font-display text-[1.2rem] font-[900] text-[var(--brown-800)] mb-3">
          Frequently asked
        </div>
        <div className="divide-y divide-[rgba(212,114,26,0.08)]">
          {FAQS.map((f, i) => {
            const open = openIdx === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between gap-3 py-3.5 text-left bg-transparent border-none cursor-pointer"
                >
                  <span className="font-semibold text-[0.9rem] text-[var(--brown-800)]">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--orange-500)] shrink-0 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <p className="text-[0.85rem] text-[var(--text-muted)] leading-relaxed pb-4 pr-6">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}