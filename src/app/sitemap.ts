import type { MetadataRoute } from "next";
import { CITY_SLUG, getServiceAreas } from "@/lib/serviceAreas";
export const dynamic = "force-static";

const BASE_URL = "https://thecookoncall.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cookoncall-backend-production-7c6d.up.railway.app/api/v1";

// Fetch all chef IDs at build time
async function getChefIds(): Promise<string[]> {
  try {
    const res = await fetch(
      `${API_BASE}/cooks?limit=50&page=1`,
      { cache: "force-cache" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const cooks = json?.data?.cooks ?? [];
    return cooks.map((c: { id: string }) => String(c.id));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [chefIds, areas] = await Promise.all([getChefIds(), getServiceAreas()]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
     {
      url: `${BASE_URL}/chefs/${CITY_SLUG}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/chef`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: "2025-01-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/refund`,
      lastModified: "2025-01-01",
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: "2025-01-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const chefPages: MetadataRoute.Sitemap = chefIds.map((id) => ({
    url: `${BASE_URL}/chef/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // One entry per real, active service_areas row — /chefs/ahmedabad above
  // stays the city-wide page; areas.length is expected to be ~30+ once the
  // /chefs/[area] route is templated across all of them.
  const areaPages: MetadataRoute.Sitemap = areas
    .filter((a) => a.slug !== CITY_SLUG)
    .map((a) => ({
      url: `${BASE_URL}/chefs/${a.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...staticPages, ...areaPages, ...chefPages];
}