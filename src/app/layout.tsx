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
    default: "Book a Home Chef in Ahmedabad | CookOnCall",
    template: "%s | CookOnCall",
  },

  description:
    "Hire verified home chefs in Ahmedabad for daily cooking, parties & events. 50+ chefs available. Book in minutes, cancel anytime. Starting ₹600/session.",

  keywords: [
    "home chef Ahmedabad",
    "cook on call",
    "hire home chef",
    "personal chef Ahmedabad",
    "home cooking service",
    "private chef Ahmedabad",
    "book chef at home",
    "home chef near me",
    "daily cook Ahmedabad",
  ],

  authors: [{ name: "CookOnCall", url: "https://thecookoncall.com" }],

  icons: {
    icon: "/favicon_io/favicon.ico",
    shortcut: "/favicon_io/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
  },

  alternates: {
    canonical: "https://thecookoncall.com/",
    languages: {
      "en-IN": "https://thecookoncall.com/",
      "x-default": "https://thecookoncall.com/",
    },
  },

  openGraph: {
    siteName: "CookOnCall",
    title: "Book a Home Chef in Ahmedabad | CookOnCall",
    description:
      "Hire verified home chefs in Ahmedabad for daily cooking, parties & events. 50+ chefs. Book in minutes. Starting ₹600/session.",
    url: "https://thecookoncall.com/",
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
    title: "Book a Home Chef in Ahmedabad | CookOnCall",
    description:
      "Verified home chefs in Ahmedabad. Restaurant-quality meals in your kitchen. Starting ₹600/session.",
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

/* ─── Structured Data Schemas ─────────────────────────────────────── */

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://thecookoncall.com/#business",
  name: "CookOnCall",
  description:
    "Ahmedabad's first home chef booking platform. Restaurant-quality meals cooked in your kitchen by verified chefs.",
  url: "https://thecookoncall.com",
  telephone: "+91-9081444326",
  email: "support@thecookoncall.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ahmedabad",
    addressRegion: "Gujarat",
    postalCode: "380001",
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
    "Chinese",
  ],
  areaServed: { "@type": "City", name: "Ahmedabad" },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "07:00",
      closes: "22:00",
    },
  ],
  sameAs: [],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "50",
    bestRating: "5",
    worstRating: "1",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://thecookoncall.com/#website",
  url: "https://thecookoncall.com",
  name: "CookOnCall",
  description: "Book a home chef in Ahmedabad",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate:
        "https://thecookoncall.com/chef?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much does a home chef cost in Ahmedabad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Home chefs in Ahmedabad typically charge ₹600–₹900 for a family of 4. This includes a visit fee (₹49–₹79 based on distance) and a 2.5% convenience fee. You provide the ingredients or the chef brings them as an optional add-on.",
      },
    },
    {
      "@type": "Question",
      name: "How do I book a home chef on CookOnCall?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Browse verified chefs at thecookoncall.com/chef, select a chef, choose your date and menu, and pay online via Razorpay. The chef comes to your home and cooks fresh in your kitchen. Booking takes under 2 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "Are the home chefs on CookOnCall verified?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Every chef on CookOnCall goes through identity verification (Aadhaar + PAN), FSSAI food safety check, and is personally reviewed by our admin team before being listed.",
      },
    },
    {
      "@type": "Question",
      name: "What cuisines can I get cooked at home in Ahmedabad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CookOnCall chefs in Ahmedabad specialize in Gujarati, Punjabi, South Indian, Continental, and Chinese cuisines. You can filter by cuisine on our chef listing page.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel a home chef booking?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You get 100% refund if you cancel 24+ hours before. 75% for 8+ hours, 50% for 4+ hours, 25% for 2+ hours. Under 2 hours — no refund. Chef-initiated cancellations always get 100% refund.",
      },
    },
  ],
};

/* ─── Root Layout ─────────────────────────────────────────────────── */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="alternate"
          hrefLang="en-IN"
          href="https://thecookoncall.com/"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://thecookoncall.com/"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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