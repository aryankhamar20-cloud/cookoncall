"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { eventsApi } from "@/lib/api";

/**
 * Analytics Phase 3 — global page-view tracker.
 *
 * Mounts once at the root layout. On every Next.js App Router URL
 * change it POSTs `event_type: 'page_view'` to /events with the new
 * pathname and the previous one (for back-button + funnel analysis).
 *
 * Why a separate component vs a single hook?
 * ──────────────────────────────────────────
 * `next/navigation`'s `useSearchParams` triggers Next's
 * `dynamic = 'force-dynamic'` warning when used inside a layout.
 * Wrapping it in a `<Suspense>` boundary is the official fix
 * (see https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout).
 * The root layout already has Suspense for client components, so we
 * just live inside it as a noop-rendering component.
 *
 * Privacy posture
 * ───────────────
 * - Only `pathname + search` is sent — no body, no DOM nodes, no PII.
 * - The endpoint is rate-limited server-side (existing throttler) so
 *   a misbehaving client can't flood the events table.
 * - When the user is logged out we still fire — anonymous analytics
 *   power our pre-signup funnel measurements. The backend backfills
 *   user_id from the JWT when present.
 *
 * Resilience
 * ──────────
 * - Failures (network blip, ad-blocker rejecting the request) are
 *   swallowed silently. Analytics must never break navigation.
 * - We dedupe consecutive identical pathnames so React Strict-Mode's
 *   double-render doesn't double-count.
 * - Session ID lives in sessionStorage so all events from a single
 *   tab share a session.
 */

const SESSION_KEY = "coc_analytics_session";

function ensureSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      // Cheap pseudo-uuid — analytics doesn't need crypto strength.
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private mode / Safari ITP can throw on sessionStorage.
    return undefined;
  }
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Remember the previous pathname so we can attach it as `referrer`
  // on the next page_view, useful for "people who visited /chefs
  // tend to next visit /chef/<id>" funnel queries.
  const lastPathRef = useRef<string | null>(null);

  // Refer & Earn — capture a `?ref=CODE` from any landing URL (the share
  // link points at `/?ref=CODE`) and stash it in a 30-day cookie. The
  // login page applies it via POST /referrals/apply right after the
  // referred friend finishes signing up. Never overwrite an existing
  // pending ref so the FIRST referrer who brought them here wins.
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref && !Cookies.get("coc_ref")) {
      Cookies.set("coc_ref", ref, { expires: 30 });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString() ?? "";
    const fullPath = search ? `${pathname}?${search}` : pathname;

    // Strict-mode dedupe.
    if (lastPathRef.current === fullPath) return;
    const previousPath = lastPathRef.current;
    lastPathRef.current = fullPath;

    eventsApi
      .track({
        event_type: "page_view",
        page_path: fullPath,
        // First-load referrer is the document.referrer (off-site).
        // Subsequent navigations use the in-app previous path.
        referrer:
          previousPath ??
          (typeof document !== "undefined" ? document.referrer : undefined) ??
          undefined,
        session_id: ensureSessionId(),
      })
      .catch(() => undefined);
  }, [pathname, searchParams]);

  return null;
}
