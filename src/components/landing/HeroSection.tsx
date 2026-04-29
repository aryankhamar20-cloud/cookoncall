// src/components/landing/HeroSection.tsx
"use client";

import Link from "next/link";
import { Check, Rocket } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="pt-[140px] pb-20 px-6 md:px-12 flex flex-col lg:flex-row items-center justify-between max-w-[1280px] mx-auto gap-12 lg:gap-[60px] min-h-[90vh]">
      {/* Content */}
      <div className="flex-1 max-w-[560px]">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 bg-gradient-to-br from-[rgba(212,114,26,0.1)] to-[rgba(212,114,26,0.05)] border border-[rgba(212,114,26,0.2)] px-5 py-2 rounded-full text-[0.82rem] font-semibold text-[var(--orange-500)] tracking-[1px] uppercase mb-8">
          <Rocket className="w-4 h-4" />
          Now Live in Ahmedabad
        </div>

        {/* Title */}
        <h1 className="animate-fade-in-up delay-100 font-display font-[900] text-[clamp(2.6rem,5vw,4.2rem)] leading-[1.08] text-[var(--brown-800)] mb-2">
          FRESH HOME-COOKED MEALS,
          <br />
          <span className="text-[var(--orange-500)]">STARTING AT ₹49.</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up delay-200 text-[1.08rem] text-[var(--text-muted)] my-6 max-w-[480px] leading-[1.7]">
          Verified home chefs cook in your kitchen, You keep ingredients ready — chef brings skills and tools. Starting in Ahmedabad,
          expanding across Gujarat city by city.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up delay-300 flex flex-wrap gap-3 items-center mb-8">
          <Link
            href="/login?tab=signup"
            className="group px-8 py-3.5 rounded-full bg-[var(--orange-500)] text-white font-bold text-[1rem] no-underline shadow-[0_4px_20px_rgba(212,114,26,0.3)] transition-all duration-300 hover:bg-[var(--orange-400)] hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(212,114,26,0.4)] inline-block"
          >
            Book a Chef from ₹49{" "}
            <span className="inline-block ml-1.5 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href="/about"
            className="px-6 py-3.5 rounded-full border border-[var(--orange-500)] text-[var(--orange-500)] font-semibold text-[1rem] no-underline hover:bg-[rgba(212,114,26,0.06)] transition-all"
          >
            How it works
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="animate-fade-in-up delay-400 flex gap-5 flex-wrap mb-6">
          {["Aadhaar verified chefs", "Secure UPI Payments", "Pay after chef accepts"].map(
            (badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 text-[0.85rem] font-medium text-[var(--text-muted)]"
              >
                <Check className="w-[18px] h-[18px] text-[var(--green-ok)] shrink-0" />
                {badge}
              </div>
            ),
          )}
        </div>

        {/* App coming soon mini-row */}
        <div className="animate-fade-in-up delay-400 flex items-center gap-3 flex-wrap">
          <span className="text-[0.78rem] uppercase tracking-[1px] text-[var(--text-muted)] font-semibold">
            Mobile app coming soon
          </span>
          <div className="flex gap-2">
            <MiniBadge platform="play" />
            <MiniBadge platform="app" />
          </div>
        </div>
      </div>

      {/* Visual Illustration */}
      <div className="hidden lg:flex flex-1 max-w-[520px] items-center justify-center relative animate-fade-in-up delay-200">
        <div className="w-[420px] h-[420px] bg-[radial-gradient(circle,rgba(212,114,26,0.12)_0%,rgba(212,114,26,0.03)_70%,transparent_100%)] rounded-full relative flex items-center justify-center">
          {/* Dashed ring */}
          <div className="absolute w-[360px] h-[360px] border-2 border-dashed border-[rgba(212,114,26,0.15)] rounded-full animate-spin-slow" />

          {/* Cloche Icon */}
          <svg className="w-[140px] h-[140px]" viewBox="0 0 120 120" fill="none">
            <ellipse cx="60" cy="95" rx="52" ry="6" fill="rgba(212,114,26,0.1)" />
            <rect x="12" y="82" rx="4" width="96" height="10" fill="#D4721A" />
            <path
              d="M20 82C20 52 36 28 60 28C84 28 100 52 100 82"
              stroke="#D4721A"
              strokeWidth="4"
              fill="none"
            />
            <circle cx="60" cy="24" r="5" fill="#D4721A" />
            <line x1="60" y1="28" x2="60" y2="20" stroke="#D4721A" strokeWidth="3" />
          </svg>

          {/* Floating Badges — honest, no fake stats */}
          <div className="absolute top-[60px] -right-2.5 bg-white px-[18px] py-2.5 rounded-[14px] shadow-[0_4px_24px_rgba(26,15,10,0.08)] flex items-center gap-2 text-[0.88rem] font-semibold whitespace-nowrap animate-float">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green-ok)]" />
            Cooked in your kitchen
          </div>

          <div className="absolute bottom-[100px] -left-5 bg-white px-[18px] py-2.5 rounded-[14px] shadow-[0_4px_24px_rgba(26,15,10,0.08)] flex items-center gap-2 text-[0.88rem] font-semibold whitespace-nowrap animate-float delay-1500">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#D4721A" strokeWidth="2" />
              <path d="M10 5v5l3.5 2" stroke="#D4721A" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Book in 2 mins
          </div>

          <div className="absolute bottom-[30px] right-2.5 bg-white px-[18px] py-2.5 rounded-[14px] shadow-[0_4px_24px_rgba(26,15,10,0.08)] flex items-center gap-2 text-[0.88rem] font-semibold whitespace-nowrap animate-float delay-3000">
            <span className="text-[var(--orange-500)]">₹49</span>
            Visit fee · transparent pricing
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniBadge({ platform }: { platform: "play" | "app" }) {
  const isPlay = platform === "play";
  return (
    <div
      className="inline-flex items-center gap-1.5 bg-[var(--brown-800)] text-white px-2.5 py-1.5 rounded-[7px] cursor-default select-none opacity-90"
      title="Coming soon"
    >
      {isPlay ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.6 1.4c-.3.3-.5.7-.5 1.2v18.8c0 .5.2.9.5 1.2l11-11-11-10.2zm12.5 11.7l2.7 2.6-13.2 7.7 10.5-10.3zm0-2.2L5.6.7l13.2 7.6-2.7 2.6zm5 .9l-2.5-1.4-2.9 2.7 2.9 2.8 2.6-1.5c.8-.5.8-1.7-.1-2.6z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 12.04c-.03-3 2.45-4.45 2.56-4.52-1.4-2.04-3.57-2.32-4.34-2.35-1.85-.19-3.61 1.09-4.55 1.09-.94 0-2.39-1.07-3.93-1.04-2.02.03-3.88 1.17-4.92 2.97-2.1 3.64-.54 9.02 1.51 11.97 1 1.45 2.18 3.07 3.73 3.01 1.5-.06 2.07-.97 3.88-.97 1.81 0 2.32.97 3.91.94 1.62-.03 2.64-1.46 3.62-2.92 1.14-1.67 1.61-3.29 1.64-3.37-.04-.02-3.13-1.21-3.16-4.79zM14.39 3.3c.83-1.01 1.39-2.42 1.24-3.82-1.2.05-2.66.8-3.52 1.81-.77.89-1.45 2.32-1.27 3.7 1.34.1 2.71-.69 3.55-1.69z" />
        </svg>
      )}
      <span className="text-[0.7rem] font-semibold">{isPlay ? "Play" : "App Store"}</span>
    </div>
  );
}
