"use client";

/**
 * Chef Detail Page — P1.5c update
 * FILE: src/app/(public)/chef/detail/page.tsx
 *
 * Changes from previous version:
 *  - Tabs: "packages" (default) | "menu" | "reviews"
 *  - "Packages" tab renders PackageSelector
 *  - "Book This Chef" (Build Your Own) opens BookingModal with normal dish flow
 *  - Package selection opens BookingModal in package mode
 *  - Logged-out users: "Login to Book" prompt
 */

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cooksApi, reviewsApi } from "@/lib/api";
import api, { bookingsApi, mealPackagesApi } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";
import { FooterSimple } from "@/components/layout/Footer";
import StarRating from "@/components/ui/StarRating";
import PackageSelector from "@/components/dashboard/PackageSelector";
import BookingModal from "@/components/modals/BookingModal";
import PaymentModal from "@/components/modals/PaymentModal";
import type { BookingFormData } from "@/components/modals/BookingModal";
import type { PackageSelectionPayload, PaymentMethod } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft, MapPin, IndianRupee, Clock, ChefHat, Star,
  Leaf, BadgeCheck, Users, Package,
} from "lucide-react";
import toast from "react-hot-toast";

function ChefDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { user: authUser, isAuthenticated } = useAuthStore();

  const [cook, setCook] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewPagination, setReviewPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: packages (default) | menu | reviews
  const [activeTab, setActiveTab] = useState<"packages" | "menu" | "reviews">("packages");

  // Booking modals
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null);

  // Package booking mode — set when user clicks "Book Package" in PackageSelector
  const [pendingPackage, setPendingPackage] = useState<PackageSelectionPayload | null>(null);

  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadChef();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChef() {
    setLoading(true);
    try {
      const [cookRes, menuRes, reviewsRes] = await Promise.all([
        cooksApi.getById(id!),
        cooksApi.getMenu(id!),
        reviewsApi.getByCook(id!, { limit: 10 }),
      ]);

      const cookData = cookRes.data?.data || cookRes.data;
      setCook(cookData);

      const menuData = menuRes.data?.data || menuRes.data;
      setMenu(Array.isArray(menuData) ? menuData : menuData?.items || []);

      const revData = reviewsRes.data?.data || reviewsRes.data;
      setReviews(revData?.reviews || (Array.isArray(revData) ? revData : []));
      setReviewPagination(revData?.pagination);
    } catch {
      setCook(null);
    } finally {
      setLoading(false);
    }
  }

  // ─── Package booking: user selected a package ─────────
  function handlePackageBooked(payload: PackageSelectionPayload) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setPendingPackage(payload);
    setBookingModalOpen(true);
  }

  // ─── Build Your Own: open modal with normal dish flow ─
  function handleBuildYourOwn() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setPendingPackage(null);
    setBookingModalOpen(true);
  }

  // ─── BookingModal callback ─────────────────────────────
  async function handleProceedToPayment(data: BookingFormData) {
  try {
    setBookingData(data);
    const payload: Record<string, unknown> = {
      cook_id: data.cookId,
      scheduled_at: `${data.date}T${data.time}:00`,
      address: data.address,
      address_id: data.addressId,
      latitude: data.latitude,
      longitude: data.longitude,
      duration_hours: data.durationHours,
      guests: data.guestsCount,
      dishes: data.dishes,
      instructions: data.notes,
      amount: data.amount,
      selected_items: data.selectedItems,
    };
    if (data.packageId) {
      payload.packageId = data.packageId;
      payload.guestCount = data.guestsCount;
      payload.selectedCategories = data.selectedCategories;
      payload.selectedAddonIds = data.selectedAddonIds;
    }
    const res = await bookingsApi.create(payload as any);
    const id = res.data?.data?.id ?? res.data?.id;
    setPendingBookingId(id);
    setBookingModalOpen(false);
    setPaymentModalOpen(true);
  } catch (err: any) {
    toast.error(err?.response?.data?.message || "Failed to create booking. Try again.");
  }
}

  function handlePaymentSuccess(_method?: PaymentMethod) {
    setPaymentModalOpen(false);
    setPendingPackage(null);
    setBookingData(null);
    toast.success("Booking sent! Chef will respond within 3 hours.");
    router.push("/dashboard/customer");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cream-100)]">
        <Navbar />
        <div className="pt-[100px] flex justify-center">
          <div className="w-8 h-8 border-3 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!cook) {
    return (
      <div className="min-h-screen bg-[var(--cream-100)]">
        <Navbar />
        <div className="pt-[120px] text-center px-5">
          <ChefHat className="w-16 h-16 mx-auto mb-4 text-[var(--cream-300)]" />
          <h1 className="font-display text-[1.5rem] font-[900] text-[var(--brown-800)] mb-2">Chef Not Found</h1>
          <p className="text-[var(--text-muted)] mb-6">This chef profile doesn&apos;t exist or has been removed.</p>
          <Link href="/chef" className="px-6 py-3 rounded-full bg-[var(--orange-500)] text-white font-semibold no-underline">
            Browse Chefs
          </Link>
        </div>
      </div>
    );
  }

  const user = cook.user || {};
  const chefName = user.name || "Chef";
  const initials = chefName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const rating = Number(cook.rating || 0);
  const totalReviews = cook.total_reviews || cook.totalReviews || 0;
  const cuisines = cook.cuisines || [];
  const isAvailable = cook.is_available ?? cook.isAvailable ?? true;
  const isVeg = cook.is_veg_only ?? cook.isVegOnly ?? false;
  const isVerified = cook.is_verified ?? cook.isVerified ?? false;

  // Group menu by category
  const menuByCategory: Record<string, any[]> = {};
  menu.forEach((item) => {
    const cat = item.category || "Other";
    if (!menuByCategory[cat]) menuByCategory[cat] = [];
    menuByCategory[cat].push(item);
  });

  const tabs = [
    { key: "packages" as const, label: "Packages", icon: Package },
    { key: "menu" as const, label: `Menu (${menu.length})`, icon: null },
    { key: "reviews" as const, label: `Reviews (${totalReviews})`, icon: null },
  ];

  return (
    <div className="min-h-screen bg-[var(--cream-100)]">
      <Navbar />
      <div className="pt-[88px] pb-16 px-5 max-w-[800px] mx-auto">

        {/* Back */}
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[0.85rem] text-[var(--text-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--orange-500)] mb-5"
          style={{ fontFamily: "var(--font-body)" }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Profile header */}
        <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(212,114,26,0.06)] mb-6">
          <div className="h-[100px] bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] relative">
            <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-display font-[800] text-2xl text-white border-4 border-white">
              {initials}
            </div>
          </div>
          <div className="pt-14 pb-6 px-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-[1.4rem] font-[900] text-[var(--brown-800)]">{chefName}</h1>
                  {isVerified && <BadgeCheck className="w-5 h-5 text-[var(--orange-500)]" />}
                  {isVeg && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[0.7rem] font-semibold border border-green-200">
                      <Leaf className="w-3 h-3" /> Pure Veg
                    </span>
                  )}
                </div>
                {cuisines.length > 0 && (
                  <div className="text-[0.88rem] text-[var(--text-muted)] mt-1">{cuisines.join(", ")}</div>
                )}
              </div>
              <div className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${isAvailable ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                {isAvailable ? "Available" : "Offline"}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[#F5A623]" />
                <span className="font-bold text-[0.95rem]">{rating > 0 ? rating.toFixed(1) : "New"}</span>
                <span className="text-[0.82rem] text-[var(--text-muted)]">({totalReviews} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-[var(--orange-500)]" />
                <span className="font-bold text-[0.95rem]">₹49 visit fee</span>
                <span className="text-[0.82rem] text-[var(--text-muted)]">+ dish prices</span>
              </div>
            </div>

            {cook.bio && (
              <p className="text-[0.9rem] text-[var(--text-muted)] mt-4 leading-relaxed">{cook.bio}</p>
            )}

            {/* Build Your Own CTA */}
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleBuildYourOwn}
                className="px-6 py-3 rounded-full bg-[var(--orange-500)] text-white font-bold text-[0.88rem] border-none cursor-pointer transition-all hover:bg-[var(--orange-400)] hover:-translate-y-0.5"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <ChefHat className="w-4 h-4 inline -mt-0.5 mr-1.5" />
                Build Your Own
              </button>
              <button
                onClick={() => setActiveTab("packages")}
                className="px-6 py-3 rounded-full border-2 border-[var(--orange-500)] text-[var(--orange-500)] font-bold text-[0.88rem] bg-transparent cursor-pointer transition-all hover:bg-[rgba(212,114,26,0.06)]"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <Package className="w-4 h-4 inline -mt-0.5 mr-1.5" />
                View Packages
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-1 bg-white rounded-full p-1 border border-[rgba(212,114,26,0.06)] w-fit min-w-full sm:min-w-0">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2.5 rounded-full text-[0.85rem] font-semibold border-none cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === t.key
                    ? "bg-[var(--orange-500)] text-white"
                    : "bg-transparent text-[var(--text-muted)] hover:text-[var(--orange-500)]"
                }`}
                style={{ fontFamily: "var(--font-body)" }}>
                {t.icon && <t.icon className="w-3.5 h-3.5" />}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── PACKAGES TAB ─── */}
        {activeTab === "packages" && (
          <PackageSelector
            cookId={id!}
            onBookPackage={handlePackageBooked}
            isGuest={!isAuthenticated}
            onLoginPrompt={() => router.push("/login")}
          />
        )}

        {/* ─── MENU TAB (Build Your Own) ─── */}
        {activeTab === "menu" && (
          <div>
            {menu.length === 0 ? (
              <div className="bg-white rounded-[16px] p-10 text-center text-[var(--text-muted)] border border-[rgba(212,114,26,0.06)]">
                <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-[0.9rem]">This chef hasn&apos;t added any menu items yet.</p>
              </div>
            ) : (
              <>
                {Object.entries(menuByCategory).map(([category, items]) => (
                  <div key={category} className="mb-6">
                    <h3 className="font-bold text-[0.9rem] text-[var(--brown-800)] mb-3 uppercase tracking-wide">{category}</h3>
                    <div className="grid gap-3">
                      {items.map((item) => (
                        <div key={item.id}
                          className="bg-white rounded-[14px] p-4 border border-[rgba(212,114,26,0.06)] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                              item.type === "veg" ? "border-green-600" : "border-red-600"
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${item.type === "veg" ? "bg-green-600" : "bg-red-600"}`} />
                            </div>
                            <div>
                              <div className="font-semibold text-[0.92rem]">{item.name}</div>
                              {item.description && (
                                <div className="text-[0.78rem] text-[var(--text-muted)] mt-0.5 line-clamp-1">{item.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="font-bold text-[0.92rem] text-[var(--orange-500)] shrink-0 ml-4">
                            ₹{Number(item.price).toFixed(0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleBuildYourOwn}
                  className="w-full py-3.5 mt-2 rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-[0.95rem] border-none cursor-pointer transition-all hover:bg-[var(--orange-400)] hover:-translate-y-0.5"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <ChefHat className="w-4 h-4 inline -mt-0.5 mr-1.5" />
                  Book This Chef — Choose Dishes
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── REVIEWS TAB ─── */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div className="bg-white rounded-[16px] p-10 text-center text-[var(--text-muted)] border border-[rgba(212,114,26,0.06)]">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-[0.9rem]">No reviews yet. Be the first to book and review!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const reviewUser = review.user || {};
                  const reviewerName = reviewUser.name || "Customer";
                  const reviewerInitials = reviewerName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  const reviewDate = review.created_at ? new Date(review.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  }) : "";

                  return (
                    <div key={review.id}
                      className="bg-white rounded-[14px] p-5 border border-[rgba(212,114,26,0.06)]">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[rgba(212,114,26,0.1)] flex items-center justify-center font-bold text-[0.75rem] text-[var(--orange-500)] shrink-0">
                          {reviewerInitials}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <div className="font-semibold text-[0.9rem]">{reviewerName}</div>
                            <div className="text-[0.75rem] text-[var(--text-muted)]">{reviewDate}</div>
                          </div>
                          <div className="mt-1">
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                          {review.comment && (
                            <p className="text-[0.85rem] text-[var(--text-muted)] mt-2 leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <FooterSimple />

      {/* ─── Modals ─── */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => { setBookingModalOpen(false); setPendingPackage(null); }}
        chef={cook}
        onProceedToPayment={handleProceedToPayment}
        preselectedPackage={pendingPackage}
      />

      {bookingData && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          bookingId={pendingBookingId ?? ""}
          amount={bookingData.amount}
          description={bookingData.packageName ? `Package: ${bookingData.packageName}` : "Chef Booking"}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

import { Suspense } from "react";

export default function ChefDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--cream-100)] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChefDetailContent />
    </Suspense>
  );
}
