import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import {
  CITY_NAME,
  CITY_SLUG,
  getServiceAreaBySlug,
  getServiceAreas,
  type ServiceArea,
} from "@/lib/serviceAreas";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cookoncall-backend-production-7c6d.up.railway.app/api/v1";

interface Cook {
  id: string;
  user: { name: string; profile_photo?: string };
  bio?: string;
  cuisines?: string[];
  rating?: number;
  total_reviews?: number;
  totalReviews?: number;
  is_available?: boolean;
  service_area_slugs?: string[];
  serves_all_city?: boolean;
}

// This app is a static export (`output: 'export'` in next.config.js) — every
// area page must be enumerable at build time. /chefs/ahmedabad (the
// pre-existing city-wide page, kept working at the same URL) is included
// as an explicit param alongside the real `service_areas` rows, so this
// route supersedes the old static `chefs/ahmedabad/page.tsx` folder rather
// than redirecting to it.
export async function generateStaticParams() {
  const areas = await getServiceAreas();
  const params = areas
    .filter((a) => a.slug !== CITY_SLUG)
    .map((a) => ({ area: a.slug }));
  return [{ area: CITY_SLUG }, ...params];
}

async function getChefs(): Promise<Cook[]> {
  try {
    const res = await fetch(API_BASE + "/cooks?limit=50&page=1", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.cooks ?? json?.data ?? [];
  } catch {
    return [];
  }
}

/** Resolve the URL param to either the city-wide sentinel or a real
 * `service_areas` row. Returns null for anything else (shouldn't happen —
 * generateStaticParams only emits known slugs — but generateMetadata and
 * the page both guard against it rather than assume). */
type ResolvedArea =
  | { isCity: true }
  | { isCity: false; area: ServiceArea };

async function resolveArea(slug: string): Promise<ResolvedArea | null> {
  if (slug === CITY_SLUG) return { isCity: true };
  const area = await getServiceAreaBySlug(slug);
  return area ? { isCity: false, area } : null;
}

/** Explicit type predicate — narrowing on `.isCity` directly (or via a
 * copied boolean variable) doesn't reliably narrow the `area` field back
 * out in this codebase's TS config, so use this instead of ad-hoc checks. */
function isAreaResult(
  r: ResolvedArea,
): r is { isCity: false; area: ServiceArea } {
  return !r.isCity;
}

export async function generateMetadata({
  params,
}: {
  params: { area: string };
}): Promise<Metadata> {
  const resolved = await resolveArea(params.area);
  if (!resolved) return { title: "Area Not Found" };

  const canonical = `https://thecookoncall.com/chefs/${params.area}`;

  if (!isAreaResult(resolved)) {
    return {
      title: "Home Chefs in Ahmedabad | Book a Personal Chef | CookOnCall",
      description:
        "Browse verified home chefs in Ahmedabad. Book a personal chef for daily meals, dinner parties, or events. Gujarati, Punjabi, South Indian cuisines. Starting ₹600.",
      alternates: { canonical },
      openGraph: {
        title: "Home Chefs in Ahmedabad | CookOnCall",
        description:
          "Browse verified home chefs in Ahmedabad. Book for daily meals, parties or events. Starting ₹600.",
        url: canonical,
        images: [{ url: "/og-default.png", width: 1200, height: 630 }],
      },
    };
  }

  const { area } = resolved;
  const title = `Home Chefs in ${area.name}, ${CITY_NAME} | CookOnCall`;
  const description = `Browse verified home chefs in ${area.name}, ${CITY_NAME}. Book a personal chef for daily meals, dinner parties, or events. Starting ₹600.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    },
  };
}

export default async function ChefsAreaPage({
  params,
}: {
  params: { area: string };
}) {
  const resolved = await resolveArea(params.area);
  if (!resolved) {
    // Static export: any slug outside generateStaticParams never gets a
    // rendered file, so this only guards against a stale/regenerated build
    // racing the areas API between generateStaticParams and render.
    notFound();
  }

  const chefsRaw = await getChefs();
  const areaResult = isAreaResult(resolved) ? resolved : null;
  const isCity = !areaResult;
  const area = areaResult?.area ?? null;
  const areaName = area?.name ?? CITY_NAME;

  // City page shows every chef, as it always has. An area page narrows to
  // chefs who actually cover that neighbourhood — either explicitly
  // (`service_area_slugs`) or because they serve the whole city.
  const chefs = isCity
    ? chefsRaw
    : chefsRaw.filter(
        (c) =>
          c.serves_all_city || (c.service_area_slugs ?? []).includes(area!.slug),
      );

  const pageUrl = `https://thecookoncall.com/chefs/${params.area}`;
  const heading = isCity ? "Home Chefs in Ahmedabad" : `Home Chefs in ${areaName}`;
  const badgeText = isCity
    ? "Ahmedabad's Home Chef Platform"
    : `Serving ${areaName}, Ahmedabad`;

  const breadcrumbItems = isCity
    ? [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://thecookoncall.com" },
        { "@type": "ListItem", position: 2, name: "Home Chefs in Ahmedabad", item: pageUrl },
      ]
    : [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://thecookoncall.com" },
        { "@type": "ListItem", position: 2, name: "Home Chefs in Ahmedabad", item: `https://thecookoncall.com/chefs/${CITY_SLUG}` },
        { "@type": "ListItem", position: 3, name: areaName, item: pageUrl },
      ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  // Honest structured data only — no fabricated aggregateRating/reviewCount
  // (see docs/30_GLOBAL_BRAND_AND_SEO_AUDIT.md A2). Real fields only.
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: isCity ? "Home Chef Booking in Ahmedabad" : `Home Chef Booking in ${areaName}, Ahmedabad`,
    provider: { "@type": "Organization", name: "CookOnCall", url: "https://thecookoncall.com" },
    areaServed: isCity
      ? { "@type": "City", name: "Ahmedabad" }
      : {
          "@type": "Place",
          name: `${areaName}, Ahmedabad`,
          containedInPlace: { "@type": "City", name: "Ahmedabad" },
        },
    serviceType: "Home Chef",
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: "600",
      availability: "https://schema.org/InStock",
    },
  };

  const faqItems = isCity
    ? [
        {
          q: "How much does a home chef cost in Ahmedabad?",
          a: "Home chefs on CookOnCall start at ₹600 per session. Pricing is fixed and transparent — no negotiation needed.",
        },
        {
          q: "What cuisines are available?",
          a: "Our chefs specialise in Gujarati, Punjabi, South Indian, Jain, and continental cuisines.",
        },
        {
          q: "How do I book a home chef in Ahmedabad?",
          a: "Browse the chefs above, click any profile to see their full menu, then book directly. Payment via Razorpay.",
        },
      ]
    : [
        {
          q: `How much does a home chef cost in ${areaName}?`,
          a: "Home chefs on CookOnCall start at ₹600 per session. Pricing is fixed and transparent — no negotiation needed.",
        },
        {
          q: "What cuisines are available?",
          a: "Our chefs specialise in Gujarati, Punjabi, South Indian, Jain, and continental cuisines.",
        },
        {
          q: `How do I book a home chef in ${areaName}?`,
          a: `Browse the chefs above, click any profile to see their full menu, then book directly. If nobody's live in ${areaName} yet, sign up and we'll notify you the moment a chef covers your area.`,
        },
      ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <Navbar />

      {/* Hero */}
      <section className="pt-[140px] pb-16 px-6 md:px-12 text-center max-w-[800px] mx-auto">
        <nav className="text-sm text-gray-400 mb-6 flex items-center justify-center gap-1.5">
          <Link href="/" className="hover:text-orange-500">Home</Link>
          <span>/</span>
          {isCity ? (
            <span className="text-gray-600">Home Chefs in Ahmedabad</span>
          ) : (
            <>
              <Link href={`/chefs/${CITY_SLUG}`} className="hover:text-orange-500">Home Chefs in Ahmedabad</Link>
              <span>/</span>
              <span className="text-gray-600">{areaName}</span>
            </>
          )}
        </nav>
        <div className="inline-flex items-center gap-2 bg-gradient-to-br from-[rgba(212,114,26,0.1)] to-[rgba(212,114,26,0.05)] border border-[rgba(212,114,26,0.2)] px-5 py-2 rounded-full text-[0.82rem] font-semibold text-[var(--orange-500)] tracking-[1px] uppercase mb-8">
          {badgeText}
        </div>
        <h1 className="font-display font-[900] text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.08] text-[var(--brown-800)] mb-6">
          {heading}
        </h1>
        <p className="text-[1.05rem] text-[var(--text-muted)] max-w-[560px] mx-auto mb-8 leading-[1.7]">
          {isCity
            ? "Book a verified personal chef in Ahmedabad for daily meals, dinner parties, or special events. Gujarati, Punjabi, South Indian and more — starting at ₹600 per session."
            : `Book a verified personal chef in ${areaName}, Ahmedabad for daily meals, dinner parties, or special events. Gujarati, Punjabi, South Indian and more — starting at ₹600 per session.`}
        </p>
        <Link
          href="/login?tab=signup"
          className="group inline-block px-9 py-4 rounded-full bg-[var(--orange-500)] text-white font-bold text-[1.05rem] no-underline shadow-[0_4px_20px_rgba(212,114,26,0.3)] transition-all duration-300 hover:bg-[var(--orange-400)] hover:-translate-y-0.5"
        >
          Book a Chef Today{" "}
          <span className="inline-block ml-1.5 transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </section>

      {/* Chef Grid */}
      <section className="py-16 px-6 md:px-12 max-w-[1200px] mx-auto">
        <h2 className="font-display font-[900] text-[clamp(1.6rem,3vw,2.2rem)] text-[var(--brown-800)] mb-10">
          {chefs.length > 0 ? `Browse Verified Chefs (${chefs.length})` : "Browse Verified Chefs"}
        </h2>
        {/* This is a server component — getChefs() has already resolved by the
            time this renders, so an empty array here is a real zero-result
            state (API error, or genuinely no chef covers this area yet),
            never a client-side "still loading" moment. Say what's actually
            true instead of inflating a fake count. */}
        {chefs.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p className="text-lg mb-4">
              {isCity
                ? "We're onboarding verified chefs in Ahmedabad right now — check back soon, or sign up to be notified the moment one's available near you."
                : `No verified chef covers ${areaName} yet — we're onboarding across Ahmedabad every week. Sign up to be notified the moment one's available near you.`}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login?tab=signup" className="text-[var(--orange-500)] font-semibold hover:underline">
                Sign up to get notified →
              </Link>
              {!isCity && (
                <>
                  <span className="hidden sm:inline text-[var(--text-muted)]">·</span>
                  <Link href={`/chefs/${CITY_SLUG}`} className="text-[var(--orange-500)] font-semibold hover:underline">
                    Browse chefs across Ahmedabad →
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {chefs.map((chef) => {
              const name = chef.user?.name ?? "Home Chef";
              const cuisines = chef.cuisines ?? [];
              const rating = Number(chef.rating ?? 0);
              const reviews = chef.total_reviews ?? chef.totalReviews ?? 0;
              const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link
                  key={chef.id}
                  href={"/chef/" + chef.id}
                  className="bg-white rounded-[20px] border border-[rgba(212,114,26,0.08)] p-6 transition-all duration-300 hover:border-[var(--orange-500)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(212,114,26,0.1)] no-underline"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-display font-[800] text-xl text-white flex-shrink-0 overflow-hidden">
                      {chef.user?.profile_photo ? (
                        <img src={chef.user.profile_photo} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--brown-800)] text-[1rem]">{name}</h3>
                      {rating > 0 && (
                        <p className="text-sm text-orange-500 font-semibold">
                          {rating.toFixed(1)} ★ ({reviews} reviews)
                        </p>
                      )}
                    </div>
                  </div>
                  {cuisines.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {cuisines.slice(0, 3).map((c) => (
                        <span key={c} className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full border border-orange-100">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {chef.bio && (
                    <p className="text-[0.85rem] text-[var(--text-muted)] mt-3 line-clamp-2 leading-relaxed">
                      {chef.bio}
                    </p>
                  )}
                  <p className="text-[0.82rem] font-semibold text-[var(--orange-500)] mt-4">
                    View profile →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="bg-gradient-to-b from-[var(--cream-200)] to-[var(--cream-100)] py-20 px-6 md:px-12">
        <div className="max-w-[700px] mx-auto">
          <h2 className="font-display font-[900] text-[clamp(1.6rem,3vw,2.2rem)] text-[var(--brown-800)] mb-10">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-6">
            {faqItems.map((item) => (
              <div key={item.q} className="bg-white rounded-[16px] px-7 py-6 border border-[rgba(212,114,26,0.08)]">
                <h3 className="font-bold text-[var(--brown-800)] mb-2">{item.q}</h3>
                <p className="text-[0.9rem] text-[var(--text-muted)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FooterSimple />
      <WhatsAppFAB />
    </>
  );
}
