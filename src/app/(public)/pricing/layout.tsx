import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pricing — Home Chef Booking Starting at ₹49",
  description: "Transparent pricing for home chef bookings in Ahmedabad. ₹49 visit fee + chef's rate. No hidden charges. Restaurant quality at half the price.",
  alternates: { canonical: "https://thecookoncall.com/pricing" },
};
export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}