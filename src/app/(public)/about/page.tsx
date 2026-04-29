// src/app/(public)/about/page.tsx
"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import { ChefHat, ShieldCheck, Star, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--cream-100)] pt-[100px] pb-16 px-5">
        <div className="max-w-[860px] mx-auto">
          {/* Hero */}
          <h1 className="font-display text-[2.2rem] md:text-[2.6rem] font-[900] text-[var(--brown-800)] mb-3 leading-tight">
            Home-cooked meals,{" "}
            <span className="text-[var(--orange-500)]">cooked in your kitchen.</span>
          </h1>
          <p className="text-[1.05rem] text-[var(--text-muted)] leading-relaxed mb-10">
            CookOnCall connects families with verified home chefs who come to your home and cook
            fresh meals on the spot. We are starting in Ahmedabad and expanding city-by-city across
            Gujarat.
          </p>

          {/* What we do */}
          <Section title="What we do">
            <p>
              We are a marketplace for home chefs. You pick a chef, choose your menu, and they
              arrive at your kitchen at your booked time and cook fresh — using your kitchen, your
              utensils, and either your ingredients or ingredients they bring at market cost.
            </p>
            <p>
              CookOnCall is <strong>not a food delivery service</strong>. There is no microwave-warm
              food, no plastic boxes, no 30-minute-old curry. Just real cooking, in real time, in
              your home.
            </p>
          </Section>

          {/* Why we exist */}
          <Section title="Why we exist">
            <p>
              Restaurant food is expensive and often unhealthy. Home cooking is personal but takes
              time most of us don&apos;t have. CookOnCall bridges that gap — get the warmth of home
              food without spending three hours in the kitchen.
            </p>
          </Section>

          {/* Founders */}
          <Section title="Who built this">
            <p>
              CookOnCall is built by two founders from Gujarat — <strong>Aryan Khamar</strong>{" "}
              (technology) and <strong>Aayushi Patel</strong> (operations &amp; chef onboarding).
              We are a small team trying to do this honestly: verified chefs only, transparent
              pricing, and real human support over WhatsApp.
            </p>
          </Section>

          {/* How it works */}
          <Section title="How it works">
            <ol className="space-y-3 list-decimal pl-5">
              <li>
                <strong>Book a chef</strong> — pick from verified chefs in your city, choose dishes
                and a time slot.
              </li>
              <li>
                <strong>Chef arrives</strong> — at your booked slot, with ingredients (if you chose
                that option).
              </li>
              <li>
                <strong>Cooked fresh</strong> — meals are prepared in your kitchen, the way you
                want them.
              </li>
              <li>
                <strong>Pay &amp; rate</strong> — pay securely via Razorpay and rate your chef
                after the meal.
              </li>
            </ol>
          </Section>

          {/* Trust */}
          <Section title="Trust &amp; safety">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 not-prose">
              <TrustCard
                icon={<ShieldCheck className="w-6 h-6 text-[var(--orange-500)]" />}
                title="Aadhaar verified"
                body="Every chef is identity-verified before being listed."
              />
              <TrustCard
                icon={<ChefHat className="w-6 h-6 text-[var(--orange-500)]" />}
                title="FSSAI compliant"
                body="Chefs follow basic food-safety practices we audit."
              />
              <TrustCard
                icon={<Star className="w-6 h-6 text-[var(--orange-500)]" />}
                title="Rated &amp; reviewed"
                body="You see real ratings from real customers, not paid ones."
              />
            </div>
          </Section>

          {/* For chefs */}
          <Section title="For chefs">
            <p> 
              Cook on your terms. Set your own hours, pick your own menu, and focus purely
              on cooking — we handle all pricing so you never have to negotiate with a
              customer. You keep <strong>97.5%</strong> of every dish you cook — we only
              take a 2.5% platform fee. Payouts within 24 hours of booking completion,
              directly to your UPI.
            </p>
          </Section>

          {/* Mobile app coming soon */}
          <Section title="Mobile app">
            <p>
              The CookOnCall mobile app is coming soon to the Play Store and the App Store.
              Until then, the website works great on your phone too — and you can add it to your
              home screen for quick access.
            </p>
            <div className="flex flex-wrap gap-3 mt-4 not-prose">
              <AppBadge platform="play" />
              <AppBadge platform="app" />
            </div>
          </Section>

          {/* CTA */}
          <div className="mt-10 bg-white rounded-[20px] p-7 border border-[rgba(212,114,26,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-5 h-5 text-[var(--orange-500)]" />
                <span className="font-display font-[800] text-[1.1rem] text-[var(--brown-800)]">
                  Ready for fresh, home-cooked food?
                </span>
              </div>
              <p className="text-[0.88rem] text-[var(--text-muted)]">
                Book a verified home chef in Ahmedabad starting at ₹49 visit fee.
              </p>
            </div>
            <Link
              href="/login?tab=signup&role=chef"
              className="px-6 py-3 rounded-[10px] bg-[var(--orange-500)] text-white font-semibold text-[0.95rem] no-underline hover:bg-[var(--orange-400)] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              Book a chef →
            </Link>
          </div>
        </div>
      </main>
      <FooterSimple />
      <WhatsAppFAB />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display font-[800] text-[1.3rem] text-[var(--brown-800)] mb-3">
        {title}
      </h2>
      <div className="text-[0.96rem] leading-[1.75] text-[var(--brown-800)] space-y-3">
        {children}
      </div>
    </section>
  );
}

function TrustCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white rounded-[14px] p-4 border border-[rgba(212,114,26,0.08)]">
      <div className="mb-2">{icon}</div>
      <div className="font-semibold text-[0.95rem] text-[var(--brown-800)] mb-0.5">{title}</div>
      <div className="text-[0.82rem] text-[var(--text-muted)] leading-snug">{body}</div>
    </div>
  );
}

function AppBadge({ platform }: { platform: "play" | "app" }) {
  const isPlay = platform === "play";
  return (
    <div
      className="inline-flex items-center gap-2.5 bg-[var(--brown-800)] text-white px-4 py-2.5 rounded-[10px] opacity-90 cursor-default select-none"
      title="Coming soon"
    >
      {isPlay ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.6 1.4c-.3.3-.5.7-.5 1.2v18.8c0 .5.2.9.5 1.2l11-11-11-10.2zm12.5 11.7l2.7 2.6-13.2 7.7 10.5-10.3zm0-2.2L5.6.7l13.2 7.6-2.7 2.6zm5 .9l-2.5-1.4-2.9 2.7 2.9 2.8 2.6-1.5c.8-.5.8-1.7-.1-2.6z" />
        </svg>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 12.04c-.03-3 2.45-4.45 2.56-4.52-1.4-2.04-3.57-2.32-4.34-2.35-1.85-.19-3.61 1.09-4.55 1.09-.94 0-2.39-1.07-3.93-1.04-2.02.03-3.88 1.17-4.92 2.97-2.1 3.64-.54 9.02 1.51 11.97 1 1.45 2.18 3.07 3.73 3.01 1.5-.06 2.07-.97 3.88-.97 1.81 0 2.32.97 3.91.94 1.62-.03 2.64-1.46 3.62-2.92 1.14-1.67 1.61-3.29 1.64-3.37-.04-.02-3.13-1.21-3.16-4.79zM14.39 3.3c.83-1.01 1.39-2.42 1.24-3.82-1.2.05-2.66.8-3.52 1.81-.77.89-1.45 2.32-1.27 3.7 1.34.1 2.71-.69 3.55-1.69z" />
        </svg>
      )}
      <div className="leading-tight">
        <div className="text-[0.6rem] uppercase tracking-wider opacity-75">Coming soon</div>
        <div className="text-[0.9rem] font-semibold">{isPlay ? "Play Store" : "App Store"}</div>
      </div>
    </div>
  );
}
