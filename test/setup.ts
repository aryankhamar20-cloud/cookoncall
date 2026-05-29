/**
 * Vitest global setup.
 *
 * Loaded once before any spec via `setupFiles` in vitest.config.ts.
 * Registers @testing-library/jest-dom's matchers on Vitest's
 * `expect` so specs can use `toBeInTheDocument`, `toBeDisabled`,
 * `toHaveValue`, etc. without per-file imports.
 *
 * Also installs a no-op IntersectionObserver because some lucide
 * / framer-motion code paths touch it on mount and jsdom doesn't
 * implement it. Cheap insurance; can be removed once jsdom 26+
 * ships native support.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library auto-cleanup is not enabled by default in
// vitest (unlike jest with the rtl preset), so do it explicitly.
afterEach(() => {
  cleanup();
});

// jsdom doesn't ship IntersectionObserver. Stub it as a no-op
// so any imported component that touches it on mount doesn't blow up.
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IntersectionObserver =
  (globalThis as any).IntersectionObserver ?? IntersectionObserverMock;
