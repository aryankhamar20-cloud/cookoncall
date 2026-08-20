import type { Metadata } from "next";

// login/page.tsx is a client component ("use client"), so it can't export
// its own metadata — without this layout it silently fell back to the root
// layout's default title ("Book a Home Chef in Ahmedabad | CookOnCall"),
// which reads oddly as a browser-tab title while looking at a login form.
// Note: /login is already excluded from search indexing via robots.ts
// (see docs/30_GLOBAL_BRAND_AND_SEO_AUDIT.md A1), so this is purely a
// tab-title / share-preview UX fix, not an SEO one.
//
// Root layout applies title.template "%s | CookOnCall" — this composes
// correctly here (unlike chef/detail/layout.tsx, see the comment there):
// this layout's nearest ancestor layout is the root layout directly, one
// level up, vs. chef/detail's two-deep chain through an intermediate
// layout that also sets its own plain-string title. Don't repeat the
// brand suffix here or it renders "... | CookOnCall | CookOnCall".
export const metadata: Metadata = {
  title: "Login or Sign Up",
  description: "Log in or create a CookOnCall account to book a verified home chef, or join as a chef.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
