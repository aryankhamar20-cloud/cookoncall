"use client";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
