import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Terms of Service | CookOnCall",
  description: "Read CookOnCall's terms of service. Understand your rights and responsibilities when booking or offering home chef services.",
  alternates: { canonical: "https://thecookoncall.com/terms" },
};
export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}