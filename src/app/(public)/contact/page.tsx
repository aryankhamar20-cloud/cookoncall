// src/app/(public)/contact/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import { APP_CONFIG } from "@/lib/utils";
import { Mail, Phone, MapPin, Clock, ChefHat } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    // Frontend-only fallback for launch day: open WhatsApp with the prefilled message.
    // A backend /contact endpoint can be wired in Batch B.
    const text = encodeURIComponent(
      `Hi CookOnCall,\n\nName: ${name}\nEmail: ${email}\n\n${message}`,
    );
    window.open(`https://wa.me/${APP_CONFIG.whatsappNumber}?text=${text}`, "_blank");
    toast.success("Opening WhatsApp — we will reply within 2 hours");
    setName("");
    setEmail("");
    setMessage("");
    setSubmitting(false);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream-100)] pt-[100px] pb-16 px-5">
        <div className="max-w-[1000px] mx-auto">
          <h1 className="font-display text-[2rem] font-[900] text-[var(--brown-800)] mb-2">
            Contact Us
          </h1>
          <p className="text-[0.95rem] text-[var(--text-muted)] mb-8 max-w-[640px]">
            Questions, feedback, or want to onboard as a chef? Reach us through any of the channels
            below — we usually reply within 2 hours between 9 AM and 9 PM.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact details */}
            <div className="bg-white rounded-[20px] p-7 border border-[rgba(212,114,26,0.06)] space-y-5">
              <h2 className="font-display font-[800] text-[1.2rem] text-[var(--brown-800)]">
                Reach Us
              </h2>

              <ContactRow
                icon={<Mail className="w-5 h-5 text-[var(--orange-500)]" />}
                label="General support"
                value="support@thecookoncall.com"
                href="mailto:support@thecookoncall.com"
              />

              <ContactRow
                icon={<Mail className="w-5 h-5 text-[var(--orange-500)]" />}
                label="Admin / partnerships"
                value="admin@thecookoncall.com"
                href="mailto:admin@thecookoncall.com"
              />

              <ContactRow
                icon={<Phone className="w-5 h-5 text-[var(--orange-500)]" />}
                label="WhatsApp"
                value="+91 90814 44326"
                href={APP_CONFIG.whatsappUrl}
                external
              />

              <ContactRow
                icon={<ChefHat className="w-5 h-5 text-[var(--orange-500)]" />}
                label="Want to cook with us?"
                value="Apply as a chef →"
                href="/login?tab=signup&role=chef"
              />

              <ContactRow
                icon={<MapPin className="w-5 h-5 text-[var(--orange-500)]" />}
                label="Operating from"
                value="Ahmedabad, Gujarat — expanding across Gujarat soon"
              />

              <ContactRow
                icon={<Clock className="w-5 h-5 text-[var(--orange-500)]" />}
                label="Response time"
                value="Within 2 hours · 9 AM – 9 PM IST"
              />

              <div className="pt-4 border-t border-[rgba(212,114,26,0.08)] text-[0.85rem] text-[var(--text-muted)]">
                Founders: {APP_CONFIG.founders}
              </div>
            </div>

            {/* Contact form */}
            <div className="bg-white rounded-[20px] p-7 border border-[rgba(212,114,26,0.06)]">
              <h2 className="font-display font-[800] text-[1.2rem] text-[var(--brown-800)] mb-1">
                Send us a message
              </h2>
              <p className="text-[0.85rem] text-[var(--text-muted)] mb-5">
                Drop your message and we&apos;ll continue the conversation on WhatsApp.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[0.82rem] font-semibold text-[var(--brown-800)] mb-1.5">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ravi Patel"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[var(--cream-300)] bg-white text-[0.95rem] focus:outline-none focus:border-[var(--orange-500)] focus:ring-[3px] focus:ring-[rgba(212,114,26,0.12)]"
                  />
                </div>

                <div>
                  <label className="block text-[0.82rem] font-semibold text-[var(--brown-800)] mb-1.5">
                    Your email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[var(--cream-300)] bg-white text-[0.95rem] focus:outline-none focus:border-[var(--orange-500)] focus:ring-[3px] focus:ring-[rgba(212,114,26,0.12)]"
                  />
                </div>

                <div>
                  <label className="block text-[0.82rem] font-semibold text-[var(--brown-800)] mb-1.5">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="How can we help?"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[var(--cream-300)] bg-white text-[0.95rem] focus:outline-none focus:border-[var(--orange-500)] focus:ring-[3px] focus:ring-[rgba(212,114,26,0.12)] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-[10px] bg-[var(--orange-500)] text-white font-semibold text-[0.95rem] hover:bg-[var(--orange-400)] active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send message"}
                </button>
              </form>
            </div>
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

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const inner = (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-[0.78rem] uppercase tracking-[0.5px] text-[var(--text-muted)] font-semibold">
          {label}
        </div>
        <div className="text-[0.95rem] text-[var(--brown-800)] font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );

  if (!href) return inner;

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block no-underline hover:opacity-80">
      {inner}
    </a>
  ) : (
    <Link href={href} className="block no-underline hover:opacity-80">
      {inner}
    </Link>
  );
}
