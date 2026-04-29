import Link from "next/link";

export default function CTASection() {
  return (
    <section className="bg-[var(--brown-800)] py-20 px-6 md:px-12 text-center">
      <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-white mb-2">
        READY TO EAT{" "}
        <span className="text-[var(--orange-500)]">BETTER?</span>
      </h2>
      <p className="text-[rgba(255,255,255,0.65)] text-[1.05rem] mb-9">
        Book your first home chef today. Fresh, affordable, and hassle-free.
      </p>
      <div className="flex gap-4 justify-center flex-wrap">
        <Link
          href="/login?tab=signup"
          className="group px-9 py-4 rounded-full bg-[var(--orange-500)] text-white font-bold text-[1.05rem] no-underline shadow-[0_4px_20px_rgba(212,114,26,0.3)] transition-all duration-300 hover:bg-[var(--orange-400)] hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(212,114,26,0.4)] inline-block"
        >
          Get Started Free{" "}
          <span className="inline-block ml-1.5 transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
        <Link
          href="/chef"
          className="px-9 py-4 rounded-full border-[1.5px] border-[rgba(255,255,255,0.3)] text-white font-semibold text-[0.95rem] no-underline transition-all duration-300 hover:bg-[rgba(255,255,255,0.08)] hover:-translate-y-0.5 inline-block"
        >
          I&apos;m a Chef
        </Link>
      </div>
    </section>
  );
}
