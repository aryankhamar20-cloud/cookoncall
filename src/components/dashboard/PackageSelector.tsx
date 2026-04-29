"use client";

/**
 * PackageSelector — P1.5c
 * Customer-facing package selection UI.
 *
 * FILE: src/components/dashboard/PackageSelector.tsx
 *
 * Flow:
 *  1. Guest count picker (2 / 3 / 4 / 5 / Custom)
 *  2. Package card list with pricing for selected guest count
 *  3. On package click → category dish selection (min/max rules)
 *  4. Add-ons selection
 *  5. Price summary → "Book This Package" button
 */

import { useState, useEffect } from "react";
import { mealPackagesApi } from "@/lib/api";
import type { MealPackage, PackageCategory, PackageCategoryDish, PackageAddon, PackageSelectionPayload } from "@/types";
import { Users, Package, ChevronDown, ChevronUp, CheckCircle2, Plus, Minus, Loader2, Leaf, AlertCircle, ShoppingBag } from "lucide-react";

interface PackageSelectorProps {
  cookId: string;
  onBookPackage: (payload: PackageSelectionPayload) => void;
  /** If true, shows a login prompt instead of the book button */
  isGuest?: boolean;
  onLoginPrompt?: () => void;
}

const GUEST_TIERS = [2, 3, 4, 5] as const;
const VISIT_FEE = 49;
const CONVENIENCE_RATE = 0.025;

function getPriceForGuests(pkg: MealPackage, guests: number): number {
  if (guests <= 2) return Number(pkg.price_2);
  if (guests === 3) return Number(pkg.price_3);
  if (guests === 4) return Number(pkg.price_4);
  if (guests === 5) return Number(pkg.price_5);
  return Number(pkg.price_5) + (guests - 5) * Number(pkg.extra_person_charge || 59);
}

export default function PackageSelector({
  cookId,
  onBookPackage,
  isGuest = false,
  onLoginPrompt,
}: PackageSelectorProps) {
  const [packages, setPackages] = useState<MealPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest count
  const [guestCount, setGuestCount] = useState<number>(2);
  const [customGuests, setCustomGuests] = useState<string>("6");
  const [useCustom, setUseCustom] = useState(false);

  // Package selection
  const [selectedPkg, setSelectedPkg] = useState<MealPackage | null>(null);

  // Category dish selections: {categoryId: Set<dishId>}
  const [catSelections, setCatSelections] = useState<Record<string, Set<string>>>({});

  // Add-on selections
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());

  // Category expand/collapse
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // ─── Fetch packages on mount ──────────────────────────
  useEffect(() => {
    if (!cookId) return;
    setLoading(true);
    setError(null);
    mealPackagesApi
      .getPublicByCook(cookId)
      .then(({ data }) => {
        const list: MealPackage[] = data?.data ?? data ?? [];
        setPackages(Array.isArray(list) ? list.filter((p) => p.is_active) : []);
      })
      .catch(() => setError("Couldn't load packages. Please try again."))
      .finally(() => setLoading(false));
  }, [cookId]);

  // ─── When package changes reset selections ────────────
  useEffect(() => {
    if (!selectedPkg) return;
    setCatSelections({});
    setSelectedAddonIds(new Set());
    // Auto-expand all categories
    setExpandedCats(new Set(selectedPkg.categories?.map((c) => c.id) ?? []));
  }, [selectedPkg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Effective guest count ────────────────────────────
  const effectiveGuests = useCustom
    ? Math.max(6, parseInt(customGuests, 10) || 6)
    : guestCount;

  // ─── Category selection helpers ───────────────────────
  function toggleDish(catId: string, dishId: string, cat: PackageCategory) {
    setCatSelections((prev) => {
      const current = new Set(prev[catId] ?? []);
      if (current.has(dishId)) {
        current.delete(dishId);
      } else {
        // Enforce max_selections
        if (current.size >= cat.max_selections) {
          // If max is 1, swap (radio behaviour). Else, block.
          if (cat.max_selections === 1) {
            current.clear();
            current.add(dishId);
          }
          // else: silently ignore (button will be disabled in UI)
        } else {
          current.add(dishId);
        }
      }
      return { ...prev, [catId]: current };
    });
  }

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return next;
    });
  }

  // ─── Validation ───────────────────────────────────────
  function getCategoryError(cat: PackageCategory): string | null {
    const sel = catSelections[cat.id];
    const count = sel?.size ?? 0;
    if (count < cat.min_selections) {
      return `Select ${cat.min_selections - count} more`;
    }
    return null;
  }

  const allCatsValid = selectedPkg?.categories?.every((cat) => !getCategoryError(cat)) ?? false;

  // ─── Price calculation ────────────────────────────────
  const pkgSubtotal = selectedPkg
    ? getPriceForGuests(selectedPkg, effectiveGuests) +
      (selectedPkg.addons ?? [])
        .filter((a) => selectedAddonIds.has(a.id))
        .reduce((sum, a) => sum + Number(a.price), 0)
    : 0;
  const convFee = Math.round(pkgSubtotal * CONVENIENCE_RATE);
  const totalAmount = pkgSubtotal + VISIT_FEE + convFee;

  // ─── Build final payload ──────────────────────────────
  function buildPayload(): PackageSelectionPayload | null {
    if (!selectedPkg) return null;

    const selectedCategories = (selectedPkg.categories ?? []).map((cat) => ({
      categoryId: cat.id,
      dishIds: Array.from(catSelections[cat.id] ?? []),
    }));

    const dishSummary = (selectedPkg.categories ?? [])
      .flatMap((cat) =>
        (cat.dishes ?? []).filter((d) => catSelections[cat.id]?.has(d.id)).map((d) => d.name),
      )
      .concat(
        (selectedPkg.addons ?? [])
          .filter((a) => selectedAddonIds.has(a.id))
          .map((a) => a.name),
      )
      .join(", ");

    return {
      packageId: selectedPkg.id,
      guestCount: effectiveGuests,
      selectedCategories,
      selectedAddonIds: Array.from(selectedAddonIds),
      totalAmount,
      packageName: selectedPkg.name,
      dishSummary,
    };
  }

  function handleBook() {
    if (isGuest) {
      onLoginPrompt?.();
      return;
    }
    const payload = buildPayload();
    if (!payload) return;
    onBookPackage(payload);
  }

  // ─── Loading / Error states ───────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-[var(--orange-500)] animate-spin" />
        <p className="text-[0.88rem] text-[var(--text-muted)]">Loading packages…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-[0.9rem] text-[var(--text-muted)]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-[0.85rem] text-[var(--orange-500)] font-semibold bg-transparent border-none cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
        <Package className="w-12 h-12 text-[var(--cream-300)]" />
        <h3 className="font-bold text-[var(--brown-800)]">No Packages Yet</h3>
        <p className="text-[0.88rem] text-[var(--text-muted)] max-w-[280px]">
          This chef hasn&apos;t set up meal packages yet. Try the &quot;Build Your Own&quot; tab to pick individual dishes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ─── STEP 1: Guest Count ─── */}
      <div className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.08)]">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[var(--orange-500)]" />
          <span className="font-bold text-[0.9rem] text-[var(--brown-800)]">How many guests?</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {GUEST_TIERS.map((n) => (
            <button
              key={n}
              onClick={() => { setGuestCount(n); setUseCustom(false); }}
              className={`px-4 py-2 rounded-full text-[0.85rem] font-semibold border transition-all cursor-pointer ${
                !useCustom && guestCount === n
                  ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                  : "bg-white text-[var(--text-muted)] border-[var(--cream-300)] hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]"
              }`}
            >
              {n} guests
            </button>
          ))}
          <button
            onClick={() => setUseCustom(true)}
            className={`px-4 py-2 rounded-full text-[0.85rem] font-semibold border transition-all cursor-pointer ${
              useCustom
                ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                : "bg-white text-[var(--text-muted)] border-[var(--cream-300)] hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]"
            }`}
          >
            6+
          </button>
        </div>

        {useCustom && (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setCustomGuests((v) => String(Math.max(6, (parseInt(v, 10) || 6) - 1)))}
              className="w-9 h-9 rounded-full border border-[var(--cream-300)] flex items-center justify-center bg-white cursor-pointer hover:border-[var(--orange-500)]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-[1.1rem] w-12 text-center">{customGuests}</span>
            <button
              onClick={() => setCustomGuests((v) => String((parseInt(v, 10) || 6) + 1))}
              className="w-9 h-9 rounded-full border border-[var(--orange-500)] bg-[var(--orange-500)] text-white flex items-center justify-center cursor-pointer hover:bg-[var(--orange-400)]"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-[0.82rem] text-[var(--text-muted)]">guests</span>
          </div>
        )}
      </div>

      {/* ─── STEP 2: Package Cards ─── */}
      <div>
        <p className="text-[0.82rem] text-[var(--text-muted)] mb-3 font-semibold uppercase tracking-wide">
          Choose a package
        </p>
        <div className="space-y-3">
          {packages.map((pkg) => {
            const priceForGuests = getPriceForGuests(pkg, effectiveGuests);
            const isSelected = selectedPkg?.id === pkg.id;

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkg(isSelected ? null : pkg)}
                className={`rounded-[16px] border-2 p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.04)]"
                    : "border-[rgba(212,114,26,0.12)] bg-white hover:border-[var(--orange-500)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[0.95rem] text-[var(--brown-800)]">
                        {pkg.name}
                      </h3>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--orange-500)] shrink-0" />
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-[0.8rem] text-[var(--text-muted)] mt-1 line-clamp-2">
                        {pkg.description}
                      </p>
                    )}
                    {/* Category summary pills */}
                    {(pkg.categories ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {pkg.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className="text-[0.7rem] px-2 py-0.5 rounded-full bg-[rgba(212,114,26,0.08)] text-[var(--orange-500)] font-medium"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[1.1rem] text-[var(--orange-500)]">
                      ₹{priceForGuests.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[0.7rem] text-[var(--text-muted)]">
                      for {effectiveGuests} guests
                    </div>
                    {effectiveGuests > 5 && (
                      <div className="text-[0.68rem] text-[var(--text-muted)] mt-0.5">
                        (₹{pkg.extra_person_charge || 59}/extra)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 3: Category Dish Selection ─── */}
      {selectedPkg && (selectedPkg.categories ?? []).length > 0 && (
        <div className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.08)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--cream-200)]">
            <h3 className="font-bold text-[0.92rem] text-[var(--brown-800)]">
              Customise Your Menu
            </h3>
            <p className="text-[0.78rem] text-[var(--text-muted)] mt-0.5">
              Pick dishes from each category below
            </p>
          </div>

          {selectedPkg.categories.map((cat) => {
            const catSel = catSelections[cat.id] ?? new Set();
            const isExpanded = expandedCats.has(cat.id);
            const catErr = getCategoryError(cat);
            const isComplete = !catErr;

            return (
              <div key={cat.id} className="border-b border-[var(--cream-100)] last:border-b-0">
                {/* Category header */}
                <button
                  onClick={() =>
                    setExpandedCats((prev) => {
                      const next = new Set(prev);
                      if (next.has(cat.id)) next.delete(cat.id);
                      else next.add(cat.id);
                      return next;
                    })
                  }
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer text-left hover:bg-[rgba(212,114,26,0.02)]"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[var(--cream-300)] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold text-[0.88rem] text-[var(--brown-800)]">
                        {cat.name}
                      </span>
                      <span className="text-[0.75rem] text-[var(--text-muted)] ml-2">
                        {cat.min_selections === cat.max_selections
                          ? `Pick ${cat.min_selections}`
                          : `Pick ${cat.min_selections}–${cat.max_selections}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isComplete && (
                      <span className="text-[0.72rem] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                        {catErr}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                </button>

                {/* Dish list */}
                {isExpanded && (
                  <div className="px-5 pb-3 space-y-2">
                    {(cat.dishes ?? []).length === 0 ? (
                      <p className="text-[0.8rem] text-[var(--text-muted)] py-2">
                        No dishes in this category.
                      </p>
                    ) : (
                      (cat.dishes ?? []).map((dish) => {
                        const isChecked = catSel.has(dish.id);
                        const isDisabled =
                          !isChecked && catSel.size >= cat.max_selections && cat.max_selections > 1;

                        return (
                          <div
                            key={dish.id}
                            onClick={() => !isDisabled && toggleDish(cat.id, dish.id, cat)}
                            className={`flex items-center gap-3 p-3 rounded-[10px] border transition-all ${
                              isChecked
                                ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.05)]"
                                : isDisabled
                                ? "border-[var(--cream-200)] bg-[var(--cream-50)] opacity-50 cursor-not-allowed"
                                : "border-[var(--cream-200)] bg-white hover:border-[var(--orange-400)] cursor-pointer"
                            }`}
                          >
                            {/* veg/nonveg indicator */}
                            <div
                              className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0 ${
                                dish.type === "veg" ? "border-green-600" : "border-red-600"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  dish.type === "veg" ? "bg-green-600" : "bg-red-600"
                                }`}
                              />
                            </div>

                            <span className="flex-1 text-[0.88rem] font-medium text-[var(--brown-800)]">
                              {dish.name}
                            </span>
                            {dish.description && (
                              <span className="text-[0.75rem] text-[var(--text-muted)] hidden sm:block line-clamp-1 max-w-[150px]">
                                {dish.description}
                              </span>
                            )}

                            {/* Checkbox */}
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                isChecked
                                  ? "bg-[var(--orange-500)] border-[var(--orange-500)]"
                                  : "border-[var(--cream-300)] bg-white"
                              }`}
                            >
                              {isChecked && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── STEP 4: Add-ons ─── */}
      {selectedPkg && (selectedPkg.addons ?? []).filter((a) => a.is_available).length > 0 && (
        <div className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.08)] p-5">
          <h3 className="font-bold text-[0.92rem] text-[var(--brown-800)] mb-3">
            Add-ons <span className="text-[var(--text-muted)] font-normal text-[0.8rem]">(optional)</span>
          </h3>
          <div className="space-y-2">
            {selectedPkg.addons
              .filter((a) => a.is_available)
              .map((addon) => {
                const isChecked = selectedAddonIds.has(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer transition-all ${
                      isChecked
                        ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.05)]"
                        : "border-[var(--cream-200)] bg-white hover:border-[var(--orange-400)]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0 ${
                        addon.type === "veg" ? "border-green-600" : "border-red-600"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${addon.type === "veg" ? "bg-green-600" : "bg-red-600"}`} />
                    </div>

                    <span className="flex-1 min-w-0 font-medium text-[0.88rem]">{addon.name}</span>

                    <span className="font-bold text-[0.88rem] text-[var(--orange-500)] shrink-0">
                      +₹{Number(addon.price).toLocaleString('en-IN')}
                    </span>

                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? "bg-[var(--orange-500)] border-[var(--orange-500)]"
                          : "border-[var(--cream-300)] bg-white"
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── STEP 5: Price Summary + CTA ─── */}
      {selectedPkg && (
        <div className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.08)] p-5">
          <h3 className="font-bold text-[0.92rem] text-[var(--brown-800)] mb-4">Price Breakdown</h3>

          <div className="space-y-2 text-[0.88rem]">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                {selectedPkg.name} ({effectiveGuests} guests)
              </span>
              <span className="font-medium">
                ₹{getPriceForGuests(selectedPkg, effectiveGuests).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Addon lines */}
            {(selectedPkg.addons ?? [])
              .filter((a) => selectedAddonIds.has(a.id))
              .map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{a.name}</span>
                  <span className="font-medium">+₹{Number(a.price).toLocaleString('en-IN')}</span>
                </div>
              ))}

            <div className="flex justify-between pt-1.5 border-t border-[var(--cream-200)]">
              <span className="text-[var(--text-muted)]">Visit fee</span>
              <span>₹{VISIT_FEE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Convenience fee (2.5%)</span>
              <span>₹{convFee}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[rgba(212,114,26,0.12)] font-bold text-[1rem]">
              <span>Total</span>
              <span className="text-[var(--orange-500)]">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">
              + Ingredients at actual market cost (with receipt from chef)
            </p>
          </div>

          {/* HYBRID model note */}
          <div className="mt-4 p-3 bg-[rgba(212,114,26,0.04)] rounded-[10px] text-[0.75rem] text-[var(--text-muted)] leading-relaxed">
            <span className="font-semibold text-[var(--brown-800)]">HYBRID model:</span>{" "}
            Chef brings their expertise &amp; tools. You arrange ingredients at actual market cost (chef provides itemised receipt). Ingredient list sent to you 2 hours before the session.
          </div>

          {/* Validation warning */}
          {!allCatsValid && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-[10px]">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[0.78rem] text-amber-800">
                Please complete all dish selections above before proceeding.
              </p>
            </div>
          )}

          {/* Book button */}
          <button
            onClick={handleBook}
            disabled={!allCatsValid}
            className="mt-4 w-full py-3.5 rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-[0.95rem] border-none cursor-pointer transition-all hover:bg-[var(--orange-400)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--orange-500)] disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <ShoppingBag className="w-4 h-4" />
            {isGuest
              ? "Login to Book This Package"
              : `Book Package — ₹${totalAmount.toLocaleString('en-IN')}`}
          </button>
        </div>
      )}
    </div>
  );
}
