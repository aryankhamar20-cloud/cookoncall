import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL('https://thecookoncall.com'),
  title: "CookOnCall — Book a Home Chef in Ahmedabad",
  description:
    "Book a professional home chef in Ahmedabad. Fresh ingredients, restaurant-quality meals, cooked right in your kitchen. Starting at ₹49.",
  keywords: ["home chef", "cook on call", "Ahmedabad", "personal chef", "home cooking"],
  alternates: {
    canonical: 'https://thecookoncall.com',
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "CookOnCall — Your Personal Chef, At Your Door",
    description: "Book a professional home chef in minutes.",
    url: 'https://thecookoncall.com',
    type: "website",
    locale: "en_IN",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
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