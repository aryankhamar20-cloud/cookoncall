"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import { IndianRupee, CalendarDays, TrendingUp, BadgeCheck, Wallet, Star } from "lucide-react";

const benefits = [
  {
    title: "Earn ₹15,000–₹50,000/month",
    desc: "Every dish on our platform has a fixed, fair price — no guessing, no undercutting yourself. Just cook great food and watch the earnings come in.",
    icon: <IndianRupee className="w-7 h-7" />,
  },
  {
    title: "Your Schedule, Your Rules",
    desc: "Accept or decline bookings as they come. Work mornings, evenings, weekends — whatever works for you.",
    icon: <CalendarDays className="w-7 h-7" />,
  },
  {
    title: "We Price It. You Profit.",
    desc: "We set a fair, standard price for every dish — rotis, curries, biryani and more. No haggling with customers, no awkward money talk. You cook, we handle the rest.",
    icon: <TrendingUp className="w-7 h-7" />,
  },
  {
    title: "Zero Joining Fees",
    desc: "No fees to join, no deposits, no hidden charges. Start earning from your very first booking on the platform.",
    icon: <BadgeCheck className="w-7 h-7" />,
  },
  {
    title: "Instant UPI Payouts",
    desc: "Get paid directly to your UPI after every completed booking. No waiting, no delays, no weekly cycles.",
    icon: <Wallet className="w-7 h-7" />,
  },
  {
    title: "More Bookings, Less Effort",
    desc: "Fixed prices mean customers decide faster — no back-and-forth, no ghosting. You get consistent bookings without lifting a finger.",
    icon: <Star className="w-7 h-7" />,
  },
];

const joinSteps = [
  { num: 1, title: "Sign Up Free", desc: "Create your account with your phone number. Takes less than 2 minutes." },
  { num: 2, title: "Complete Your Profile", desc: "Add your specialties, cuisines, and experience. We handle pricing — you just tell us what you love to cook." },
  { num: 3, title: "Get Verified", desc: "Upload your FSSAI certificate and ID. We verify within 24 hours." },
  { num: 4, title: "Start Cooking", desc: "Accept bookings and start earning. Your first customer is just a tap away." },
];

export default function ChefPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="pt-[140px] pb-16 px-6 md:px-12 text-center max-w-[800px] mx-auto">
        <div className="inline-flex items-center gap-2 bg-gradient-to-br from-[rgba(212,114,26,0.1)] to-[rgba(212,114,26,0.05)] border border-[rgba(212,114,26,0.2)] px-5 py-2 rounded-full text-[0.82rem] font-semibold text-[var(--orange-500)] tracking-[1px] uppercase mb-8 animate-fade-in-up">
          Now Onboarding Chefs in Ahmedabad
        </div>
        <h1 className="font-display font-[900] text-[clamp(2.5rem,5vw,3.8rem)] leading-[1.08] text-[var(--brown-800)] mb-6 animate-fade-in-up delay-100">
          COOK WHAT YOU LOVE.
          <br />
          <span className="text-[var(--orange-500)]">EARN WHAT YOU DESERVE.</span>
        </h1>
        <p className="text-[1.1rem] text-[var(--text-muted)] max-w-[560px] mx-auto mb-8 leading-[1.7] animate-fade-in-up delay-200">
          Join Ahmedabad&apos;s first home chef platform. No price negotiation,
          no awkward haggling — we set fair prices for every dish so you can
          focus on what you love: cooking. Get paid directly after every
          booking. Zero joining fees.
        </p>
        <Link
          href="/login?tab=signup&role=chef"
          className="group inline-block px-9 py-4 rounded-full bg-[var(--orange-500)] text-white font-bold text-[1.05rem] no-underline shadow-[0_4px_20px_rgba(212,114,26,0.3)] transition-all duration-300 hover:bg-[var(--orange-400)] hover:-translate-y-0.5 animate-fade-in-up delay-300"
        >
          Apply as a Chef — It&apos;s Free{" "}
          <span className="inline-block ml-1.5 transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </section>

      {/* Benefits */}
      <section className="py-[100px] px-6 md:px-12 max-w-[1200px] mx-auto">
        <div className="text-[0.8rem] tracking-[2.5px] uppercase text-[var(--orange-500)] font-bold mb-3">
          Why Join CookOnCall
        </div>
        <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-[var(--brown-800)] mb-14">
          BUILT FOR CHEFS, BY FOODIES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white border-[1.5px] border-[rgba(212,114,26,0.1)] rounded-[20px] px-8 py-10 text-center transition-all duration-300 hover:border-[var(--orange-500)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(212,114,26,0.1)]"
            >
              <div className="w-14 h-14 rounded-2xl bg-[rgba(212,114,26,0.08)] flex items-center justify-center mx-auto mb-5 text-[var(--orange-500)]">
                {b.icon}
              </div>
              <h3 className="font-bold text-[1.15rem] mb-2.5">{b.title}</h3>
              <p className="text-[0.9rem] text-[var(--text-muted)] leading-[1.65]">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Join */}
      <section className="bg-gradient-to-b from-[var(--cream-200)] to-[var(--cream-100)] py-[100px] px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-[0.8rem] tracking-[2.5px] uppercase text-[var(--orange-500)] font-bold mb-3">
            Getting Started
          </div>
          <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-[var(--brown-800)] mb-12">
            HOW TO JOIN IN 4 EASY STEPS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {joinSteps.map((step) => (
              <div
                key={step.num}
                className="bg-white rounded-[20px] px-7 py-9 border border-[rgba(212,114,26,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(26,15,10,0.06)]"
              >
                <div className="w-11 h-11 rounded-full bg-[var(--orange-500)] text-white flex items-center justify-center font-[800] text-[1.1rem] mb-5">
                  {step.num}
                </div>
                <h3 className="font-bold text-[1.05rem] mb-2">{step.title}</h3>
                <p className="text-[0.88rem] text-[var(--text-muted)] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--brown-800)] py-20 px-6 md:px-12 text-center">
        <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-white mb-2">
          READY TO{" "}
          <span className="text-[var(--orange-500)]">START EARNING?</span>
        </h2>
        <p className="text-[rgba(255,255,255,0.65)] text-[1.05rem] mb-9">
          We handle the pricing so you never have to. Just cook, get booked, and get paid — it&apos;s that simple.
        </p>
        <Link
          href="/login?tab=signup&role=chef"
          className="group inline-block px-9 py-4 rounded-full bg-[var(--orange-500)] text-white font-bold text-[1.05rem] no-underline shadow-[0_4px_20px_rgba(212,114,26,0.3)] transition-all duration-300 hover:bg-[var(--orange-400)] hover:-translate-y-0.5"
        >
          Apply as a Chef — Free{" "}
          <span className="inline-block ml-1.5 transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </section>

      <FooterSimple />
      <WhatsAppFAB />
    </>
  );
}