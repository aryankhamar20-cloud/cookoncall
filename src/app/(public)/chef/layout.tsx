import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Home Chefs in Ahmedabad",
  description:
    "Find and book verified home chefs in Ahmedabad. Filter by cuisine — Gujarati, Punjabi, South Indian & more. Fresh meals cooked in your kitchen.",
  alternates: { canonical: "https://thecookoncall.com/chef" },
};

export default function ChefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}