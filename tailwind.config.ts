import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#A43700",
          dark: "#1A1A2E",
          light: "#FFF8F3",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"],
        // `font-display` / `font-body` are used across ~50 files but were
        // never registered here, so they silently no-op — Tailwind only
        // generates utilities for keys it knows about. Registering them
        // also aligns family choice with the Flutter app's design system
        // (docs/design/01_color_typography_plan.md): Plus Jakarta Sans for
        // display/headline/title/label, Be Vietnam Pro for body.
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
