// src/app/(public)/chef/[slug]/page.tsx
// ✅ NO "use client" — Server Component — Google sees full HTML

import { notFound } from "next/navigation";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChefUser {
  name: string;
  profile_photo?: string;
}

interface Chef {
  id: string;
  slug: string;
  user: ChefUser;
  bio?: string;
  cuisines?: string[];
  experience_years?: number;
  price_per_booking?: number;
  rating?: number;
  total_reviews?: number;
  city?: string;
  is_active: boolean;
}

// ─── Fetch single chef ────────────────────────────────────────────────────────

async function getChef(slug: string): Promise<Chef | null> {
  try {
    const res = await fetch(
      `https://api.thecookoncall.com/cooks/${slug}`,
      { cache: "force-cache" } // baked into static HTML at build time
    );
    if (!res.ok) return null;
    const json = await res.json();
    // handle both { data: chef } and { chef } response shapes
    return json.data ?? json.cook ?? json ?? null;
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { slug: string };
}

export default async function ChefDetailPage({ params }: PageProps) {
  const chef = await getChef(params.slug);

  // Returns proper 404 — Google won't index missing chefs
  if (!chef || !chef.is_active) {
    notFound();
  }

  const chefName = chef.user?.name ?? "Chef";

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">

      {/* ── Hero ── */}
      <section className="flex flex-col md:flex-row gap-8 items-start">
        {chef.user?.profile_photo && (
          <div className="relative w-44 h-44 rounded-full overflow-hidden flex-shrink-0 border-4 border-orange-100">
            <Image
              src={chef.user.profile_photo}
              alt={`${chefName} - Home Chef in Ahmedabad`}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* ✅ H1 with chef name — critical on-page SEO signal */}
          <h1 className="text-3xl font-bold text-gray-900">{chefName}</h1>

          {chef.city && (
            <p className="text-gray-500 text-sm">📍 {chef.city}, Ahmedabad</p>
          )}

          {(chef.experience_years || chef.price_per_booking) && (
            <p className="text-sm text-gray-600">
              {chef.experience_years
                ? `${chef.experience_years} years experience`
                : ""}
              {chef.experience_years && chef.price_per_booking ? " · " : ""}
              {chef.price_per_booking
                ? `₹${chef.price_per_booking} per booking`
                : ""}
            </p>
          )}

          {/* Rating — rendered in HTML, not via JS */}
          {typeof chef.rating === "number" && chef.total_reviews ? (
            <p className="text-sm font-semibold text-orange-500">
              ⭐ {chef.rating.toFixed(1)}{" "}
              <span className="text-gray-400 font-normal">
                ({chef.total_reviews} reviews)
              </span>
            </p>
          ) : null}

          {/* Cuisines — keyword-rich, visible in HTML */}
          {chef.cuisines && chef.cuisines.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-1">
              {chef.cuisines.map((cuisine) => (
                <span
                  key={cuisine}
                  className="bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-full border border-orange-200"
                >
                  {cuisine}
                </span>
              ))}
            </div>
          )}

          {/* Bio — full text in HTML */}
          {chef.bio && (
            <p className="mt-3 text-gray-600 text-sm leading-relaxed max-w-xl">
              {chef.bio}
            </p>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mt-10 p-6 bg-orange-50 rounded-2xl border border-orange-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Book {chefName}
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Starting at ₹49 visit fee. Fresh ingredients, cooked in your kitchen.
        </p>
        {/* Keep booking button as client interaction — wrap in a client component */}
        <BookingButton chefId={chef.id} chefName={chefName} />
      </section>

    </main>
  );
}

// ─── Booking Button (thin client wrapper) ─────────────────────────────────────
// This keeps the page a server component while allowing the button click

"use client";
function BookingButton({
  chefId,
  chefName,
}: {
  chefId: string;
  chefName: string;
}) {
  return (
    <button
      onClick={() => {
        // your existing booking logic / redirect to /login?role=customer
        window.location.href = `/login?bookChef=${chefId}`;
      }}
      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
    >
      Book {chefName} Now
    </button>
  );
}