import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest config for the cookoncall web app.
 *
 * Environment: jsdom (component tests need DOM globals).
 * Path alias `@/*` mirrors tsconfig.json so imports written for
 * Next.js resolve identically in tests.
 *
 * `test/setup.ts` registers @testing-library/jest-dom matchers
 * (toBeInTheDocument, toBeDisabled, etc.) and is loaded once
 * before any spec runs.
 *
 * Excludes: node_modules, .next, and the e2e/test-results dirs
 * if/when they ever appear. Specs live next to their components
 * as *.test.tsx — no separate __tests__ folder.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    css: false,
  },
});
