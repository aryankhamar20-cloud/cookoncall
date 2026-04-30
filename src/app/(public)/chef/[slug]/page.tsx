// src/app/(public)/chef/[slug]/page.tsx
// ✅ Server Component — NO "use client" — Google sees full HTML

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cook {
  id: string;
  user: { name: string; profile_photo?: string };
  bio?: string;
  cuisines?: string[];
  rating?: number;
  total_reviews?: number;
  totalReviews?: number;
  is_verified?: boolean;
  is_veg_only?: boolean;
  is_available?: boolean;
  city?: string;
}

// ─── STEP 2: generateStaticParams ─────────────────────────────────────────────
// Runs at BUILD TIME — pre-renders a static HTML page for every chef

export async function generateStaticParams() {
  try {
    const res = await fetch(
      `${API_BASE}/cooks?limit=500&page=1`,
      { cache: "force-cache" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const cooks: Cook[] = json?.data?.cooks ?? [];

    // Uses numeric ID as the slug since your API is ID-based
    return cooks.map((cook) => ({ slug: String(cook.id) }));
  } catch {
    // If API is down at build time — build succeeds with 0 pre-rendered pages
    return [];
  }
}

// ─── Fetch single chef ────────────────────────────────────────────────────────

async function getChef(slug: string): Promise<Cook | null> {
  try {
    const res = await fetch(
      `${API_BASE}/cooks/${slug}`,
      { cache: "force-cache" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.data ?? json?.data ?? json ?? null;
  } catch {
    return null;
  }
}

// ─── STEP 3: generateMetadata ─────────────────────────────────────────────────
// Unique title, description, OG image PER chef — critical for SEO

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const chef = await getChef(params.slug);
  if (!chef) {
    return {
      title: "Chef Not Found | CookOnCall",
    };
  }

  const name = chef.user?.name ?? "Home Chef";
  const cuisines = (chef.cuisines ?? []).join(", ");
  const rating = chef.rating ? `⭐ ${Number(chef.rating).toFixed(1)} rated. ` : "";
  const reviews = chef.total_reviews ?? chef.totalReviews ?? 0;

  const title = `${name} — Home Chef in Ahmedabad | CookOnCall`;
  const description =
    chef.bio ??
    `Book ${name}, a verified home chef in Ahmedabad${cuisines ? ` specialising in ${cuisines}` : ""}. ${rating}${reviews > 0 ? `${reviews} reviews. ` : ""}Starting at ₹49 visit fee.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://thecookoncall.com/chef/${params.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://thecookoncall.com/chef/${params.slug}`,
      images: [
        {
          url: chef.user?.profile_photo ?? "/og-default.png",
          width: 1200,
          height: 630,
          alt: `${name} - Home Chef in Ahmedabad`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [chef.user?.profile_photo ?? "/og-default.png"],
    },
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ChefDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const chef = await getChef(params.slug);
  if (!chef) notFound();

  const name = chef.user?.name ?? "Chef";
  const cuisines = chef.cuisines ?? [];
  const rating = Number(chef.rating ?? 0);
  const reviews = chef.total_reviews ?? chef.totalReviews ?? 0;
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ─── STEP 4: JSON-LD Schema ─────────────────────────────────────────────────
  // Person + AggregateRating + BreadcrumbList — all in HTML, readable by Google

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: "Home Chef",
    description:
      chef.bio ??
      `Verified home chef in Ahmedabad specialising in ${cuisines.join(", ")}`,
    worksFor: {
      "@type": "Organization",
      name: "CookOnCall",
      url: "https://thecookoncall.com",
    },
    knowsAbout: cuisines,
    ...(reviews > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.toFixed(1),
        reviewCount: reviews,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://thecookoncall.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Browse Chefs",
        item: "https://thecookoncall.com/chef",
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: `https://thecookoncall.com/chef/${params.slug}`,
      },
    ],
  };

  return (
    <>
      {/* ── JSON-LD injected into HTML — fully readable by Googlebot ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="min-h-screen bg-[var(--cream-100)]">
        <div className="pt-[88px] pb-16 px-5 max-w-[800px] mx-auto">

          {/* ── Breadcrumb (visible) ── */}
          <nav className="text-sm text-gray-400 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-orange-500">Home</Link>
            <span>/</span>
            <Link href="/chef" className="hover:text-orange-500">Chefs</Link>
            <span>/</span>
            <span className="text-gray-600">{name}</span>
          </nav>

          {/* ── Profile card ── */}
          <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(212,114,26,0.06)] mb-6">
            <div className="h-[100px] bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] relative">
              <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-display font-[800] text-2xl text-white border-4 border-white">
                {chef.user?.profile_photo ? (
                  <Image
                    src={chef.user.profile_photo}
                    alt={`${name} profile photo`}
                    fill
                    className="object-cover rounded-full"
                    priority
                  />
                ) : (
                  initials
                )}
              </div>
            </div>

            <div className="pt-14 pb-6 px-6">
              {/* ✅ H1 with chef name — primary on-page SEO signal */}
              <h1 className="font-display text-[1.4rem] font-[900] text-[var(--brown-800)]">
                {name}
              </h1>

              {cuisines.length > 0 && (
                <p className="text-[0.88rem] text-[var(--text-muted)] mt-1">
                  {cuisines.join(", ")}
                </p>
              )}

              {rating > 0 && (
                <p className="text-sm font-semibold text-orange-500 mt-2">
                  ⭐ {rating.toFixed(1)}{" "}
                  <span className="text-gray-400 font-normal">
                    ({reviews} reviews)
                  </span>
                </p>
              )}

              {/* Bio — full text in static HTML */}
              {chef.bio && (
                <p className="text-[0.9rem] text-[var(--text-muted)] mt-4 leading-relaxed">
                  {chef.bio}
                </p>
              )}

              {/* Cuisine tags */}
              {cuisines.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-4">
                  {cuisines.map((c) => (
                    <span
                      key={c}
                      className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full border border-orange-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* ── CTA — links to existing detail page with full booking UI ── */}
              <div className="mt-6">
                <Link
                  href={`/chef/detail?id=${chef.id}`}
                  className="inline-block px-6 py-3 rounded-full bg-[var(--orange-500)] text-white font-bold text-[0.88rem] hover:bg-[var(--orange-400)] transition-colors"
                >
                  View Menu & Book {name}
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}