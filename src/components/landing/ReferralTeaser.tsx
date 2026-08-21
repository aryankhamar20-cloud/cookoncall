import Link from "next/link";
import { Gift, ChefHat } from "lucide-react";

// Referral teaser — surfaces both live referral programs on the homepage.
// Neither reward number is invented: ₹100/₹50 customer referral matches
// REFERRER_REWARD/REFEREE_DISCOUNT in
// src/components/dashboard/ReferralPanel.tsx, and the ₹500 chef-referral
// reward matches CHEF_REFERRER_REWARD in
// cookoncall-backend/src/modules/referrals/referrals.service.ts. This
// section doesn't expose an actual referral code — there isn't one until
// signup — it just sets the expectation up front (see
// docs/33_COPY_SUGGESTIONS.md Part A5 and Part D).
const cards = [
  {
    icon: <Gift className="w-7 h-7" />,
    title: "Invite a Friend, Earn ₹100",
    desc: "Share your code with a friend who hasn't tried CookOnCall. They get ₹50 off their first booking — you earn ₹100 the moment they complete it.",
  },
  {
    icon: <ChefHat className="w-7 h-7" />,
    title: "Refer a Chef, Earn ₹500",
    desc: "Know a great home cook? Refer them to CookOnCall — you earn ₹500 the moment they get verified. No limit on how many you refer.",
  },
];

export default function ReferralTeaser() {
  return (
    <section className="py-[100px] px-6 md:px-12">
      <div className="max-w-[1200px] mx-auto text-center">
        <div className="text-[0.8rem] tracking-[2.5px] uppercase text-[var(--orange-500)] font-bold mb-3">
          Earn With CookOnCall
        </div>
        <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-[var(--brown-800)] mb-3">
          KNOW SOMEONE WHO&apos;D LOVE THIS?
        </h2>
        <p className="text-[1.05rem] text-[var(--text-muted)] max-w-[560px] mx-auto mb-14">
          Referral rewards unlock right after you sign up — no waiting, no fine print.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-12 text-left max-w-[840px] mx-auto">
          {cards.map((c) => (
            <div
              key={c.title}
              className="bg-white border-[1.5px] border-[rgba(212,114,26,0.1)] rounded-[20px] px-8 py-10 transition-all duration-300 hover:border-[var(--orange-500)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(212,114,26,0.1)]"
            >
              <div className="w-14 h-14 rounded-2xl bg-[rgba(212,114,26,0.08)] flex items-center justify-center mb-5 text-[var(--orange-500)]">
                {c.icon}
              </div>
              <h3 className="font-bold text-[1.15rem] mb-2.5">{c.title}</h3>
              <p className="text-[0.9rem] text-[var(--text-muted)] leading-[1.65]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/login?tab=signup"
          className="group inline-block px-9 py-4 rounded-full bg-[var(--orange-500)] text-white font-bold text-[1.05rem] no-underline shadow-[0_4px_20px_rgba(212,114,26,0.3)] transition-all duration-300 hover:bg-[var(--orange-400)] hover:-translate-y-0.5"
        >
          Sign Up Free{" "}
          <span className="inline-block ml-1.5 transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
