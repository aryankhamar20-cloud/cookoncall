import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/chef",
          "/about",
          "/contact",
          "/pricing",
          "/privacy",
          "/refund",
          "/terms",
        ],
        disallow: [
          "/login",
          "/dashboard/",
          "/api/",
          "/_next/",
        ],
      },
    ],
    sitemap: "https://thecookoncall.com/sitemap.xml",
    host: "https://thecookoncall.com",
  };
}