// src/components/landing/StatsBar.tsx
const stats = [
  { icon: "rocket", value: "Now Live", label: "in Ahmedabad" },
  { icon: "chart", value: "₹49", label: "Visit fee · transparent" },
  { icon: "user", value: "100%", label: "Aadhaar verified chefs" },
  { icon: "card", value: "UPI / Cards", label: "Secure via Razorpay" },
];

function StatIcon({ name }: { name: string }) {
  const props = {
    className: "w-9 h-9 mx-auto mb-2.5 opacity-90",
    viewBox: "0 0 40 40",
    fill: "none",
  };

  switch (name) {
    case "rocket":
      return (
        <svg {...props}>
          <path
            d="M20 4c4 4 6 9 6 14 0 4-2 7-6 9-4-2-6-5-6-9 0-5 2-10 6-14z"
            stroke="#F0A050"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="16" r="3" stroke="#F0A050" strokeWidth="2.5" />
          <path d="M14 27l-4 6m16-6l4 6M20 27v8" stroke="#F0A050" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path
            d="M12 20h3l2-6 4 12 3-8h4"
            stroke="#F0A050"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="4" y="4" width="32" height="32" rx="6" stroke="#F0A050" strokeWidth="2.5" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <circle cx="20" cy="14" r="6" stroke="#F0A050" strokeWidth="2.5" />
          <path d="M8 35c0-7 5-12 12-12s12 5 12 12" stroke="#F0A050" strokeWidth="2.5" />
        </svg>
      );
    case "card":
      return (
        <svg {...props}>
          <rect x="4" y="8" width="32" height="24" rx="4" stroke="#F0A050" strokeWidth="2.5" />
          <path d="M4 16h32" stroke="#F0A050" strokeWidth="2.5" />
          <circle cx="12" cy="24" r="2.5" fill="#F0A050" />
        </svg>
      );
    default:
      return null;
  }
}

export default function StatsBar() {
  return (
    <section className="bg-[var(--brown-800)] px-6 md:px-12 py-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="text-white">
              <StatIcon name={stat.icon} />
              <div className="font-display text-[1.6rem] sm:text-[1.9rem] font-[800] text-[var(--orange-400)] leading-tight">
                {stat.value}
              </div>
              <div className="text-[0.82rem] text-[rgba(255,255,255,0.65)] mt-1 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[0.78rem] text-[rgba(255,255,255,0.5)] mt-6">
          Expanding to more cities across Gujarat soon · Mobile app coming on Play Store &amp; App Store
        </p>
      </div>
    </section>
  );
}
