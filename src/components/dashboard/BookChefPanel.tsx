"use client";
import { useState, useEffect, useCallback } from "react";
import type { Cook } from "@/types";
import { getInitials, formatCurrency } from "@/lib/utils";
import { ChefCardSkeleton } from "@/components/ui/Skeleton";
import { BadgeCheck, AlertCircle, Star, ChevronDown, ChevronUp, Leaf, ExternalLink, Search, SlidersHorizontal, X, Award, Clock, MapPin } from "lucide-react";
import api from "@/lib/api";
import BookingModal from "@/components/modals/BookingModal";
import type { BookingFormData } from "@/components/modals/BookingModal";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useBookingStore } from "@/stores/bookingStore";
import { useUIStore } from "@/stores/uiStore";

const CUISINE_FILTERS = [
  "All", "Gujarati", "North Indian", "South Indian", "Punjabi", "Chinese",
  "Italian", "Continental", "Street Food", "Mughlai", "Rajasthani",
];

const SORT_OPTIONS = [
  { label: "Relevance", value: "" },
  { label: "Rating (High → Low)", value: "rating" },
  { label: "Most Bookings", value: "bookings" },
];

const SERVICE_FILTERS = [
  { label: "All Chefs", value: "all" },
  { label: "Home Visit Only", value: "home_cook" },
  { label: "Delivery Only", value: "delivery" },
];

/**
 * ChefAvatar — renders a clean initials fallback if the avatar URL is missing
 * OR fails to load (broken link, 404, CORS error, etc.).
 */
function ChefAvatar({
  src,
  name,
  initials,
  size = 64,
}: {
  src?: string | null;
  name: string;
  initials: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const showImage = src && !broken;

  return showImage ? (
    <img
      src={src!}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover border-2 border-white/50"
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
    />
  ) : (
    <div
      className="rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center font-display font-[800] text-[rgba(0,0,0,0.3)]"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

export default function BookChefPanel() {
  const [chefs, setChefs] = useState<Cook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChef, setSelectedChef] = useState<Cook | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [chefMenus, setChefMenus] = useState<Record<string, any[]>>({});
  const [expandedChef, setExpandedChef] = useState<string | null>(null);

  // Apr 21 new flow: booking created → show "Waiting for chef approval" screen
  // (NO payment modal on create; payment happens in OrdersPanel after chef accepts)
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const [pendingBookingSummary, setPendingBookingSummary] = useState<{
    bookingId: string;
    chefName: string;
    date: string;
    time: string;
    duration: string;
    guests: string;
    address: string;
    amount: number;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [cuisineFilter, setCuisineFilter] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<"all" | "home_cook" | "delivery">("all");

  // P1.6 — area filter (defaults from customer's default address area_slug)
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [areaList, setAreaList] = useState<{ slug: string; name: string; region: string }[]>([]);

  // Load areas list once
  useEffect(() => {
    let cancelled = false;
    api.get("/areas", { params: { city: "Ahmedabad" } })
      .then((res: any) => {
        if (cancelled) return;
        const list = (res?.data?.data ?? res?.data ?? []) as any[];
        setAreaList(list.map((a) => ({ slug: a.slug, name: a.name, region: a.region })));
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  // Pre-fill area filter from the customer's default address (best UX)
  useEffect(() => {
    let cancelled = false;
    api.get("/addresses")
      .then((res: any) => {
        if (cancelled) return;
        const list = (res?.data?.data ?? res?.data ?? []) as any[];
        if (!Array.isArray(list)) return;
        const def = list.find((a) => a.is_default) || list[0];
        if (def?.area_slug) setAreaFilter(def.area_slug);
      })
      .catch(() => { /* not logged in or no addresses yet — fine */ });
    return () => { cancelled = true; };
  }, []);

  const fetchChefs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (cuisineFilter && cuisineFilter !== "All") params.cuisine = cuisineFilter;
      if (vegOnly) params.veg_only = true;
      if (minRating > 0) params.min_rating = minRating;
      if (sortBy) params.sort = sortBy;
      // service_role filter — sent to backend so pagination works correctly
      if (serviceFilter !== "all") params.service_role = serviceFilter;
      // P1.6 — area filter (chef must serve this area or be all-city)
      if (areaFilter) params.area = areaFilter;

      const { data } = await api.get("/cooks", { params });
      const raw = data?.data ?? data;
      const list = Array.isArray(raw) ? raw : raw?.cooks ?? raw?.data ?? [];
      setChefs(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to load chefs.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, cuisineFilter, vegOnly, minRating, sortBy, serviceFilter, areaFilter]);

  useEffect(() => { fetchChefs(); }, [fetchChefs]);

  // ─── Auto-open booking modal when arriving from CustomerHome ──────────
  // CustomerHome calls openBookingModal(chef) on the global store + setPanel("book-chef").
  // We pick up that selectedChef + showBookingModal flag here and open the modal.
  // Then we clear the store flag so a refresh doesn't re-open it.
  const storeSelectedChef = useBookingStore((s) => s.selectedChef);
  const storeShowBookingModal = useBookingStore((s) => s.showBookingModal);
  const closeAllStoreModals = useBookingStore((s) => s.closeAllModals);
  const setPanel = useUIStore((s) => s.setPanel);

  useEffect(() => {
    if (storeShowBookingModal && storeSelectedChef) {
      setSelectedChef(storeSelectedChef);
      setBookingModalOpen(true);
      closeAllStoreModals(); // clear store so refresh doesn't loop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeShowBookingModal, storeSelectedChef?.id]);

  async function fetchChefMenu(chefId: string) {
    if (chefMenus[chefId]) return;
    try {
      const { data } = await api.get(`/cooks/${chefId}/menu`);
      const items = data?.data ?? data;
      setChefMenus((prev) => ({ ...prev, [chefId]: Array.isArray(items) ? items : [] }));
    } catch {
      setChefMenus((prev) => ({ ...prev, [chefId]: [] }));
    }
  }

  function toggleExpand(chefId: string) {
    if (expandedChef === chefId) {
      setExpandedChef(null);
    } else {
      setExpandedChef(chefId);
      fetchChefMenu(chefId);
    }
  }

  function openBookingModal(chef: Cook) {
    setSelectedChef(chef);
    setBookingModalOpen(true);
  }

  // ─── Apr 21 NEW FLOW ──────────────────────────────────
  // Create booking → it goes to PENDING_CHEF_APPROVAL on backend.
  // We DO NOT open PaymentModal here. Customer pays from OrdersPanel
  // only after chef accepts (status becomes AWAITING_PAYMENT).
  async function handleProceedToPayment(formData: BookingFormData) {
    try {
      const payload: any = {
        cook_id: formData.cookId,
        scheduled_at: new Date(`${formData.date}T${formData.time}:00`).toISOString(),
        duration_hours: formData.durationHours,
        guests: formData.guestsCount,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        // P1.6 — area snapshot from chosen address (may be undefined for legacy)
        customer_area_slug: formData.areaSlug,
        dishes: formData.dishes,
        instructions: formData.notes,
      };
      if (formData.selectedItems && formData.selectedItems.length > 0) {
        payload.selected_items = formData.selectedItems.map((i) => ({
          menuItemId: i.menuItemId,
          qty: i.qty,
        }));
      }
      // ─── Bug 2 fix (P1.5c): forward package fields to backend ───────────
      // Without these, a package booking gets saved as a regular menu booking
      // — wrong price, no ingredient reminder, no package_id traceability.
      if (formData.packageId) {
        payload.packageId = formData.packageId;
        payload.guestCount = formData.guestsCount;
        if (formData.selectedCategories && formData.selectedCategories.length > 0) {
          payload.selectedCategories = formData.selectedCategories;
        }
        if (formData.selectedAddonIds && formData.selectedAddonIds.length > 0) {
          payload.selectedAddonIds = formData.selectedAddonIds;
        }
      }

      const { data } = await api.post("/bookings", payload);
      const booking = data?.data ?? data;
      const bookingId = booking.id || booking.booking_id;

      // Apr 21 ₹1-bug safety guard: never fall back to client-side amount
      // blindly. Require a real, finite, positive server-side price.
      const rawTotal = Number(booking.total_price);
      const totalPrice =
        Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 0;

      if (!bookingId) {
        toast.error("Could not create booking. Please try again.");
        return;
      }

      setPendingBookingSummary({
        bookingId,
        chefName: formData.cookName,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        guests: formData.guests,
        address: formData.address,
        amount: totalPrice,
      });
      setBookingModalOpen(false);
      setShowPendingScreen(true);
      toast.success("Request sent to chef!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create booking.");
    }
  }

  const activeFilterCount =
    (cuisineFilter !== "All" ? 1 : 0) +
    (vegOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (sortBy ? 1 : 0);

  function clearAllFilters() {
    setCuisineFilter("All");
    setServiceFilter("all");
    setVegOnly(false);
    setMinRating(0);
    setSortBy("");
  }

  return (
    <div>
      <h2 className="font-bold text-[1.05rem] mb-1">Book a Chef</h2>
      <p className="text-[0.88rem] text-[var(--text-muted)] mb-5">
        Find and book verified home chefs near you.
      </p>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, cuisine, or specialty..."
          className="w-full pl-10 pr-4 py-3 rounded-[12px] border border-[var(--cream-300)] bg-white text-[0.9rem] outline-none focus:border-[var(--orange-500)]"
          style={{ fontFamily: "var(--font-body)" }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--cream-200)] bg-transparent border-none cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* P1.6 — Area selector. Defaults to customer's default address area. */}
      <div className="relative mb-3 flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] border border-[var(--cream-300)] bg-white">
        <MapPin className="w-4 h-4 text-[var(--orange-500)] shrink-0" />
        <span className="text-[0.82rem] font-semibold text-[var(--brown-800)] shrink-0">Your area:</span>
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="flex-1 bg-transparent text-[0.85rem] outline-none cursor-pointer"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <option value="">All Ahmedabad</option>
          {areaList.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
        {areaFilter && (
          <button
            onClick={() => setAreaFilter("")}
            className="text-[0.74rem] text-[var(--text-muted)] hover:underline cursor-pointer bg-transparent border-none"
            aria-label="Clear area"
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter toggle + sort */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.82rem] font-semibold border cursor-pointer transition",
            showFilters
              ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
              : "bg-white text-[var(--text-dark)] border-[var(--cream-300)] hover:border-[var(--orange-500)]"
          )}
          style={{ fontFamily: "var(--font-body)" }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white text-[var(--orange-500)] rounded-full text-[0.7rem] px-1.5 py-0 font-bold min-w-[1.25rem] text-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 rounded-full border border-[var(--cream-300)] bg-white text-[0.82rem] font-semibold cursor-pointer outline-none focus:border-[var(--orange-500)]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>Sort: {o.label}</option>
          ))}
        </select>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-[0.78rem] text-[var(--text-muted)] underline cursor-pointer bg-transparent border-none"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-[16px] border border-[var(--cream-300)] p-4 mb-4 space-y-4">
         <div>
            <label className="block text-[0.82rem] font-semibold mb-2">Service Type</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_FILTERS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setServiceFilter(s.value as "all" | "home_cook" | "delivery")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[0.78rem] border cursor-pointer transition",
                    serviceFilter === s.value
                      ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                      : "bg-white text-[var(--text-muted)] border-[var(--cream-300)] hover:border-[var(--orange-500)]"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[0.82rem] font-semibold mb-2">Cuisine</label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_FILTERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCuisineFilter(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[0.78rem] border cursor-pointer transition",
                    cuisineFilter === c
                      ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                      : "bg-white text-[var(--text-muted)] border-[var(--cream-300)] hover:border-[var(--orange-500)]"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[0.82rem] font-semibold mb-2">Min Rating</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--cream-300)] bg-white text-[0.82rem] outline-none focus:border-[var(--orange-500)]"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <option value={0}>Any</option>
                <option value={3}>3+ stars</option>
                <option value={4}>4+ stars</option>
                <option value={4.5}>4.5+ stars</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-[0.82rem] font-semibold">
                <input
                  type="checkbox"
                  checked={vegOnly}
                  onChange={(e) => setVegOnly(e.target.checked)}
                  className="w-4 h-4 accent-[var(--orange-500)]"
                />
                <Leaf className="w-3.5 h-3.5 text-green-600" />
                Pure Veg only
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-white rounded-[16px] p-6 border border-red-100 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-[0.9rem] text-red-500">{error}</p>
          <button
            onClick={fetchChefs}
            className="mt-3 px-5 py-2 rounded-full bg-[var(--orange-500)] text-white text-[0.82rem] font-semibold border-none cursor-pointer"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <ChefCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && chefs.length === 0 && (
        <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)]">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[0.9rem]">No chefs match your filters. Try clearing some filters.</p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="mt-3 px-5 py-2 rounded-full bg-[var(--orange-500)] text-white text-[0.82rem] font-semibold border-none cursor-pointer"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Chef grid */}
      {!loading && !error && chefs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chefs
            .map((chef) => {
              const name = `${chef.user?.name || ""} ${chef.user?.lastName || ""}`.trim() || "Chef";
              const ini = getInitials(name);
              const rating = Number(chef.rating) || 0;
              const isExpanded = expandedChef === chef.id;
              const menu = chefMenus[chef.id] || [];
              const hasFssai = !!chef.fssai_url;

              return (
                <div key={chef.id} className="bg-white rounded-[16px] overflow-hidden border border-[rgba(212,114,26,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(26,15,10,0.08)]">
                  <div className="h-[100px] bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] flex items-center justify-center relative">
                    <ChefAvatar
                      src={chef.user?.avatar}
                      name={name}
                      initials={ini}
                      size={64}
                    />
                    {(chef.is_verified || chef.isVerified) && (
                      <span className="absolute top-3 right-3 bg-white/90 text-[0.7rem] font-semibold px-2.5 py-1 rounded-full text-[var(--green-ok)] flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                    {(chef.is_veg_only || chef.isVegOnly) && (
                      <span className="absolute top-3 left-3 bg-white/90 text-[0.7rem] font-semibold px-2.5 py-1 rounded-full text-green-600 flex items-center gap-1">
                        <Leaf className="w-3.5 h-3.5" /> Pure Veg
                      </span>
                    )}
                    {hasFssai && (
                      <span className="absolute bottom-3 right-3 bg-white/90 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full text-amber-600 flex items-center gap-1">
                        <Award className="w-3 h-3" /> FSSAI
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="font-bold text-[1rem] mb-0.5">{name}</div>
                    <div className="text-[0.82rem] text-[var(--text-muted)] mb-1">
                     {chef.cuisines?.join(", ") || "Home Cooking"}
                    </div>
                    {rating > 0 && (
                      <div className="flex items-center gap-1 text-[0.82rem] mb-3">
                        <Star className="w-3.5 h-3.5 fill-[#F5A623] text-[#F5A623]" />
                        <span className="font-semibold">{rating.toFixed(1)}</span>
                        {chef.total_bookings != null && (
                          <span className="text-[var(--text-muted)]">
                            · {chef.total_bookings} {chef.total_bookings === 1 ? "booking" : "bookings"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Menu preview toggle */}
                    <button
                     onClick={() => toggleExpand(chef.id)}
                      className="flex items-center gap-1 text-[0.78rem] text-[var(--orange-500)] font-semibold bg-transparent border-none cursor-pointer mb-3 p-0"
                    >
                      {isExpanded ? "Hide menu" : "View menu"}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mb-3 bg-[var(--cream-100)] rounded-[8px] p-2 max-h-[140px] overflow-y-auto">
                       {menu.length === 0 ? (
                          <div className="text-[0.78rem] text-[var(--text-muted)] text-center py-2">
                            No menu items yet.
                         </div>
                        )  : (
                          <div className="space-y-1.5">
                            {menu.slice(0, 6).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 text-[0.78rem]">
                                <div
                                  className={cn(
                                    "w-3 h-3 border-[1.5px] rounded-sm flex items-center justify-center shrink-0",
                                   item.type === "veg" ? "border-green-600" : "border-red-600"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      item.type === "veg" ? "bg-green-600" : "bg-red-600"
                                   )}
                                  />
                                </div>
                                {item.image && <img src={item.image} alt={item.name} className="w-7 h-7 rounded object-cover shrink-0" />}
                                <span className="flex-1 truncate">{item.name}</span>
                                <span className="font-semibold text-[var(--orange-500)]">
                                 {formatCurrency(Number(item.price))}
                                </span>
                              </div>
                            ))}
                            {menu.length > 6 && (
                              <div className="text-[0.72rem] text-[var(--text-muted)] text-center pt-1">
                                +{menu.length - 6} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                   )}

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--cream-200)]">
                     <div>
                        <div className="text-[0.72rem] text-[var(--text-muted)]">Starting from</div>
                        <div className="font-display text-[1.05rem] font-[800] text-[var(--orange-500)] leading-tight">
                         ₹49 visit fee
                      </div>
                        <div className="text-[0.68rem] text-[var(--text-muted)]">+ dish prices</div>
                      </div>
                    <button
                      onClick={() => openBookingModal(chef)}
                      className="px-5 py-2.5 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.85rem] border-none cursor-pointer transition-all hover:bg-[var(--orange-400)]"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        chef={selectedChef}
        onProceedToPayment={handleProceedToPayment}
      />

      {/* Apr 21 NEW FLOW — Waiting for chef approval screen
          (replaces the old "Booking Confirmed" summary since payment now happens later) */}
      {showPendingScreen && pendingBookingSummary && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowPendingScreen(false)}
        >
          <div
            className="bg-white rounded-[16px] max-w-md w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="font-bold text-[1.1rem] mb-1">Request sent to chef!</h3>
            <p className="text-[0.85rem] text-[var(--text-muted)] mb-1">
              Booking ID: <span className="font-mono">{pendingBookingSummary.bookingId.slice(0, 8)}</span>
            </p>
            <p className="text-[0.85rem] text-[var(--text-muted)] mb-4">
              Your chef has <strong>3 hours</strong> to accept.
              We'll email you the moment they respond. Pay from <strong>My Orders</strong> once they confirm.
            </p>
            <div className="text-left bg-[var(--cream-100)] rounded-[12px] p-4 mb-5 space-y-1.5 text-[0.85rem]">
              <div><span className="text-[var(--text-muted)]">Chef:</span> {pendingBookingSummary.chefName}</div>
              <div><span className="text-[var(--text-muted)]">Date:</span> {pendingBookingSummary.date} · {pendingBookingSummary.time}</div>
              <div><span className="text-[var(--text-muted)]">Duration:</span> {pendingBookingSummary.duration}</div>
              <div><span className="text-[var(--text-muted)]">Guests:</span> {pendingBookingSummary.guests}</div>
              {pendingBookingSummary.amount > 0 && (
                <div><span className="text-[var(--text-muted)]">Estimated total:</span> {formatCurrency(pendingBookingSummary.amount)}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPendingScreen(false);
                  setPanel("orders");
                }}
                className="flex-1 py-2.5 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.85rem] flex items-center justify-center gap-1.5 cursor-pointer border-none"
              >
                View in Orders <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowPendingScreen(false)}
                className="px-5 py-2.5 rounded-full bg-white border border-[var(--cream-300)] text-[var(--text-muted)] font-semibold text-[0.85rem] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
