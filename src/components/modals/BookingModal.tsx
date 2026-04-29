"use client";

/**
 * BookingModal — P1.5c update
 * FILE: src/components/modals/BookingModal.tsx
 *
 * Changes:
 *  - Accepts optional `preselectedPackage` prop (PackageSelectionPayload)
 *  - In package mode: skips dish selection, shows package summary instead
 *  - In normal mode: unchanged (existing Build Your Own dish-checkbox flow)
 *  - BookingFormData gains packageId / selectedCategories / selectedAddonIds
 */

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { getInitials, formatCurrency } from "@/lib/utils";
import type { Cook, MenuItem, Address } from "@/types";
import type { PackageSelectionPayload } from "@/types";
import { formatAddressLine } from "@/types";
import api, { addressesApi, availabilityApi, type AvailSlot } from "@/lib/api";
import AddressCard from "@/components/ui/AddressCard";
import AddressModal from "@/components/modals/AddressModal";
import toast from "react-hot-toast";
import {
  MapPin, Clock, Users, CalendarDays, Utensils, Minus, Plus,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, Package, Tag,
} from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  chef: Cook | null;
  onProceedToPayment: (bookingData: BookingFormData) => void;
  /** When set, the modal is in "package mode" — dish selection is skipped */
  preselectedPackage?: PackageSelectionPayload | null;
}

export interface BookingFormData {
  cookId: string;
  cookName: string;
  date: string;
  time: string;
  duration: string;
  durationHours: number;
  guests: string;
  guestsCount: number;
  notes: string;
  amount: number;
  address: string;
  addressId?: string;
  latitude?: number;
  longitude?: number;
  // P1.6 — area slug snapshot from the chosen address
  areaSlug?: string;
  dishes: string;
  selectedItems?: { menuItemId: string; name: string; qty: number; price: number }[];
  // ─── Package booking fields (P1.5c) ───────────────
  packageId?: string;
  packageName?: string;
  selectedCategories?: Array<{ categoryId: string; dishIds: string[] }>;
  selectedAddonIds?: string[];
}

interface SelectedDish {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  type: string;
  image?: string;
}

const durations = [
  { label: "2 Hours", hours: 2 },
  { label: "3 Hours", hours: 3 },
  { label: "4 Hours", hours: 4 },
  { label: "Full Day (8hr)", hours: 8 },
];

const guestOptions = [
  { label: "1-2 People", count: 2 },
  { label: "3-5 People", count: 4 },
  { label: "6-10 People", count: 8 },
  { label: "10+ People", count: 12 },
];

const inputClasses =
  "w-full px-4 py-3 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.95rem] bg-white outline-none focus:border-[var(--orange-500)] transition-colors";

const VISIT_FEE = 49;
const CONVENIENCE_RATE = 0.025;

export default function BookingModal({
  isOpen,
  onClose,
  chef,
  onProceedToPayment,
  preselectedPackage,
}: BookingModalProps) {
  const isPackageMode = !!preselectedPackage;

  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [time, setTime] = useState("12:00");
  const [duration, setDuration] = useState(durations[0].label);

  const [slots, setSlots] = useState<AvailSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [guests, setGuests] = useState(guestOptions[0].label);
  const [notes, setNotes] = useState("");
  const [dishes, setDishes] = useState("");

  // ─── Addresses ────────────────────────────────────────
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  // ─── Build Your Own dish selection ────────────────────
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState<SelectedDish[]>([]);
  const [showMenu, setShowMenu] = useState(true);

  useEffect(() => {
    if (isOpen && chef?.id) {
      if (!isPackageMode) {
        setLoadingMenu(true);
        api
          .get(`/cooks/${chef.id}/menu`)
          .then(({ data }) => {
            const items = data?.data ?? data;
            setMenuItems(Array.isArray(items) ? items.filter((i: any) => i.is_available !== false) : []);
          })
          .catch(() => setMenuItems([]))
          .finally(() => setLoadingMenu(false));
      }
      loadAddresses();
    }
    if (!isOpen) {
      setSelectedDishes([]);
      setMenuItems([]);
      setShowAllAddresses(false);
    }
  }, [isOpen, chef?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Slot picker ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !chef?.id || !date) {
      setSlots([]);
      return;
    }
    const dur = durations.find((d) => d.label === duration)?.hours ?? 2;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    availabilityApi
      .getCookSlots(chef.id, date, dur)
      .then(({ data }) => {
        if (cancelled) return;
        const list = data?.data ?? data;
        const arr: AvailSlot[] = Array.isArray(list) ? list : [];
        setSlots(arr);
        if (arr.length > 0) {
          const stillValid = arr.some((s) => s.start.includes(`T${time}`));
          if (!stillValid) {
            const first = arr[0];
            const d = new Date(first.start);
            const ist = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
            const hh = String(ist.getUTCHours()).padStart(2, "0");
            const mm = String(ist.getUTCMinutes()).padStart(2, "0");
            setTime(`${hh}:${mm}`);
          }
        }
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[BookingModal] slot fetch failed:", e);
        setSlotsError("Couldn't load available slots. Try a different date.");
        setSlots([]);
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chef?.id, date, duration]);

  async function loadAddresses() {
    try {
      setAddressesLoading(true);
      const { data } = await addressesApi.getAll();
      const list = data?.data ?? data ?? [];
      const arr: Address[] = Array.isArray(list) ? list : [];
      setAddresses(arr);
      if (arr.length > 0) {
        const def = arr.find((a) => a.is_default) || arr[0];
        setSelectedAddressId((current) => current || def.id);
      }
    } catch {
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }

  function handleAddressSaved(savedAddress: Address) {
    loadAddresses().then(() => setSelectedAddressId(savedAddress.id));
    setSelectedAddressId(savedAddress.id);
  }

  if (!chef) return null;

  const ini = getInitials(chef.user?.name, chef.user?.lastName);
  const name = `${chef.user?.name || ""} ${chef.user?.lastName || ""}`.trim();

  const selectedDuration = durations.find((d) => d.label === duration) || durations[0];
  const selectedGuests = guestOptions.find((g) => g.label === guests) || guestOptions[0];

  // P1.6 — Compute customer area + effective visit fee BEFORE price math.
  // We need this so price reflects ₹49 vs ₹79 based on chef×area pairing.
  const _hasAddresses_pre = addresses.length > 0;
  const _defaultAddress_pre = addresses.find((a) => a.is_default) || addresses.find((a) => a.id === selectedAddressId) || addresses[0] || null;
  const _selectedAddress_pre = addresses.find((a) => a.id === selectedAddressId) || _defaultAddress_pre;
  const _customerAreaSlug = _selectedAddress_pre?.area_slug || null;
  const _chefAreaSlugs = chef?.service_area_slugs ?? [];
  const _chefServesAllCity = !!chef?.serves_all_city;
  const _chefAreaFees = (chef?.service_area_fees ?? {}) as Record<string, number>;

  // Resolve visit fee per chef + area pair (mirrors backend resolveVisitFee).
  function resolveEffectiveVisitFee(): number {
    const DEFAULT_FEE = 49;
    const ALLOWED = new Set([49, 79]);
    if (_chefServesAllCity) {
      if (_customerAreaSlug && _chefAreaFees[_customerAreaSlug] != null) {
        const n = Number(_chefAreaFees[_customerAreaSlug]);
        if (ALLOWED.has(n)) return n;
      }
      return DEFAULT_FEE;
    }
    if (!_customerAreaSlug) return DEFAULT_FEE;
    if (!_chefAreaSlugs.includes(_customerAreaSlug)) return DEFAULT_FEE;
    const overridden = _chefAreaFees[_customerAreaSlug];
    if (overridden != null) {
      const n = Number(overridden);
      if (ALLOWED.has(n)) return n;
    }
    return DEFAULT_FEE;
  }
  const effectiveVisitFee = resolveEffectiveVisitFee();

  // ─── Price calculation ────────────────────────────────
  let hasDishSelection: boolean;
  let dishSubtotal: number;
  let convenienceFee: number;
  let visitFee: number;
  let totalAmount: number;

if (isPackageMode && preselectedPackage) {
  hasDishSelection = true;
  totalAmount = preselectedPackage.totalAmount;
  visitFee = effectiveVisitFee;
  // Back-calculate pkgBase: totalAmount = pkgBase + visitFee + round(pkgBase * 0.025)
  // → pkgBase = (totalAmount - visitFee) / 1.025, then conv = remainder
  const pkgBase = Math.round((totalAmount - visitFee) / 1.025);
  convenienceFee = totalAmount - visitFee - pkgBase;
  dishSubtotal = pkgBase;
} else {
  hasDishSelection = selectedDishes.length > 0;
  dishSubtotal = selectedDishes.reduce((s, d) => s + d.price * d.qty, 0);
  visitFee = hasDishSelection ? effectiveVisitFee : 0;
  convenienceFee = hasDishSelection ? Math.round(dishSubtotal * CONVENIENCE_RATE) : 0;
  totalAmount = dishSubtotal + visitFee + convenienceFee;
}

  const hasAddresses = _hasAddresses_pre;
  const defaultAddress = _defaultAddress_pre;
  const selectedAddress = _selectedAddress_pre;

  // Re-expose the area flag using the precomputed values
  const customerAreaSlug = _customerAreaSlug;
  const chefAreaSlugs = _chefAreaSlugs;
  const chefServesAllCity = _chefServesAllCity;
  const chefServesArea =
    chefServesAllCity ||
    !customerAreaSlug ||
    chefAreaSlugs.includes(customerAreaSlug);
  const showAreaWarning =
    !chefServesAllCity && !!customerAreaSlug && !chefAreaSlugs.includes(customerAreaSlug);

  function toggleDish(item: MenuItem) {
    setSelectedDishes((prev) => {
      const exists = prev.find((d) => d.menuItemId === item.id);
      if (exists) return prev.filter((d) => d.menuItemId !== item.id);
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), qty: 1, type: item.type, image: item.image }];
    });
  }

  function updateDishQty(menuItemId: string, delta: number) {
    setSelectedDishes((prev) =>
      prev.map((d) => d.menuItemId === menuItemId ? { ...d, qty: Math.max(0, d.qty + delta) } : d).filter((d) => d.qty > 0)
    );
  }

  function handleProceed() {
    if (!hasAddresses) {
      toast.error("Please save a delivery address first.");
      setAddressModalOpen(true);
      return;
    }
    if (!date) {
      toast.error("Please select a date.");
      return;
    }
    if (slots.length === 0) {
      toast.error("This chef has no available slots on the selected date. Please pick another date.");
      return;
    }
    if (!isPackageMode && selectedDishes.length === 0) {
      toast.error("Please select at least one dish from the menu to continue.");
      return;
    }

    const picked = selectedAddress;
    if (!picked) {
      toast.error("Please select a delivery address.");
      return;
    }

    const selectedDate = new Date(`${date}T${time}:00`);
    if (selectedDate <= new Date()) {
      toast.error("Please select a future date and time.");
      return;
    }

    const addressLine = formatAddressLine(picked);

    // Build final payload
    const base = {
      cookId: chef!.id,
      cookName: name,
      date,
      time,
      duration,
      durationHours: selectedDuration.hours,
      guests,
      guestsCount: isPackageMode ? (preselectedPackage?.guestCount ?? selectedGuests.count) : selectedGuests.count,
      notes,
      amount: totalAmount,
      address: addressLine,
      addressId: picked.id,
      latitude: picked.latitude != null ? Number(picked.latitude) : undefined,
      longitude: picked.longitude != null ? Number(picked.longitude) : undefined,
      areaSlug: picked.area_slug || undefined,
      dishes: isPackageMode
        ? (preselectedPackage?.dishSummary || "Package booking")
        : (selectedDishes.map((d) => d.name).join(", ") || dishes.trim()),
    };

    if (isPackageMode && preselectedPackage) {
      onProceedToPayment({
        ...base,
        selectedItems: undefined,
        packageId: preselectedPackage.packageId,
        packageName: preselectedPackage.packageName,
        selectedCategories: preselectedPackage.selectedCategories,
        selectedAddonIds: preselectedPackage.selectedAddonIds,
      });
    } else {
      onProceedToPayment({
        ...base,
        selectedItems: selectedDishes.length > 0
          ? selectedDishes.map((d) => ({ menuItemId: d.menuItemId, name: d.name, qty: d.qty, price: d.price }))
          : undefined,
      });
    }
  }

  // Group menu items by category (Build Your Own mode)
  const menuByCategory: Record<string, MenuItem[]> = {};
  menuItems.forEach((item) => {
    const cat = item.category || "other";
    if (!menuByCategory[cat]) menuByCategory[cat] = [];
    menuByCategory[cat].push(item);
  });

  const categoryLabels: Record<string, string> = {
    starter: "Starters", main_course: "Main Course", bread: "Breads",
    rice: "Rice", dessert: "Desserts", beverage: "Beverages",
    snack: "Snacks", other: "Other",
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={isPackageMode ? "Confirm Package Booking" : "Book a Chef"}>

        {/* Chef preview */}
        <div className="flex items-center gap-3.5 mb-5 p-3.5 bg-[var(--cream-100)] rounded-[12px]">
          {chef.user?.avatar ? (
            <img src={chef.user.avatar} alt={name} className="w-[50px] h-[50px] rounded-full object-cover" />
          ) : (
            <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] flex items-center justify-center font-display text-[1.1rem] font-[800] text-[rgba(0,0,0,0.3)]">
              {ini}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold">{name}</div>
            <div className="text-[0.8rem] text-[var(--text-muted)]">
              {chef.cuisines?.join(", ") || chef.specialties || "Home Cooking"}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="inline-block px-3 py-1 rounded-full bg-[rgba(212,114,26,0.08)] text-[var(--orange-500)] font-bold text-[0.82rem] whitespace-nowrap">
              ₹{effectiveVisitFee} visit fee
            </div>
          </div>
        </div>

        {/* ─── PACKAGE MODE: Package Summary (readonly) ─── */}
        {isPackageMode && preselectedPackage && (
          <div className="mb-4 p-4 bg-[rgba(212,114,26,0.04)] border border-[rgba(212,114,26,0.15)] rounded-[12px]">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-[var(--orange-500)]" />
              <span className="font-bold text-[0.9rem] text-[var(--brown-800)]">
                {preselectedPackage.packageName}
              </span>
              <span className="ml-auto text-[0.78rem] text-[var(--text-muted)]">
                {preselectedPackage.guestCount} guests
              </span>
            </div>
            {preselectedPackage.dishSummary && (
              <p className="text-[0.8rem] text-[var(--text-muted)] leading-relaxed">
                <span className="font-semibold text-[var(--brown-800)]">Dishes: </span>
                {preselectedPackage.dishSummary}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <Tag className="w-3.5 h-3.5 text-[var(--orange-500)]" />
              <span className="font-bold text-[var(--orange-500)] text-[0.9rem]">
                ₹{preselectedPackage.totalAmount.toLocaleString('en-IN')}
              </span>
              <span className="text-[0.75rem] text-[var(--text-muted)]">(incl. visit fee + 2.5% convenience)</span>
            </div>
          </div>
        )}

        {/* ─── ADDRESS SECTION ─── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 font-semibold text-[0.88rem]">
              <MapPin className="w-4 h-4 text-[var(--orange-500)]" /> Delivery Address{" "}
              <span className="text-red-400">*</span>
            </label>
          </div>

          {addressesLoading ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--orange-500)]" />
            </div>
          ) : !hasAddresses ? (
            <div className="border-2 border-dashed border-[var(--orange-400)] rounded-[12px] p-5 text-center bg-[rgba(212,114,26,0.04)]">
              <MapPin className="w-8 h-8 text-[var(--orange-400)] mx-auto mb-2" />
              <p className="text-[0.9rem] font-semibold text-[var(--text-dark)] mb-1">No saved address</p>
              <p className="text-[0.82rem] text-[var(--text-muted)] mb-3">
                Please save your delivery address first.
              </p>
              <button
                type="button"
                onClick={() => setAddressModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.85rem] hover:bg-[var(--orange-400)] transition cursor-pointer border-none"
              >
                <Plus className="w-4 h-4" /> Save Address
              </button>
            </div>
          ) : !showAllAddresses ? (
            <div className="border border-[var(--cream-300)] rounded-[12px] p-3.5 bg-[rgba(212,114,26,0.02)]">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-[0.88rem]">
                      {selectedAddress?.label ? selectedAddress.label.charAt(0).toUpperCase() + selectedAddress.label.slice(1) : "Home"}
                    </span>
                    {selectedAddress?.is_default && (
                      <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Default</span>
                    )}
                  </div>
                  <div className="text-[0.82rem] text-[var(--text-muted)] leading-relaxed">
                    {selectedAddress ? formatAddressLine(selectedAddress) : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--cream-200)]">
                {addresses.length > 1 && (
                  <button type="button" onClick={() => setShowAllAddresses(true)}
                    className="text-[0.8rem] font-semibold text-[var(--orange-500)] hover:text-[var(--orange-400)] bg-transparent border-none cursor-pointer p-0">
                    Change address
                  </button>
                )}
                {addresses.length < 5 && (
                  <button type="button" onClick={() => setAddressModalOpen(true)}
                    className="text-[0.8rem] font-semibold text-[var(--text-muted)] hover:text-[var(--orange-500)] bg-transparent border-none cursor-pointer p-0 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add new
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 mb-2">
                {addresses.map((a) => (
                  <AddressCard key={a.id} address={a} mode="select"
                    selected={selectedAddressId === a.id}
                    onSelect={() => { setSelectedAddressId(a.id); setShowAllAddresses(false); }} />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowAllAddresses(false)}
                  className="text-[0.8rem] font-semibold text-[var(--text-muted)] hover:text-[var(--text-dark)] bg-transparent border-none cursor-pointer p-0">
                  Cancel
                </button>
                {addresses.length < 5 && (
                  <button type="button" onClick={() => setAddressModalOpen(true)}
                    className="text-[0.8rem] font-semibold text-[var(--orange-500)] hover:text-[var(--orange-400)] bg-transparent border-none cursor-pointer p-0 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add new
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* P1.6 — Soft warning when chef doesn't list customer's area */}
        {showAreaWarning && (
          <div className="mb-4 p-3 rounded-[12px] border border-amber-300 bg-amber-50 flex items-start gap-2">
            <span className="text-amber-600 text-[1rem] leading-none mt-0.5">⚠️</span>
            <div className="text-[0.82rem] text-amber-900 leading-relaxed">
              <span className="font-semibold">Heads up:</span> {chef?.user?.name || "This chef"} hasn't
              listed <span className="font-semibold">{selectedAddress?.area || "your area"}</span> as
              one of their service areas. The booking will go through and the chef will see your full
              address — they may accept or decline based on travel time.
            </div>
          </div>
        )}

        {/* Rest of form (only shown when address exists) */}
        {hasAddresses && (
          <>
            {/* Date & Time */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="flex items-center gap-1.5 font-semibold text-[0.88rem] mb-2">
                  <CalendarDays className="w-4 h-4 text-[var(--orange-500)]" /> Date
                </label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={inputClasses} style={{ fontFamily: "var(--font-body)" }} />
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-1.5 font-semibold text-[0.88rem] mb-2">
                  <Clock className="w-4 h-4 text-[var(--orange-500)]" /> Time
                </label>
                {slotsLoading ? (
                  <div className={inputClasses + " flex items-center justify-center text-[var(--text-muted)] text-[0.85rem]"}>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
                  </div>
                ) : slots.length > 0 ? (
                  <select value={time} onChange={(e) => setTime(e.target.value)}
                    className={inputClasses} style={{ fontFamily: "var(--font-body)" }}>
                    {slots.map((s) => {
                      const d = new Date(s.start);
                      const ist = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
                      const hh = String(ist.getUTCHours()).padStart(2, "0");
                      const mm = String(ist.getUTCMinutes()).padStart(2, "0");
                      return <option key={s.start} value={`${hh}:${mm}`}>{s.label}</option>;
                    })}
                  </select>
                ) : (
                  <div className={inputClasses + " text-[var(--text-muted)] text-[0.85rem] flex items-center"}>
                    {slotsError ? slotsError : "No slots available"}
                  </div>
                )}
              </div>
            </div>

            {/* Duration & Guests (Build Your Own only shows guests selector; package mode shows fixed guest count) */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="flex items-center gap-1.5 font-semibold text-[0.88rem] mb-2">
                  <Clock className="w-4 h-4 text-[var(--orange-500)]" /> Duration
                </label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}
                  className={inputClasses} style={{ fontFamily: "var(--font-body)" }}>
                  {durations.map((d) => (
                    <option key={d.label} value={d.label}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-1.5 font-semibold text-[0.88rem] mb-2">
                  <Users className="w-4 h-4 text-[var(--orange-500)]" /> Guests
                </label>
                {isPackageMode && preselectedPackage ? (
                  <div className={inputClasses + " text-[var(--text-dark)] font-semibold flex items-center"}>
                    {preselectedPackage.guestCount} guests (package)
                  </div>
                ) : (
                  <select value={guests} onChange={(e) => setGuests(e.target.value)}
                    className={inputClasses} style={{ fontFamily: "var(--font-body)" }}>
                    {guestOptions.map((g) => (
                      <option key={g.label} value={g.label}>{g.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* ─── MENU SELECTION (Build Your Own only) ─── */}
            {!isPackageMode && (
              <div className="mb-4">
                <button type="button" onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center justify-between w-full font-semibold text-[0.88rem] mb-2 bg-transparent border-none cursor-pointer p-0">
                  <span className="flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-[var(--orange-500)]" />
                    Select Dishes from Menu
                    {selectedDishes.length > 0 && (
                      <span className="bg-[var(--orange-500)] text-white text-[0.7rem] px-2 py-0.5 rounded-full font-bold">
                        {selectedDishes.length}
                      </span>
                    )}
                  </span>
                  {showMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showMenu && (
                  <div className="border border-[var(--cream-300)] rounded-[12px] overflow-hidden max-h-[280px] overflow-y-auto">
                    {loadingMenu ? (
                      <div className="p-6 text-center text-[var(--text-muted)] text-[0.85rem]">Loading menu...</div>
                    ) : menuItems.length === 0 ? (
                      <div className="p-4">
                        <p className="text-[0.85rem] text-[var(--text-muted)] mb-2">
                          No menu items yet. Type dishes below:
                        </p>
                        <input type="text" value={dishes} onChange={(e) => setDishes(e.target.value)}
                          placeholder="e.g. Paneer Tikka, Dal Makhani..."
                          className={inputClasses} style={{ fontFamily: "var(--font-body)" }} />
                      </div>
                    ) : (
                      Object.entries(menuByCategory).map(([cat, items]) => (
                        <div key={cat}>
                          <div className="px-3 py-1.5 bg-[var(--cream-100)] text-[0.75rem] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            {categoryLabels[cat] || cat}
                          </div>
                          {items.map((item) => {
                            const sel = selectedDishes.find((d) => d.menuItemId === item.id);
                            const isSelected = !!sel;
                            return (
                              <div key={item.id}
                                className={`flex items-center gap-3 px-3 py-2.5 border-b border-[var(--cream-200)] cursor-pointer transition-colors ${isSelected ? "bg-[rgba(212,114,26,0.06)]" : "hover:bg-[var(--cream-50)]"}`}
                                onClick={() => !isSelected && toggleDish(item)}>
                                <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${item.type === "veg" ? "border-green-600" : "border-red-600"}`}>
                                  <div className={`w-2 h-2 rounded-full ${item.type === "veg" ? "bg-green-600" : "bg-red-600"}`} />
                                </div>
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[0.88rem] font-medium truncate">{item.name}</div>
                                  {item.description && (
                                    <div className="text-[0.75rem] text-[var(--text-muted)] truncate">{item.description}</div>
                                  )}
                                </div>
                                <div className="text-[0.88rem] font-bold text-[var(--orange-500)] flex-shrink-0">
                                  {formatCurrency(Number(item.price))}
                                </div>
                                {isSelected ? (
                                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => updateDishQty(item.id, -1)}
                                      className="w-7 h-7 rounded-full border border-[var(--cream-300)] flex items-center justify-center bg-white cursor-pointer hover:border-[var(--orange-500)]">
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[0.88rem] font-bold w-5 text-center">{sel.qty}</span>
                                    <button type="button" onClick={() => updateDishQty(item.id, 1)}
                                      className="w-7 h-7 rounded-full border border-[var(--orange-500)] bg-[var(--orange-500)] text-white flex items-center justify-center cursor-pointer hover:bg-[var(--orange-400)]">
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button type="button"
                                    className="text-[0.75rem] px-3 py-1 rounded-full border border-[var(--orange-500)] text-[var(--orange-500)] bg-transparent cursor-pointer hover:bg-[rgba(212,114,26,0.08)] transition-colors flex-shrink-0">
                                    Add
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fallback text input */}
            {!isPackageMode && menuItems.length > 0 && selectedDishes.length === 0 && (
              <div className="mb-4">
                <label className="block text-[0.8rem] text-[var(--text-muted)] mb-1.5">Or type dishes manually:</label>
                <input type="text" value={dishes} onChange={(e) => setDishes(e.target.value)}
                  placeholder="e.g. Paneer Tikka, Dal Makhani, Roti..."
                  className={inputClasses} style={{ fontFamily: "var(--font-body)" }} />
              </div>
            )}

            {/* Special Requests */}
            <div className="mb-5">
              <label className="block font-semibold text-[0.88rem] mb-2">Special Requests</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Allergies, dietary needs, Jain food..."
                className={`${inputClasses} resize-y`} style={{ fontFamily: "var(--font-body)" }} />
            </div>

            {/* ─── PRICE BREAKDOWN ─── */}
            <div className="bg-[var(--cream-100)] rounded-[12px] p-4 mb-5">
              {isPackageMode && preselectedPackage ? (
                <>
                  <div className="flex justify-between text-[0.85rem] mb-1">
                    <span className="text-[var(--text-muted)]">Package ({preselectedPackage.packageName})</span>
                    <span>₹{dishSubtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-[0.88rem] mb-1.5">
                    <span className="text-[var(--text-muted)]">Visit fee</span>
                    <span>₹{visitFee}</span>
                  </div>
                  <div className="flex justify-between text-[0.88rem] mb-1.5">
                    <span className="text-[var(--text-muted)]">Convenience fee (2.5%)</span>
                    <span>₹{convenienceFee}</span>
                  </div>
                  <div className="flex justify-between text-[1rem] font-bold border-t border-[rgba(212,114,26,0.12)] pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-[var(--orange-500)]">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[0.72rem] text-[var(--text-muted)] mt-2 leading-snug">
                    + Ingredients at actual market cost (with receipt from chef)
                  </div>
                </>
              ) : hasDishSelection ? (
                <>
                  {selectedDishes.map((d) => (
                    <div key={d.menuItemId} className="flex justify-between text-[0.85rem] mb-1">
                      <span className="text-[var(--text-muted)]">{d.name} × {d.qty}</span>
                      <span>{formatCurrency(d.price * d.qty)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[0.85rem] mb-1.5 pt-1.5 border-t border-[rgba(212,114,26,0.08)]">
                    <span className="text-[var(--text-muted)]">Dishes subtotal</span>
                    <span>{formatCurrency(dishSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[0.88rem] mb-1.5">
                    <span className="text-[var(--text-muted)]">Visit fee</span>
                    <span>{formatCurrency(visitFee)}</span>
                  </div>
                  <div className="flex justify-between text-[0.88rem] mb-1.5">
                    <span className="text-[var(--text-muted)]">Convenience fee (2.5%)</span>
                    <span>{formatCurrency(convenienceFee)}</span>
                  </div>
                  <div className="flex justify-between text-[1rem] font-bold border-t border-[rgba(212,114,26,0.12)] pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-[var(--orange-500)]">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="text-[0.72rem] text-[var(--text-muted)] mt-2 leading-snug">
                    + Ingredients at actual market cost (with receipt)
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-[0.88rem] text-[var(--text-muted)]">
                  <Utensils className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Select at least one dish to see your total.
                </div>
              )}
            </div>

            {/* Cancellation policy */}
            <div className="text-[0.75rem] text-[var(--text-muted)] mb-4 leading-relaxed bg-[rgba(212,114,26,0.04)] rounded-[8px] p-3">
              <span className="font-semibold text-[var(--brown-800)]">Cancellation:</span>{" "}
              Free 24h+ before slot (100% refund). After that: 75% (8h+), 50% (4h+), 25% (2h+), 0% under 2h.
            </div>

            <button onClick={handleProceed}
              disabled={isPackageMode ? false : !hasDishSelection}
              className="w-full py-4 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-base cursor-pointer transition-all hover:bg-[var(--orange-400)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--orange-500)] disabled:hover:translate-y-0"
              style={{ fontFamily: "var(--font-body)" }}>
              {isPackageMode
                ? `Confirm Package — ₹${totalAmount.toLocaleString('en-IN')}`
                : hasDishSelection
                  ? `Proceed to Payment — ${formatCurrency(totalAmount)}`
                  : "Select a dish to continue"}
            </button>
          </>
        )}
      </Modal>

      <AddressModal isOpen={addressModalOpen} onClose={() => setAddressModalOpen(false)}
        existingAddress={null} onSaved={handleAddressSaved} />
    </>
  );
}