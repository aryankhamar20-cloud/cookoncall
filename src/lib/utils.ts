import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format amount in INR */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Get time-based greeting */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

/** Get user initials from name */
export function getInitials(firstName?: string, lastName?: string): string {
  // Support single full name: "Aayushi Patel" → "AP"
  if (firstName && !lastName) {
    const parts = firstName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return firstName.charAt(0).toUpperCase();
  }
  const f = (firstName || "?").charAt(0);
  const l = (lastName || "?").charAt(0);
  return `${f}${l}`.toUpperCase();
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

/** Config constants */
export const APP_CONFIG = {
  name: "CookOnCall",
  city: "Ahmedabad",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919081444326",
  whatsappUrl: `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919081444326"}`,
  founders: "Aryan Khamar & Aayushi Patel",
  year: 2025,
  platformFeePercent: 15,
} as const;
