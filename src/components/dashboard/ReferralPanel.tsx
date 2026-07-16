"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Gift,
  Copy,
  Share2,
  Users,
  BadgeCheck,
  Wallet,
  Check,
} from "lucide-react";
import { referralsApi } from "@/lib/api";

const WEB_BASE_URL = "https://thecookoncall.com";

// Keep these in sync with the backend reward constants
// (referrals.service.ts) and the mobile app Refer & Earn screen.
const REFERRER_REWARD = 100; // you earn ₹100 when your friend completes their 1st booking
const REFEREE_DISCOUNT = 50; // your friend gets ₹50 off their 1st booking

interface ReferralData {
  code: string;
  total_referrals: number;
  rewarded_referrals: number;
  total_earned: number;
}

export default function ReferralPanel() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await referralsApi.getMyCode();
        const body = (res.data as any)?.data ?? res.data;
        if (active) setData(body as ReferralData);
      } catch {
        if (active) setError("Could not load your referral details.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const inviteUrl = data ? `${WEB_BASE_URL}/?ref=${data.code}` : WEB_BASE_URL;
  const inviteText = data
    ? `Try CookOnCall — book a home chef in Ahmedabad. Use my code ${data.code} to get ₹${REFEREE_DISCOUNT} off your first booking.\n\n${inviteUrl}`
    : "";

  const handleCopy = async () => {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const handleShare = async () => {
    if (!data?.code) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Get ₹${REFEREE_DISCOUNT} off on CookOnCall`,
          text: inviteText,
        });
        return;
      } catch {
        /* user cancelled or unsupported — fall through to copy */
      }
    }
    // Fallback: copy the full invite text
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* no-op */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-[0.9rem] text-[var(--text-muted)]">
          {error ?? "Something went wrong."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero card */}
      <div className="rounded-[24px] p-7 md:p-9 text-center text-white bg-gradient-to-br from-[var(--orange-500)] to-[#8a2d00] shadow-lg">
        <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
          <Gift className="w-7 h-7" />
        </div>
        <div className="font-display text-[1.5rem] font-[900] leading-tight">
          Invite a friend, get ₹{REFERRER_REWARD}
        </div>
        <p className="text-[0.9rem] text-white/85 mt-2 max-w-md mx-auto">
          Your friend gets ₹{REFEREE_DISCOUNT} off their first booking. You earn
          ₹{REFERRER_REWARD} the moment they complete it.
        </p>

        {/* Code pill */}
        <div className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2.5 mt-5">
          <BadgeCheck className="w-4 h-4 text-[var(--orange-500)]" />
          <span className="font-[800] tracking-[0.15em] text-[var(--orange-500)] text-[1.05rem]">
            {data.code || "—"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <StatTile
          icon={<Users className="w-5 h-5" />}
          label="Invites"
          value={String(data.total_referrals)}
          tone="orange"
        />
        <StatTile
          icon={<BadgeCheck className="w-5 h-5" />}
          label="Rewarded"
          value={String(data.rewarded_referrals)}
          tone="green"
        />
        <StatTile
          icon={<Wallet className="w-5 h-5" />}
          label="Earned"
          value={`₹${Number(data.total_earned).toFixed(0)}`}
          tone="amber"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 bg-[var(--orange-500)] text-white font-semibold text-[0.95rem] rounded-[14px] py-3.5 border-none cursor-pointer hover:opacity-95 transition-opacity"
        >
          <Share2 className="w-[18px] h-[18px] shrink-0" />
          Share invite
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-[var(--orange-500)] font-semibold text-[0.95rem] rounded-[14px] py-3.5 border border-[rgba(212,114,26,0.4)] cursor-pointer hover:bg-[rgba(212,114,26,0.04)] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-[18px] h-[18px] shrink-0" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-[18px] h-[18px] shrink-0" />
              Copy code
            </>
          )}
        </button>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-[20px] p-5 md:p-6 border border-[rgba(212,114,26,0.06)] mt-5">
        <div className="font-display text-[1.15rem] font-[900] text-[var(--brown-800)] mb-3">
          How it works
        </div>
        <ol className="space-y-3 list-none p-0 m-0">
          {[
            "Share your code with a friend who hasn't used CookOnCall.",
            `They enter the code at sign-up and get ₹${REFEREE_DISCOUNT} off their first booking.`,
            `After they complete that booking, ₹${REFERRER_REWARD} is credited to your account.`,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-[rgba(212,114,26,0.12)] text-[var(--orange-500)] text-[0.8rem] font-[800] flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[0.88rem] text-[var(--brown-800)] leading-relaxed">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "orange" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--green-ok)]"
      : tone === "amber"
        ? "text-amber-500"
        : "text-[var(--orange-500)]";
  return (
    <div className="bg-white rounded-[16px] p-4 border border-[rgba(212,114,26,0.06)] text-center">
      <div className={`flex items-center justify-center mb-1.5 ${toneClass}`}>
        {icon}
      </div>
      <div className="font-[800] text-[1.1rem] text-[var(--brown-800)]">
        {value}
      </div>
      <div className="text-[0.72rem] text-[var(--text-muted)] mt-0.5">
        {label}
      </div>
    </div>
  );
}
