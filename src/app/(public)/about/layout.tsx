import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "About CookOnCall — Ahmedabad's Home Chef Platform",
  description: "CookOnCall connects Ahmedabad families with talented home chefs. Learn our story, mission and how we verify every chef on our platform.",
  alternates: { canonical: "https://thecookoncall.com/about" },
};
export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}