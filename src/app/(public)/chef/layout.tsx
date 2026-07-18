import type { Metadata } from "next";

export const metadata: Metadata = {
  // This page recruits CHEFS — it is not the customer-facing chef
  // listing (that lives at /chefs/ahmedabad). The metadata previously
  // described browsing/booking chefs, so Google ranked it for customer
  // intent and sent buyers to a "join as a chef" page. Titles and copy
  // now match the actual content: chef acquisition.
  title: "Become a Home Chef in Ahmedabad — Earn ₹15,000–₹50,000/month",
  description:
    "Join Ahmedabad's first home chef platform. Zero joining fees, fixed fair pricing, instant UPI payouts. Cook on your own schedule and earn ₹15,000–₹50,000/month.",
  keywords: [
    "home chef jobs Ahmedabad",
    "become a home chef",
    "cook job Ahmedabad",
    "part time cook work Ahmedabad",
    "home chef registration",
    "earn money cooking Ahmedabad",
  ],
  alternates: { canonical: "https://thecookoncall.com/chef" },
  openGraph: {
    title: "Become a Home Chef in Ahmedabad | CookOnCall",
    description:
      "Zero joining fees. Fixed fair pricing. Instant UPI payouts. Join Ahmedabad's first home chef platform.",
    url: "https://thecookoncall.com/chef",
    type: "website",
  },
};

export default function ChefLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Home Chef Booking",
            provider: {
              "@type": "LocalBusiness",
              name: "CookOnCall",
              url: "https://thecookoncall.com",
            },
            areaServed: "Ahmedabad",
            description: "Book verified home chefs in Ahmedabad for private dinners, meal prep and events.",
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: "49",
              description: "Starting at ₹49 visit fee",
            },
          }),
        }}
      />
      {children}
    </>
  );
}