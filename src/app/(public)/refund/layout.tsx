import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | CookOnCall",
  description: "CookOnCall's refund and cancellation policy. Cancel 24h before for full refund. Understand chef cancellation and platform refund timelines.",
  alternates: { canonical: "https://thecookoncall.com/refund" },
};
export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}