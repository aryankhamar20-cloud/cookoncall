// src/components/layout/Footer.tsx
"use client";

import Link from "next/link";
import { APP_CONFIG } from "@/lib/utils";

const footerLinks = {
  platform: [
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/chef", label: "Browse Chefs" },
    { href: "/login?tab=signup&role=chef", label: "Become a Chef" },
  ],
  company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ],
  support: [
    { href: "/refund", label: "Cancellation & Refund" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: APP_CONFIG.whatsappUrl, label: "WhatsApp Support", external: true },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[var(--brown-900)] px-6 md:px-12 pt-[60px] pb-9 text-[rgba(255,255,255,0.5)]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 md:gap-12 mb-12">
        {/* Brand */}
        <div>
          <Link
            href="/"
            className="font-display font-[900] text-xl text-white no-underline block mb-3"
          >
            COOK<span className="text-[var(--orange-500)]">ONCALL</span>
          </Link>
          <p className="text-[0.88rem] leading-relaxed max-w-[280px] mb-5">
            Home-cooked meals from verified chefs. Starting in Ahmedabad,
            expanding across Gujarat.
          </p>

          {/* App badges */}
          <div className="flex flex-wrap gap-2.5">
            <AppBadge platform="play" />
            <AppBadge platform="app" />
          </div>
        </div>

        {/* Platform */}
        <div>
          <h4 className="text-white text-[0.85rem] uppercase tracking-[1.5px] mb-4 font-semibold">
            Platform
          </h4>
          {footerLinks.platform.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block text-[rgba(255,255,255,0.5)] no-underline text-[0.9rem] mb-2.5 hover:text-[var(--orange-400)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white text-[0.85rem] uppercase tracking-[1.5px] mb-4 font-semibold">
            Company
          </h4>
          {footerLinks.company.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block text-[rgba(255,255,255,0.5)] no-underline text-[0.9rem] mb-2.5 hover:text-[var(--orange-400)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Support */}
        <div>
          <h4 className="text-white text-[0.85rem] uppercase tracking-[1.5px] mb-4 font-semibold">
            Support
          </h4>
          {footerLinks.support.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="block text-[rgba(255,255,255,0.5)] no-underline text-[0.9rem] mb-2.5 hover:text-[var(--orange-400)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-[1200px] mx-auto border-t border-[rgba(255,255,255,0.08)] pt-6 flex flex-col sm:flex-row justify-between items-center text-[0.82rem] gap-2">
        <span>© {APP_CONFIG.year} CookOnCall. All rights reserved.</span>
        <span>Made with ♥ in Gujarat</span>
      </div>
    </footer>
  );
}

/** Simplified footer for secondary pages */
export function FooterSimple() {
  return (
    <footer className="bg-[var(--brown-900)] px-6 md:px-12 py-9 text-center text-[rgba(255,255,255,0.5)]">
      <p className="text-[0.88rem]">
        © {APP_CONFIG.year} CookOnCall. All rights reserved.{" "}
        <Link
          href="/"
          className="text-[rgba(255,255,255,0.5)] no-underline hover:text-[var(--orange-400)]"
        >
          Home
        </Link>{" "}
        ·{" "}
        <Link
          href="/about"
          className="text-[rgba(255,255,255,0.5)] no-underline hover:text-[var(--orange-400)]"
        >
          About
        </Link>{" "}
        ·{" "}
        <Link
          href="/contact"
          className="text-[rgba(255,255,255,0.5)] no-underline hover:text-[var(--orange-400)]"
        >
          Contact
        </Link>{" "}
        ·{" "}
        <Link
          href="/refund"
          className="text-[rgba(255,255,255,0.5)] no-underline hover:text-[var(--orange-400)]"
        >
          Refund
        </Link>{" "}
        ·{" "}
        <Link
          href="/terms"
          className="text-[rgba(255,255,255,0.5)] no-underline hover:text-[var(--orange-400)]"
        >
          Terms
        </Link>{" "}
        ·{" "}
        <Link
          href="/privacy"
          className="text-[rgba(255,255,255,0.5)] no-underline hover:text-[var(--orange-400)]"
        >
          Privacy
        </Link>{" "}
        ·{" "}
        <Link
          href={APP_CONFIG.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[rgba(255,255,255,0.5)] no-underline hover:text-[var(--orange-400)]"
        >
          WhatsApp
        </Link>
      </p>
    </footer>
  );
}

/** Inline app coming soon badge — reused in footer */
function AppBadge({ platform }: { platform: "play" | "app" }) {
  const isPlay = platform === "play";
  return (
    <div
      className="inline-flex items-center gap-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white px-3 py-1.5 rounded-[8px] cursor-default select-none"
      title="Mobile app coming soon"
    >
      {isPlay ? (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.6 1.4c-.3.3-.5.7-.5 1.2v18.8c0 .5.2.9.5 1.2l11-11-11-10.2zm12.5 11.7l2.7 2.6-13.2 7.7 10.5-10.3zm0-2.2L5.6.7l13.2 7.6-2.7 2.6zm5 .9l-2.5-1.4-2.9 2.7 2.9 2.8 2.6-1.5c.8-.5.8-1.7-.1-2.6z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 12.04c-.03-3 2.45-4.45 2.56-4.52-1.4-2.04-3.57-2.32-4.34-2.35-1.85-.19-3.61 1.09-4.55 1.09-.94 0-2.39-1.07-3.93-1.04-2.02.03-3.88 1.17-4.92 2.97-2.1 3.64-.54 9.02 1.51 11.97 1 1.45 2.18 3.07 3.73 3.01 1.5-.06 2.07-.97 3.88-.97 1.81 0 2.32.97 3.91.94 1.62-.03 2.64-1.46 3.62-2.92 1.14-1.67 1.61-3.29 1.64-3.37-.04-.02-3.13-1.21-3.16-4.79zM14.39 3.3c.83-1.01 1.39-2.42 1.24-3.82-1.2.05-2.66.8-3.52 1.81-.77.89-1.45 2.32-1.27 3.7 1.34.1 2.71-.69 3.55-1.69z" />
        </svg>
      )}
      <div className="leading-tight">
        <div className="text-[0.55rem] uppercase tracking-wider opacity-75">Coming soon</div>
        <div className="text-[0.78rem] font-semibold">{isPlay ? "Play Store" : "App Store"}</div>
      </div>
    </div>
  );
}
