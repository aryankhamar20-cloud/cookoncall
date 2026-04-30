import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy Policy | CookOnCall",
  description: "CookOnCall's privacy policy. Learn how we collect, use and protect your personal data on our home chef booking platform.",
  alternates: { canonical: "https://thecookoncall.com/privacy" },
};
export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}