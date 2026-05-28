"use client";

import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { initSentry } from "@/lib/sentry";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Sentry init must happen on the client only. useEffect guarantees this
  // even if the static export ever gets pre-rendered server-side.
  // initSentry() itself is idempotent and a no-op if NEXT_PUBLIC_SENTRY_DSN
  // is unset — safe to call on every mount.
  useEffect(() => {
    initSentry();
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
