import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://thecookoncall.com"),

  title: {
    default: "CookOnCall — Book a Home Chef in Ahmedabad",
    template: "%s | CookOnCall",
  },

  description:
    "Book a professional home chef in Ahmedabad. Fresh ingredients, restaurant-quality meals, cooked right in your kitchen. Starting at ₹49.",

  keywords: [
    "home chef",
    "cook on call",
    "Ahmedabad",
    "personal chef",
    "home cooking",
    "private chef Ahmedabad",
    "meal prep chef",
  ],

  authors: [{ name: "CookOnCall", url: "https://thecookoncall.com" }],

  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },

  alternates: {
    canonical: "https://thecookoncall.com",
  },

  openGraph: {
    siteName: "CookOnCall",
    title: "CookOnCall — Your Personal Chef, At Your Door",
    description:
      "Book a professional home chef in Ahmedabad. Fresh ingredients, restaurant-quality meals, cooked right in your kitchen. Starting at ₹49.",
    url: "https://thecookoncall.com",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "CookOnCall — Book a Home Chef in Ahmedabad",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CookOnCall — Your Personal Chef, At Your Door",
    description:
      "Book a professional home chef in Ahmedabad. Fresh ingredients & restaurant-quality meals, starting at ₹49.",
    images: ["/og-default.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  verification: {
    google: "NGjNIUYoCLYPBQZbBZ_zjVw1R96V-O1hnK0LxOnzUiE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "CookOnCall",
              description:
                "Ahmedabad's first home chef booking platform. Restaurant-quality meals cooked in your kitchen.",
              url: "https://thecookoncall.com",
              telephone: "+91 9081444326",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Ahmedabad",
                addressRegion: "Gujarat",
                addressCountry: "IN",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 23.0225,
                longitude: 72.5714,
              },
              priceRange: "₹₹",
              servesCuisine: [
                "Gujarati",
                "Punjabi",
                "South Indian",
                "Continental",
              ],
              areaServed: "Ahmedabad",
            }),
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 2800,
            style: {
              background: "#1A0F0A",
              color: "#fff",
              borderRadius: "50px",
              padding: "12px 28px",
              fontSize: "0.9rem",
              fontWeight: 500,
              fontFamily: '"DM Sans", sans-serif',
              boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
            },
          }}
        />
      </body>
    </html>
  );
}