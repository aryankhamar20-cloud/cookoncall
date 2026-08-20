import type { Metadata } from "next";
export const metadata: Metadata = {
  // Root layout applies title.template "%s | CookOnCall" — don't repeat the
  // brand here or the <title> tag renders "... | CookOnCall | CookOnCall".
  title: "Terms of Service",
  description: "Read CookOnCall's terms of service. Understand your rights and responsibilities when booking or offering home chef services.",
  alternates: { canonical: "https://thecookoncall.com/terms" },
};
export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}