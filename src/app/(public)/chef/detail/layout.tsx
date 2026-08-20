import type { Metadata } from "next";

// chef/detail/page.tsx is a client component ("use client"), so it can't
// export its own metadata — without this layout it silently inherited the
// parent `chef/layout.tsx` metadata instead, which is the CHEF-RECRUITMENT
// page's title/description ("Become a Home Chef in Ahmedabad — Earn
// ₹15,000–₹50,000/month"). Confirmed live: every customer viewing a
// specific chef's profile + booking page saw that recruiter copy as their
// browser tab title, and any WhatsApp/social share of this link (this is
// the actual URL the "View Menu and Book" CTA sends customers to) would
// have shown the wrong preview card. This page renders per-chef content
// client-side from a ?id= query param, so it can't generate true per-chef
// metadata without an SSR rewrite (out of scope) — but generic, correct
// copy here is a strict improvement over inheriting the recruiter page's.
// NOTE: the root layout's title.template ("%s | CookOnCall") does not
// reliably compose at this nesting depth (root → chef/layout.tsx →
// chef/detail/layout.tsx) — verified empirically in the static export
// output (`out/chef/detail.html`), where a plain-string title here
// rendered as "Book a Chef" with no brand suffix at all. Writing the full
// string explicitly sidesteps that, matching how openGraph.title is
// already written literally elsewhere in this codebase.
export const metadata: Metadata = {
  title: "Book a Chef | CookOnCall",
  description:
    "View this chef's menu, packages, and reviews, then book a session directly on CookOnCall.",
};

export default function ChefDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
