"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/chef", label: "For Chefs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#features", label: "Features" },
  { href: "/about", label: "About Us" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[1000] flex h-[72px] items-center justify-between px-6 md:px-12 transition-shadow duration-300",
        "bg-[rgba(255,248,240,0.95)] backdrop-blur-[12px] border-b border-[rgba(212,114,26,0.08)]",
        scrolled && "shadow-[0_2px_24px_rgba(26,15,10,0.08)]"
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        className="font-display font-[900] text-2xl text-[var(--brown-800)] no-underline tracking-tight"
      >
        COOK<span className="text-[var(--orange-500)]">ONCALL</span>
      </Link>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href.startsWith("/#") && pathname === "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[0.95rem] font-medium no-underline transition-colors duration-200",
                isActive
                  ? "text-[var(--orange-500)] font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--orange-500)]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/login"
          className="px-6 py-2.5 rounded-full border-[1.5px] border-[var(--brown-800)] bg-transparent text-[var(--brown-800)] font-semibold text-[0.9rem] no-underline transition-all duration-250 hover:bg-[var(--brown-800)] hover:text-white"
        >
          Login
        </Link>
        <Link
          href="/login?tab=signup"
          className="px-6 py-2.5 rounded-full border-none bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] no-underline transition-all duration-250 hover:bg-[var(--orange-400)] hover:-translate-y-0.5"
        >
          Sign Up Free
        </Link>
      </div>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden bg-transparent border-none cursor-pointer p-1"
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <X className="w-7 h-7 text-[var(--brown-800)]" />
        ) : (
          <Menu className="w-7 h-7 text-[var(--brown-800)]" />
        )}
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden absolute top-[72px] left-0 right-0 bg-[var(--cream-100)] border-b border-[rgba(212,114,26,0.08)] shadow-[0_8px_32px_rgba(26,15,10,0.08)] animate-fade-in">
          <div className="flex flex-col p-6 gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--text-muted)] font-medium text-base no-underline py-2 hover:text-[var(--orange-500)] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--cream-200)]">
              <Link
                href="/login"
                className="flex-1 text-center px-5 py-3 rounded-full border-[1.5px] border-[var(--brown-800)] text-[var(--brown-800)] font-semibold text-[0.9rem] no-underline"
              >
                Login
              </Link>
              <Link
                href="/login?tab=signup"
                className="flex-1 text-center px-5 py-3 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] no-underline"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
