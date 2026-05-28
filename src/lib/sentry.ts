"use client";

import * as Sentry from "@sentry/react";
import Cookies from "js-cookie";

/**
 * Sentry init for the web app.
 *
 * The web app is a Next.js static export (`output: 'export'`) so we use
 * `@sentry/react` directly instead of `@sentry/nextjs` (which assumes a
 * Node/edge runtime that doesn't exist in our deploy).
 *
 * Init is a no-op when NEXT_PUBLIC_SENTRY_DSN is unset — keeps local dev
 * and CI clean of crash reports.
 */
let _initialized = false;

export function initSentry() {
  if (_initialized) return;
  if (typeof window === "undefined") return; // never run on server build

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV || "production",
    release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    ),
    // We don't ship Replay by default (extra bundle weight) — flip on later.
    integrations: [],
    beforeSend(event) {
      // ─── PII scrubbing ───────────────────────────────────
      // The Authorization cookie is HttpOnly-ish (js-cookie set), but Sentry's
      // browser SDK may pick up other headers via fetch breadcrumbs. Strip
      // anything that looks like a token or otp from request data.
      try {
        if (event.request) {
          if (event.request.headers) {
            delete (event.request.headers as Record<string, string>).Authorization;
            delete (event.request.headers as Record<string, string>).authorization;
            delete (event.request.headers as Record<string, string>).Cookie;
            delete (event.request.headers as Record<string, string>).cookie;
          }
          event.request.data = redact(event.request.data);
          event.request.query_string = redact(event.request.query_string) as
            | string
            | undefined;
        }
        // Defense-in-depth: keep ONLY user.id, never email/name/ip.
        if (event.user) {
          event.user = event.user.id ? { id: event.user.id } : undefined;
        }
      } catch {
        // never let beforeSend throw
      }
      return event;
    },
  });

  // Best-effort: tag the user from the JWT cookie so events have an
  // owner. JWT payload is NOT verified — purely for grouping.
  try {
    const token = Cookies.get("coc_token");
    if (token) {
      const segments = token.split(".");
      if (segments.length >= 2) {
        const b64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(b64)) as { sub?: string };
        if (payload?.sub) {
          Sentry.setUser({ id: payload.sub });
        }
      }
    }
  } catch {
    // ignore
  }

  _initialized = true;
}

const SENSITIVE = new Set([
  "password",
  "new_password",
  "old_password",
  "otp",
  "access_token",
  "refresh_token",
  "token",
  "razorpay_signature",
  "razorpay_payment_id",
  "fcm_token",
  "aadhaar_number",
  "pan_number",
  "account_number",
]);

function redact(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input === "string") {
    return input.replace(
      /([?&])(password|otp|token|refresh_token|access_token)=[^&]*/gi,
      "$1$2=[REDACTED]",
    );
  }
  if (Array.isArray(input)) return input.map(redact);
  if (typeof input === "object") {
    const cloned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      cloned[k] = SENSITIVE.has(k.toLowerCase()) ? "[REDACTED]" : redact(v);
    }
    return cloned;
  }
  return input;
}

export function captureException(err: unknown, ctx?: Record<string, unknown>) {
  if (!_initialized) return;
  Sentry.captureException(err, { extra: ctx });
}

export function setSentryUserId(userId: string | null) {
  if (!_initialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
