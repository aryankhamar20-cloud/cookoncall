import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--cream-100)] flex items-center justify-center p-5">
      <div className="text-center max-w-[400px]">
        <div className="font-display font-[900] text-[1.5rem] text-[var(--brown-800)] mb-8">
          COOK<span className="text-[var(--orange-500)]">ONCALL</span>
        </div>
        <div className="font-display text-[5rem] font-[900] text-[var(--orange-500)] leading-none mb-2">
          404
        </div>
        <h1 className="font-display text-[1.3rem] font-[900] text-[var(--brown-800)] mb-3">
          Page Not Found
        </h1>
        <p className="text-[0.9rem] text-[var(--text-muted)] mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-6 py-3 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] no-underline transition-all hover:bg-[var(--orange-400)]"
          >
            Go Home
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-full bg-white border-[1.5px] border-[var(--brown-800)] text-[var(--brown-800)] font-semibold text-[0.9rem] no-underline transition-all hover:bg-[var(--brown-800)] hover:text-white"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
