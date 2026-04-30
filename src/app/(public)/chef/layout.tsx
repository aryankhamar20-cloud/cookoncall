import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Home Chefs in Ahmedabad",
  description: "Find and book verified home chefs in Ahmedabad. Filter by cuisine — Gujarati, Punjabi, South Indian & more. Fresh meals cooked in your kitchen.",
  alternates: { canonical: "https://thecookoncall.com/chef" },
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