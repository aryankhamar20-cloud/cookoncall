import type { Metadata } from "next";
export const metadata: Metadata = {
  // Root layout applies title.template "%s | CookOnCall" — don't repeat the
  // brand here or the <title> tag renders "... | CookOnCall | CookOnCall".
  title: "Refund & Cancellation Policy",
  description: "CookOnCall's refund and cancellation policy. Cancel 24h before for full refund. Understand chef cancellation and platform refund timelines.",
  alternates: { canonical: "https://thecookoncall.com/refund" },
};
export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}