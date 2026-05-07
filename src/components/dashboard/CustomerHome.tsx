"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore, type HomeOccasion } from "@/stores/uiStore";
import { useBookingStore } from "@/stores/bookingStore";
import { cooksApi, bookingsApi, addressesApi } from "@/lib/api";
import { getGreeting, getInitials } from "@/lib/utils";
import type { Cook, Booking, Address } from "@/types";
import {
  ChefHat,
  Truck,
  MapPin,
  Star,
  BadgeCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  Leaf,
  Cake,
  Calendar,
  Utensils,
  PartyPopper,
} from "lucide-react";

// ─── Occasion chip config ─────────────────────────────────
const OCCASIONS: {
  key: HomeOccasion;
  label: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  { key: "birthday", label: "Birthday", icon: <Cake className="w-4 h-4" />, accent: "bg-pink-50 text-pink-700 border-pink-100" },
  { key: "daily", label: "Daily Cook", icon: <Utensils className="w-4 h-4" />, accent: "bg-amber-50 text-amber-700 border-amber-100" },
  { key: "weekend", label: "Weekend Feast", icon: <Calendar className="w-4 h-4" />, accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { key: "party", label: "Party / Event", icon: <PartyPopper className="w-4 h-4" />, accent: "bg-violet-50 text-violet-700 border-violet-100" },
];

// ─── Helpers (tolerant of dual naming) ────────────────────
const chefName = (c: Cook) =>
  `${c.user?.name || ""} ${c.user?.lastName || ""}`.trim() || "Chef";
const chefRating = (c: Cook) =>
  typeof c.rating === "string" ? parseFloat(c.rating) : c.rating || 0;
const chefReviews = (c: Cook) =>
  c.totalReviews ?? c.total_reviews ?? 0;
const chefVeg = (c: Cook) => c.isVegOnly ?? c.is_veg_only ?? false;
const chefFssai = (c: Cook) => !!c.fssai_url;

// ─── Upcoming booking detector ────────────────────────────
function findUpcoming(bookings: Booking[]): Booking | null {
  const active = bookings.filter(
    (b) =>
      b.status === "confirmed" ||
      b.status === "in_progress" ||
      b.status === "awaiting_payment" ||
      b.status === "pending_chef_approval" ||
      b.status === "pending",
  );
  active.sort(
    (a, b) =>
      new Date((a as any).scheduled_at ?? a.scheduledAt).getTime() -
      new Date((b as any).scheduled_at ?? b.scheduledAt).getTime(),
  );
  return active[0] || null;
}

// ─── Quick rebook: last 3 unique completed chefs ──────────
function findRebookChefs(bookings: Booking[]): Cook[] {
  const seen = new Set<string>();
  const result: Cook[] = [];
  const completed = bookings
    .filter((b) => b.status === "completed" && b.cook)
    .sort(
      (a, b) =>
        new Date((b as any).completed_at || (b as any).created_at || b.createdAt).getTime() -
        new Date((a as any).completed_at || (a as any).created_at || a.createdAt).getTime(),
    );
  for (const b of completed) {
    if (b.cook?.id && !seen.has(b.cook.id)) {
      seen.add(b.cook.id);
      result.push(b.cook);
      if (result.length >= 3) break;
    }
  }
  return result;
}

export default function CustomerHome() {
  const { user } = useAuthStore();
  const { setPanel, setHomeOccasion } = useUIStore();
  const { openBookingModal } = useBookingStore();
  const greeting = getGreeting();

  // ─── All state declarations together ─────────────────────
  const [featuredChefs, setFeaturedChefs] = useState<Cook[]>([]);
  const [chefCount, setChefCount] = useState<number>(0);
  const [upcoming, setUpcoming] = useState<Booking | null>(null);
  const [rebookChefs, setRebookChefs] = useState<Cook[]>([]);
  const [loadingChefs, setLoadingChefs] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [chefsRes, bookingsRes, addressRes] = await Promise.all([
          cooksApi.search({ sort_by: "rating", limit: 8 }),
          bookingsApi.getAll({ limit: 20 }).catch(() => null),
          addressesApi.getAll().catch(() => null),
        ]);

        if (!mounted) return;

        const chefsData = chefsRes.data?.data ?? chefsRes.data ?? {};
        const list: Cook[] = chefsData.cooks ?? [];
        const total: number = chefsData.pagination?.total ?? list.length;
        setFeaturedChefs(list);
        setChefCount(total);

        if (bookingsRes) {
          const bookingsData = bookingsRes.data?.data ?? bookingsRes.data ?? {};
          const bookings: Booking[] =
            bookingsData.bookings ?? bookingsData ?? [];
          if (Array.isArray(bookings)) {
            setUpcoming(findUpcoming(bookings));
            setRebookChefs(findRebookChefs(bookings));
          }
        }

        if (addressRes) {
          const addrData = addressRes.data?.data ?? addressRes.data ?? [];
          if (mounted) setSavedAddresses(Array.isArray(addrData) ? addrData : []);
        }

      } catch {
        // Silent — UI degrades gracefully
      } finally {
        if (mounted) setLoadingChefs(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const firstName = useMemo(
    () => (user?.name || "there").split(" ")[0],
    [user?.name],
  );

  // ─── Address display for greeting strip ──────────────────
  const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0] || null;
  const addressDisplay = defaultAddr
    ? `${defaultAddr.house_no}, ${defaultAddr.area}, ${defaultAddr.city}`
    : null;

  const handleOccasion = (key: HomeOccasion) => {
    setHomeOccasion(key);
    setPanel("book-chef");
  };

  const handleRebook = (cook: Cook) => {
    // Switch to Book a Chef panel with this chef pre-selected.
    // BookChefPanel will read selectedChef from the store and auto-open the
    // booking modal — reusing the full booking flow (PaymentModal lives there).
    openBookingModal(cook);          // sets selectedChef + showBookingModal=true in store
    setPanel("book-chef");           // navigate to the panel that actually renders PaymentModal
  };

  const handleChefClick = (cook: Cook) => {
    openBookingModal(cook);
    setPanel("book-chef");
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* ═══ 1. GREETING STRIP ═══════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <div>
          <div className="text-[0.8rem] text-[var(--text-muted)] font-medium">
            {greeting}
          </div>
          <div className="font-display text-[1.5rem] sm:text-[1.7rem] font-[900] text-[var(--brown-800)] leading-tight">
            Hi <span className="text-[var(--orange-500)]">{firstName}</span> 👋
          </div>
        </div>
        <button
          onClick={() => setPanel("profile")}
          className="inline-flex items-center gap-1.5 text-[0.8rem] text-[var(--text-muted)] hover:text-[var(--brown-800)] bg-white border border-[rgba(212,114,26,0.08)] rounded-full px-3 py-1.5 transition-colors self-start sm:self-auto"
        >
          <MapPin className="w-3.5 h-3.5 text-[var(--orange-500)]" />
          <span className="max-w-[200px] truncate">
            {addressDisplay || "Add delivery address"}
          </span>
          <span className="text-[var(--orange-500)] font-semibold">
            {addressDisplay ? "Change" : "Add"}
          </span>
        </button>
      </div>

      {/* ═══ 2. UPCOMING BOOKING BANNER (conditional) ═══════ */}
      {upcoming && (
        <button
          onClick={() => setPanel("orders")}
          className="w-full text-left bg-gradient-to-r from-[var(--orange-500)] to-[var(--orange-400)] rounded-[16px] p-4 md:p-5 mb-5 flex items-center justify-between gap-3 hover:shadow-[0_8px_24px_rgba(212,114,26,0.2)] transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[0.7rem] text-white/80 font-semibold uppercase tracking-wide">
                  Upcoming · {upcoming.status.replace(/_/g, " ")}
              </div>
              <div className="text-white font-bold text-[0.95rem] truncate">
                {chefName(upcoming.cook)} ·{" "}
                {new Date((upcoming as any).scheduled_at ?? upcoming.scheduledAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white shrink-0" />
        </button>
      )}

      {/* ═══ 3. HERO / PRIMARY CTA ═══════════════════════════ */}
      <div className="bg-white rounded-[20px] p-6 md:p-8 mb-6 border border-[rgba(212,114,26,0.06)]">
        <div className="font-display text-[1.3rem] md:text-[1.55rem] font-[900] text-[var(--brown-800)] leading-snug">
          Book a chef to cook{" "}
          <span className="text-[var(--orange-500)]">at your home</span>
        </div>

        {/* Honest count — only show if ≥ 3 */}
        {!loadingChefs && chefCount >= 3 && (
          <div className="inline-flex items-center gap-1.5 mt-2 bg-[var(--cream-100)] px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-ok)] animate-pulse" />
            <span className="text-[0.78rem] font-semibold text-[var(--brown-800)]">
              {chefCount} verified chefs available in Ahmedabad
            </span>
          </div>
        )}

        <p className="text-[0.88rem] text-[var(--text-muted)] mt-3 leading-relaxed max-w-md">
          Fresh, home-cooked meals prepared in your kitchen by Aadhaar-verified
          professionals.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5">
          <button
            onClick={() => setPanel("book-chef")}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[var(--orange-500)] text-white font-bold text-[0.95rem] border-none cursor-pointer transition-all hover:bg-[var(--orange-400)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(212,114,26,0.3)]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <ChefHat className="w-4.5 h-4.5" />
            Book a Chef
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setPanel("order-food")}
            className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-[var(--brown-800)] hover:text-[var(--orange-500)] transition-colors bg-transparent border-none cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            or get fresh meals delivered to you
          </button>
        </div>
      </div>

      {/* ═══ 4. OCCASION CHIPS ══════════════════════════════ */}
      <div className="mb-6">
        <div className="font-bold text-[0.95rem] text-[var(--brown-800)] mb-3">
          What's the occasion?
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {OCCASIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => handleOccasion(o.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-[0.82rem] font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm ${o.accent}`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 5. FEATURED CHEFS ══════════════════════════════ */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="font-display text-[1.15rem] font-[900] text-[var(--brown-800)]">
              Top chefs in Ahmedabad
            </div>
            <div className="text-[0.78rem] text-[var(--text-muted)]">
              Highest rated, verified
            </div>
          </div>
          <button
            onClick={() => setPanel("book-chef")}
            className="text-[0.82rem] font-semibold text-[var(--orange-500)] hover:text-[var(--orange-400)] bg-transparent border-none cursor-pointer inline-flex items-center gap-1"
          >
            See all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingChefs ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[240px] h-[260px] bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] animate-pulse"
              />
            ))}
          </div>
        ) : featuredChefs.length === 0 ? (
          <div className="bg-white rounded-[16px] p-8 border border-[rgba(212,114,26,0.06)] text-center">
            <ChefHat className="w-10 h-10 text-[var(--orange-500)] mx-auto mb-2 opacity-60" />
            <div className="font-semibold text-[0.9rem] text-[var(--brown-800)]">
              Chefs are coming soon to your area
            </div>
            <div className="text-[0.8rem] text-[var(--text-muted)] mt-1">
              We're onboarding verified chefs across Ahmedabad
            </div>
          </div>
        ) : (
          <div
            className={
              featuredChefs.length >= 3
                ? "flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
                : "grid grid-cols-1 sm:grid-cols-2 gap-3"
            }
          >
            {featuredChefs.map((chef) => (
              <ChefCard
                key={chef.id}
                chef={chef}
                onClick={() => handleChefClick(chef)}
                horizontal={featuredChefs.length >= 3}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ 6. QUICK REBOOK (conditional) ══════════════════ */}
      {rebookChefs.length > 0 && (
        <div className="mb-6">
          <div className="font-display text-[1.1rem] font-[900] text-[var(--brown-800)] mb-3">
            Book again
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rebookChefs.map((chef) => (
              <button
                key={chef.id}
                onClick={() => handleRebook(chef)}
                className="bg-white rounded-[14px] p-4 border border-[rgba(212,114,26,0.06)] flex items-center gap-3 text-left cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(26,15,10,0.06)]"
              >
                <ChefAvatar chef={chef} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[0.88rem] text-[var(--brown-800)] truncate">
                    {chefName(chef)}
                  </div>
                  <div className="text-[0.75rem] text-[var(--text-muted)] flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[var(--orange-500)] text-[var(--orange-500)]" />
                    {chefRating(chef).toFixed(1)} · Book again
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--orange-500)] shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 7. TRUST STRIP ═════════════════════════════════ */}
      <div className="bg-[var(--cream-100)] rounded-[16px] p-4 md:p-5 border border-[rgba(212,114,26,0.06)] flex flex-wrap items-center justify-around gap-3 text-center">
        <TrustItem
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Aadhaar-verified chefs"
        />
        <TrustItem
          icon={<BadgeCheck className="w-4 h-4" />}
          label="FSSAI food safety"
        />
        <TrustItem
          icon={<Star className="w-4 h-4" />}
          label="Rated & reviewed"
        />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function ChefAvatar({ chef, size = 56 }: { chef: Cook; size?: number }) {
  const avatar = chef.user?.avatar;
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatar}
        alt={chefName(chef)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(chef.user?.name, chef.user?.lastName)}
    </div>
  );
}

function ChefCard({
  chef,
  onClick,
  horizontal,
}: {
  chef: Cook;
  onClick: () => void;
  horizontal: boolean;
}) {
  const rating = chefRating(chef);
  const reviews = chefReviews(chef);
  const veg = chefVeg(chef);
  const fssai = chefFssai(chef);

  return (
    <button
      onClick={onClick}
      className={`${
        horizontal ? "shrink-0 w-[240px] snap-start" : "w-full"
      } bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] overflow-hidden text-left cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(26,15,10,0.08)]`}
    >
      {/* Photo block */}
      <div className="relative h-[140px] bg-gradient-to-br from-[var(--cream-100)] to-[rgba(212,114,26,0.08)] flex items-center justify-center">
        {chef.user?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chef.user.avatar}
            alt={chefName(chef)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-bold text-white text-[1.4rem]">
            {getInitials(chef.user?.name, chef.user?.lastName)}
          </div>
        )}
        {/* Badges top-right */}
        <div className="absolute top-2 right-2 flex gap-1">
          {veg && (
            <span className="bg-white/95 backdrop-blur-sm rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5 text-[0.65rem] font-bold text-[var(--green-ok)]">
              <Leaf className="w-2.5 h-2.5" />
              Veg
            </span>
          )}
          {fssai && (
            <span className="bg-white/95 backdrop-blur-sm rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5 text-[0.65rem] font-bold text-[var(--orange-500)]">
              <BadgeCheck className="w-2.5 h-2.5" />
              FSSAI
            </span>
          )}
        </div>
      </div>

      {/* Info block */}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-bold text-[0.92rem] text-[var(--brown-800)] truncate">
            {chefName(chef)}
          </div>
          <div className="inline-flex items-center gap-0.5 bg-[var(--green-ok)]/10 text-[var(--green-ok)] px-1.5 py-0.5 rounded text-[0.72rem] font-bold shrink-0">
            <Star className="w-2.5 h-2.5 fill-[var(--green-ok)]" />
            {rating > 0 ? rating.toFixed(1) : "New"}
          </div>
        </div>
        <div className="text-[0.74rem] text-[var(--text-muted)] mt-0.5 truncate">
          {(chef.cuisines || []).slice(0, 2).join(" · ") || "Multi-cuisine"}
          {reviews > 0 && ` · ${reviews} reviews`}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-[rgba(212,114,26,0.06)] flex items-end justify-between">
          <div>
            <div className="font-bold text-[0.95rem] text-[var(--orange-500)]">
              ₹49 visit fee
            </div>
            <div className="text-[0.68rem] text-[var(--text-muted)] -mt-0.5">
              + dish prices
            </div>
          </div>
          <span className="text-[0.72rem] font-bold text-[var(--orange-500)]">
            Book →
          </span>
        </div>
      </div>
    </button>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-[var(--brown-800)]">
      <span className="text-[var(--orange-500)]">{icon}</span>
      {label}
    </div>
  );
}