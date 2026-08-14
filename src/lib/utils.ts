import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Downscale + re-encode an image file client-side before upload (avatar,
 * dish photo, menu/document scans). Shared by ProfilePanel and the cook
 * dashboard's menu/document uploaders — previously duplicated verbatim in
 * both places.
 *
 * On any load failure (corrupt file, non-image selected, etc.) resolves
 * with the original file rather than hanging forever — the earlier
 * per-page copies of this helper had no `img.onerror`, so a bad file left
 * the returned promise permanently unresolved and the "uploading..." UI
 * stuck spinning.
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.75,
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); resolve(file); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          cleanup();
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        }, "image/jpeg", quality);
      } catch {
        cleanup();
        resolve(file);
      }
    };
    img.onerror = () => {
      cleanup();
      resolve(file);
    };
    img.src = objectUrl;
  });
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
  platformFeePercent: 2.5,  // 2.5% convenience fee charged to customer (matches backend calculation)
} as const;
