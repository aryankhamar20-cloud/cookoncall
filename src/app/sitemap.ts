import type { MetadataRoute } from "next";

const BASE_URL = "https://thecookoncall.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cookoncall-backend-production-7c6d.up.railway.app/api/v1";

// Fetch all chef IDs at build time
async function getChefIds(): Promise<string[]> {
  try {
    const res = await fetch(
      `${API_BASE}/cooks?limit=500&page=1`,
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
  const chefIds = await getChefIds();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
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

  return [...staticPages, ...chefPages];
}