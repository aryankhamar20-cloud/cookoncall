import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://cookoncall-backend-production-7c6d.up.railway.app/api/v1";

interface Cook {
  id: string;
  user: { name: string; profile_photo?: string };
  bio?: string;
  cuisines?: string[];
  rating?: number;
  total_reviews?: number;
  totalReviews?: number;
  is_available?: boolean;
  city?: string;
}

export async function generateStaticParams() {
  try {
    const res = await fetch(API_BASE + "/cooks?limit=500&page=1", { cache: "force-cache" });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data?.cooks ?? [];
    return items.map((c) => ({ slug: String(c.id) }));
  } catch {
    return [];
  }
}

async function getChef(slug) {
  try {
    const res = await fetch(API_BASE + "/cooks/" + slug, { cache: "force-cache" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.data ?? json?.data ?? json ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const chef = await getChef(params.slug);
  if (!chef) return { title: "Chef Not Found | CookOnCall" };
  const name = chef.user?.name ?? "Home Chef";
  const title = name + " - Home Chef in Ahmedabad | CookOnCall";
  const description = chef.bio ?? "Book " + name + ", a verified home chef in Ahmedabad. Starting at Rs.49.";
  const canonical = "https://thecookoncall.com/chef/" + params.slug;
  const ogImage = chef.user?.profile_photo ?? "/og-default.png";
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, images: [{ url: ogImage }] } };
}

export default async function ChefDetailPage({ params }) {
  const chef = await getChef(params.slug);
  if (!chef) notFound();
  const name = chef.user?.name ?? "Chef";
  const cuisines = chef.cuisines ?? [];
  const rating = Number(chef.rating ?? 0);
  const reviews = chef.total_reviews ?? chef.totalReviews ?? 0;
  const personSchema = { "@context": "https://schema.org", "@type": "Person", name, jobTitle: "Home Chef" };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://thecookoncall.com" },
    { "@type": "ListItem", position: 2, name: "Chefs", item: "https://thecookoncall.com/chef" },
    { "@type": "ListItem", position: 3, name, item: "https://thecookoncall.com/chef/" + params.slug },
  ]};
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <main className="min-h-screen">
        <div className="pt-[88px] pb-16 px-5 max-w-[800px] mx-auto">
          <nav className="text-sm text-gray-400 mb-5">
            <Link href="/">Home</Link> / <Link href="/chef">Chefs</Link> / <span>{name}</span>
          </nav>
          <div className="bg-white rounded-[20px] border mb-6 p-6">
            <h1 className="text-[1.4rem] font-bold">{name}</h1>
            {cuisines.length > 0 && <p className="mt-1">{cuisines.join(", ")}</p>}
            {rating > 0 && <p className="text-orange-500 mt-2">{rating.toFixed(1)} stars ({reviews} reviews)</p>}
            {chef.bio && <p className="mt-4">{chef.bio}</p>}
            <div className="mt-6">
              <Link href={"/chef/detail?id=" + chef.id} className="px-6 py-3 rounded-full bg-orange-500 text-white font-bold">
                View Menu and Book {name}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}