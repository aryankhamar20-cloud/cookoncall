import Link from "next/link";

const benefits = [
  {
    title: "Earn ₹15,000–₹50,000/month",
    desc: "Set your own menu prices. Get paid directly to your bank account after every booking.",
    icon: (
      <svg className="w-[52px] h-[52px] mx-auto mb-5" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r="24" stroke="#D4721A" strokeWidth="2" />
        <text x="26" y="32" textAnchor="middle" fontSize="22" fill="#D4721A" fontWeight="700">₹</text>
      </svg>
    ),
  },
  {
    title: "Your Schedule, Your Rules",
    desc: "Accept or decline bookings as they come. Work mornings, evenings, weekends — whatever works for you.",
    icon: (
      <svg className="w-[52px] h-[52px] mx-auto mb-5" viewBox="0 0 52 52" fill="none">
        <rect x="6" y="6" width="40" height="40" rx="8" stroke="#D4721A" strokeWidth="2" />
        <line x1="6" y1="18" x2="46" y2="18" stroke="#D4721A" strokeWidth="2" />
        <circle cx="26" cy="24" r="3" fill="#D4721A" />
      </svg>
    ),
  },
  {
    title: "Build Your Brand",
    desc: "Get your own chef profile, collect ratings, and build a reputation that brings repeat customers back to you.",
    icon: (
      <svg className="w-[52px] h-[52px] mx-auto mb-5" viewBox="0 0 52 52" fill="none">
        <path d="M10 38L18 22L26 30L34 14L42 26" stroke="#D4721A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6" y="6" width="40" height="40" rx="8" stroke="#D4721A" strokeWidth="2" />
      </svg>
    ),
  },
];

export default function ForChefs() {
  return (
    <section
      className="bg-gradient-to-b from-[var(--cream-200)] to-[var(--cream-100)] py-[100px] px-6 md:px-12"
      id="features"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Intro */}
        <div className="mb-14">
          <div className="text-[0.8rem] tracking-[2.5px] uppercase text-[var(--orange-500)] font-bold mb-3">
            For Chefs
          </div>
          <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-[var(--brown-800)] mb-3">
            JOIN AHMEDABAD&apos;S FIRST HOME CHEF PLATFORM
          </h2>
          <p className="text-[1.05rem] text-[var(--text-muted)] max-w-[560px] mt-3">
            Set your own hours, your own prices, and cook what you love. We take only 2.5% — you keep the rest.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-12">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white border-[1.5px] border-[rgba(212,114,26,0.1)] rounded-[20px] px-8 py-10 text-center transition-all duration-300 hover:border-[var(--orange-500)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(212,114,26,0.1)]"
            >
              {b.icon}
              <h3 className="font-bold text-[1.15rem] mb-2.5">{b.title}</h3>
              <p className="text-[0.9rem] text-[var(--text-muted)] leading-[1.65]">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/chef"
            className="inline-block px-10 py-4 rounded-full bg-[var(--brown-800)] text-white font-bold text-base no-underline transition-all duration-300 hover:bg-[var(--brown-700)] hover:-translate-y-0.5"
          >
            Join as a Chef — It&apos;s Free →
          </Link>
          <p className="text-[0.85rem] text-[var(--text-muted)] mt-3">
            No fees to join. Start earning from your first booking. No monthly charges, no hidden costs. Just cook and earn!
          </p>
        </div>
      </div>
    </section>
  );
}
