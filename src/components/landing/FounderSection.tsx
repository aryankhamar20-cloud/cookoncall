import { APP_CONFIG } from "@/lib/utils";

export default function FounderSection() {
  return (
    <section className="py-[100px] px-6 md:px-12 max-w-[900px] mx-auto text-center">
      <div className="text-[0.8rem] tracking-[2.5px] uppercase text-[var(--orange-500)] font-bold mb-3">
        Our Story
      </div>
      <h2 className="font-display text-[clamp(2rem,3.5vw,2.8rem)] font-[900] text-[var(--brown-800)] mb-3">
        WHY WE STARTED COOKONCALL
      </h2>

      <div className="bg-white border-[1.5px] border-[rgba(212,114,26,0.12)] rounded-[24px] px-8 md:px-12 py-12 md:py-[52px] relative mt-9">
        {/* Quote mark */}
        <div className="font-display text-[5rem] text-[var(--orange-500)] opacity-25 leading-none absolute top-5 left-6 md:left-9">
          &ldquo;
        </div>

        <p className="text-[1.18rem] leading-[1.8] text-[var(--brown-700)] italic relative z-[1]">
          &ldquo;In Ahmedabad, everyone loves ghar ka khana — but not everyone
          has the time to cook. We&apos;re building CookOnCall to bring
          professional chefs to your kitchen, so you can enjoy fresh, home-cooked
          meals without the hassle.&rdquo;
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--orange-500)] text-white flex items-center justify-center font-[800] text-[1.1rem]">
            A
          </div>
          <div className="text-left">
            <div className="font-bold text-base">{APP_CONFIG.founders}</div>
            <div className="text-[0.85rem] text-[var(--text-muted)]">
              Founder and Co-Founder, CookOnCall · {APP_CONFIG.city},{" "}
              {APP_CONFIG.year}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
