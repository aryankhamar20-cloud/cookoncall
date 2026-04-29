const steps = [
  {
    number: 1,
    title: "Browse & Pick a Chef",
    desc: "Browse cuisines — Gujarati, Punjabi, South Indian, Chinese & more. Pick what you love.",
    icon: (
      <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="4" width="36" height="40" rx="6" stroke="#D4721A" strokeWidth="2.5" />
        <path d="M16 16h16M16 24h12M16 32h8" stroke="#D4721A" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Pick Date & Time",
    desc: "Select when you want your chef to arrive — breakfast, lunch, dinner, or a special event.",
    icon: (
      <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="18" stroke="#D4721A" strokeWidth="2.5" />
        <path d="M24 12v12l8 5" stroke="#D4721A" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Get Matched",
    desc: "Chef Confirms & You Pay a verified, FSSAI-compliant chef based on your preferences.",
    icon: (
      <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="18" r="10" stroke="#D4721A" strokeWidth="2.5" />
        <path d="M10 42c0-8 6-14 14-14s14 6 14 14" stroke="#D4721A" strokeWidth="2.5" />
        <path d="M30 16l2 2 5-5" stroke="#D4721A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: 4,
    title: "Enjoy Fresh Meals",
    desc: "Your chef arrives andcooks fresh in your kitchen, with ingredients you've kept ready. Just sit back and enjoy!",
    icon: (
      <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="36" rx="16" ry="3" fill="rgba(212,114,26,0.15)" />
        <rect x="8" y="30" rx="2" width="32" height="5" fill="#D4721A" />
        <path d="M12 30c0-10 5-18 12-18s12 8 12 18" stroke="#D4721A" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="py-[100px] px-6 md:px-12 max-w-[1200px] mx-auto" id="how-it-works">
      <div className="text-[0.8rem] tracking-[2.5px] uppercase text-[var(--orange-500)] font-bold mb-3">
        Simple Process
      </div>
      <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-[var(--brown-800)] mb-3">
        HOW COOKONCALL WORKS
      </h2>
      <p className="text-[1.05rem] text-[var(--text-muted)] max-w-[560px] mb-14 leading-[1.7]">
        From booking to a beautiful home-cooked meal — in 4 simple steps.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 relative">
        {/* Dashed connector line (desktop only) */}
        <div className="hidden lg:block absolute top-[38px] left-[12%] right-[12%] h-0.5 bg-[repeating-linear-gradient(90deg,var(--orange-500)_0,var(--orange-500)_8px,transparent_8px,transparent_16px)] z-0" />

        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white rounded-[20px] px-7 py-9 text-center relative z-[1] border border-[rgba(212,114,26,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(26,15,10,0.08)]"
          >
            <div className="w-11 h-11 rounded-full bg-[var(--orange-500)] text-white flex items-center justify-center font-[800] text-[1.1rem] mx-auto mb-5">
              {step.number}
            </div>
            {step.icon}
            <h3 className="font-bold text-[1.05rem] mb-2">{step.title}</h3>
            <p className="text-[0.88rem] text-[var(--text-muted)] leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
