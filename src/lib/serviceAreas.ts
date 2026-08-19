// Build-time helper for the /chefs/[area] programmatic SEO pages and the
// sitemap. Mirrors the plain-fetch pattern already used by
// (public)/chefs/ahmedabad/page.tsx and (chefslug)/chef/[slug]/page.tsx —
// this app is `output: 'export'`, so these calls only ever run at build
// time (generateStaticParams / generateMetadata / the page itself), never
// in the browser.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cookoncall-backend-production-7c6d.up.railway.app/api/v1";

export interface ServiceArea {
  id: string;
  slug: string;
  name: string;
  region: string;
  city: string;
  is_active: boolean;
  sort_order: number;
}

/** The city-wide chefs page keeps living at /chefs/ahmedabad. No row in
 * `service_areas` uses this slug (areas are neighbourhoods, not the city
 * itself), so it's safe as a sentinel for "no area filter — show the
 * whole city." */
export const CITY_SLUG = "ahmedabad";
export const CITY_NAME = "Ahmedabad";

export async function getServiceAreas(): Promise<ServiceArea[]> {
  try {
    const res = await fetch(`${API_BASE}/areas`, { cache: "force-cache" });
    if (!res.ok) return [];
    const json = await res.json();
    const areas = json?.data ?? [];
    return Array.isArray(areas) ? areas : [];
  } catch {
    return [];
  }
}

export async function getServiceAreaBySlug(
  slug: string,
): Promise<ServiceArea | null> {
  const areas = await getServiceAreas();
  return areas.find((a) => a.slug === slug) ?? null;
}
