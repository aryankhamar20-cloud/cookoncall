import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Contact CookOnCall — We're Here to Help",
  description: "Have a question about booking a chef in Ahmedabad? Reach CookOnCall via WhatsApp or email. We reply within 24 hours.",
  alternates: { canonical: "https://thecookoncall.com/contact" },
};
export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}