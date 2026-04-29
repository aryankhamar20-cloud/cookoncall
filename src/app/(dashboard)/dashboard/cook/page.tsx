"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Home, Calendar, DollarSign, FileText, User, CheckCircle2, XCircle,
  MapPin, Clock, Users, IndianRupee, ChefHat, AlertCircle, Plus, Pencil,
  Trash2, Loader2, Save, Leaf, X, ShieldCheck, ShieldAlert, Upload,
  Phone, FileCheck, Camera, BadgeCheck, KeyRound, Utensils, Star, MessageSquare,
  CalendarClock,
  Package,
} from "lucide-react";
import DashboardLayout, { type SidebarSection } from "@/components/layout/DashboardLayout";
import AvailabilityPanel from "@/components/dashboard/AvailabilityPanel";
import MealPackagesPanel from "@/components/dashboard/MealPackagesPanel";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";
import { getGreeting, formatCurrency } from "@/lib/utils";
import api, { cooksApi, bookingsApi, uploadsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/types";

const titles: Record<string, string> = {
  overview: "Overview",
  requests: "Booking Requests",
  earnings: "My Earnings",
  menu: "My Menu",
  packages: "Meal Packages",
  profile: "My Profile",
  verification: "Verification",
  reviews: "My Reviews",
  availability: "Availability",
};

const requestFilters = [
  { label: "All", value: "" },
  // Apr 21 new flow: chef pending is now pending_chef_approval.
  // `pending` kept for any legacy rows still around.
  { label: "New Requests", value: "pending_chef_approval" },
  { label: "Awaiting Payment", value: "awaiting_payment" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

const statusStyles: Record<string, string> = {
  pending_chef_approval: "bg-amber-50 text-amber-700 border-amber-200",
  awaiting_payment: "bg-orange-50 text-orange-700 border-orange-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200", // legacy
  confirmed: "bg-green-50 text-green-700 border-green-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled_by_user: "bg-red-50 text-red-600 border-red-200",
  cancelled_by_cook: "bg-red-50 text-red-600 border-red-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

const statusLabels: Record<string, string> = {
  pending_chef_approval: "New Request",
  awaiting_payment: "Awaiting Payment",
  pending: "Pending", // legacy
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled_by_user: "Cancelled by Customer",
  cancelled_by_cook: "Rejected by You",
  expired: "Expired",
};

const DISH_CATEGORIES = [
  { value: "starter", label: "Starter" },
  { value: "main_course", label: "Main Course" },
  { value: "bread", label: "Bread" },
  { value: "rice", label: "Rice" },
  { value: "dessert", label: "Dessert" },
  { value: "beverage", label: "Beverage" },
  { value: "snack", label: "Snack" },
];

const CUISINE_OPTIONS = [
  "Gujarati", "North Indian", "South Indian", "Punjabi", "Rajasthani",
  "Bengali", "Maharashtrian", "Chinese", "Italian", "Continental",
  "Street Food", "Mughlai", "Thai", "Mexican",
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─── IMAGE COMPRESSION HELPER ────────────────────────────
async function compressImage(file: File, maxWidth = 800, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], file.name, { type: "image/jpeg" }));
        else resolve(file);
      }, "image/jpeg", quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function CookDashboardPage() {
  const { isLoading, authorized } = useAuth({ requiredRole: "cook" });
  const { activePanel, setPanel } = useUIStore();
  const { user } = useAuthStore();
  const greeting = getGreeting();

  // Requests
  const [requests, setRequests] = useState<any[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqFilter, setReqFilter] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ pending: 0, completed: 0, totalEarned: 0, rating: 0 });

  // Profile
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: "", city: "", pincode: "", is_veg_only: false, cuisines: [] as string[],
    service_roles: ["home_cook"] as string[],
    latitude: null as number | null, longitude: null as number | null,
    // P1.6 — service area model
    service_area_slugs: [] as string[],
    serves_all_city: false,
    service_area_fees: {} as Record<string, number>,
  });
  const [detectingLocation, setDetectingLocation] = useState(false);

  // P1.6 — area master list + request flow state
  const [areaList, setAreaList] = useState<{ slug: string; name: string; region: string }[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areaRequestMode, setAreaRequestMode] = useState(false);
  const [areaRequestName, setAreaRequestName] = useState("");
  const [areaRequestSubmitting, setAreaRequestSubmitting] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [availToggling, setAvailToggling] = useState(false);

  // My Reviews (reviews the chef has RECEIVED)
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewsStats, setReviewsStats] = useState<{
    average_rating: number;
    total_reviews: number;
    distribution: Record<string, number>;
  }>({ average_rating: 0, total_reviews: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Menu
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: "", price: "", type: "veg", category: "main_course", description: "", image: "" });
  const [menuImageUploading, setMenuImageUploading] = useState(false);
  const menuImageRef = useRef<HTMLInputElement>(null);

  // Verification
  const [verStatus, setVerStatus] = useState<VerificationStatus>("not_submitted");
  const [verRejection, setVerRejection] = useState<string | null>(null);
  const [verLoading, setVerLoading] = useState(false);
  // Bug 7 — track whether the initial verification status fetch has completed.
  // Without this, the banner renders with the default "not_submitted" state for ~1-5s
  // while the real status is being fetched, causing a flicker for already-verified chefs.
  const [verChecked, setVerChecked] = useState(false);
  const [verSubmitting, setVerSubmitting] = useState(false);
  const [verForm, setVerForm] = useState({
    aadhaar_url: "", pan_url: "", address_proof_url: "", fssai_url: "",
    emergency_contact_name: "", emergency_contact_phone: "", terms_accepted: false,
  });
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Cooking OTP
  const [otpState, setOtpState] = useState<Record<string, { step: string; otp: string; loading: boolean }>>({});

  useEffect(() => {
    const valid = ["overview", "requests", "earnings", "menu", "packages", "profile", "verification", "reviews", "availability"];
    if (!valid.includes(activePanel)) setPanel("overview");
  }, []); // eslint-disable-line

  // ─── FETCH REQUESTS ────────────────────────────────────
  const fetchRequests = useCallback(async (statusFilter?: string) => {
    try {
      setReqLoading(true); setReqError(null);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get("/bookings/cook", { params });
      const raw = data?.data ?? data;
      const list = Array.isArray(raw) ? raw : raw?.bookings ?? raw?.data ?? [];
      setRequests(Array.isArray(list) ? list : []);
      if (!statusFilter) {
        const all = Array.isArray(list) ? list : [];
        setStats({
          // Apr 21 new flow: pending = bookings awaiting chef action.
          // Includes legacy `pending` rows for safety.
          pending: all.filter(
            (b: any) => b.status === "pending_chef_approval" || b.status === "pending",
          ).length,
          completed: all.filter((b: any) => b.status === "completed").length,
          // Chef payout is 97.5% of dish revenue (platform keeps 2.5%).
          totalEarned: Math.round(all.filter((b: any) => b.status === "completed").reduce((s: number, b: any) => s + (Number(b.total_price) || 0) * 0.975, 0)),
          rating: 0,
        });
      }
    } catch (err: any) { setReqError(err.message); }
    finally { setReqLoading(false); }
  }, []);

  // ─── FETCH PROFILE ─────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const { data } = await api.get("/cooks/me/profile");
      const p = data?.data ?? data;
      setProfile(p);
      setProfileForm({
        bio: p.bio || "", city: p.city || "", pincode: p.pincode || "",
        is_veg_only: !!p.is_veg_only, cuisines: Array.isArray(p.cuisines) ? p.cuisines : [],
        service_roles: Array.isArray(p.service_roles) ? p.service_roles : p.service_role ? [p.service_role] : ["home_cook"],
        latitude: p.latitude != null ? Number(p.latitude) : null,
        longitude: p.longitude != null ? Number(p.longitude) : null,
        service_area_slugs: Array.isArray(p.service_area_slugs) ? p.service_area_slugs : [],
        serves_all_city: !!p.serves_all_city,
        service_area_fees: (p.service_area_fees && typeof p.service_area_fees === "object")
          ? p.service_area_fees as Record<string, number>
          : {},
      });
      setIsAvailable(p.is_available !== false);
      if (p.rating) setStats((s) => ({ ...s, rating: Number(p.rating) || 0 }));
    } catch { /* profile might not exist */ }
    finally { setProfileLoading(false); }
  }, []);

  // ─── FETCH MENU ─────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setMenuLoading(true);
      const { data } = await api.get(`/cooks/${profile.id}/menu`);
      const items = data?.data ?? data;
      setMenuItems(Array.isArray(items) ? items : []);
    } catch { setMenuItems([]); }
    finally { setMenuLoading(false); }
  }, [profile?.id]);

  // ─── FETCH VERIFICATION STATUS ─────────────────────────
  const fetchVerification = useCallback(async () => {
    try {
      setVerLoading(true);
      const { data } = await cooksApi.getVerificationStatus();
      const v = data?.data ?? data;
      setVerStatus(v.verification_status || "not_submitted");
      setVerRejection(v.rejection_reason || null);
      // Pre-fill form with existing data
      setVerForm((f) => ({
        ...f,
        aadhaar_url: v.aadhaar_uploaded ? "(uploaded)" : "",
        pan_url: v.pan_uploaded ? "(uploaded)" : "",
        address_proof_url: v.address_proof_uploaded ? "(uploaded)" : "",
        fssai_url: v.fssai_uploaded ? "(uploaded)" : "",
        emergency_contact_name: f.emergency_contact_name,
        emergency_contact_phone: f.emergency_contact_phone,
        terms_accepted: v.terms_accepted || false,
      }));
    } catch { /* first time */ }
    finally {
      setVerLoading(false);
      setVerChecked(true); // Bug 7 — banner is only allowed to render after this flips true
    }
  }, []);

  // ─── FETCH MY REVIEWS (received) ───────────────────────
  const fetchMyReviews = useCallback(async () => {
    try {
      setReviewsLoading(true); setReviewsError(null);
      const { data } = await cooksApi.getMyReviewsReceived({ page: 1, limit: 50 });
      const raw = data?.data ?? data;
      setReviewsList(Array.isArray(raw?.reviews) ? raw.reviews : []);
      if (raw?.stats) {
        setReviewsStats({
          average_rating: Number(raw.stats.average_rating) || 0,
          total_reviews: Number(raw.stats.total_reviews) || 0,
          distribution: raw.stats.distribution || { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        });
        // Keep the overview "Rating" tile in sync
        setStats((s) => ({ ...s, rating: Number(raw.stats.average_rating) || 0 }));
      }
    } catch (err: any) {
      setReviewsError(err?.response?.data?.message || "Could not load your reviews.");
    } finally { setReviewsLoading(false); }
  }, []);

  useEffect(() => { if (authorized) { fetchRequests(); fetchProfile(); fetchVerification(); } }, [authorized, fetchRequests, fetchProfile, fetchVerification]);
  useEffect(() => { if (authorized && profile?.id && activePanel === "menu") fetchMenu(); }, [authorized, profile?.id, activePanel, fetchMenu]);
  useEffect(() => { if (authorized && activePanel === "requests") fetchRequests(reqFilter || undefined); }, [reqFilter]); // eslint-disable-line
  useEffect(() => { if (authorized && activePanel === "reviews") fetchMyReviews(); }, [authorized, activePanel, fetchMyReviews]);

  // P1.6 — Load service areas list when chef opens Profile tab
  useEffect(() => {
    if (!authorized || activePanel !== "profile") return;
    let cancelled = false;
    setAreasLoading(true);
    api.get("/areas", { params: { city: "Ahmedabad" } })
      .then((res: any) => {
        if (cancelled) return;
        const list = (res?.data?.data ?? res?.data ?? []) as any[];
        setAreaList(list.map((a) => ({ slug: a.slug, name: a.name, region: a.region })));
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setAreasLoading(false); });
    return () => { cancelled = true; };
  }, [authorized, activePanel]);

  // ─── BOOKING ACTIONS ───────────────────────────────────
  // Apr 21 new flow:
  //   - Accept  → POST /bookings/:id/accept  (status becomes AWAITING_PAYMENT)
  //   - Reject  → POST /bookings/:id/reject  { reason }  (internal reason, never shown to customer)
  //   - Generic status changes still use PATCH /bookings/:id/status (Cancel only).

  // Reject modal state — replaces the old `confirm()` alert with a proper
  // textarea so we can capture (and store internally) the rejection reason.
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    bookingId: string;
    customerName: string;
    reason: string;
    submitting: boolean;
  }>({ open: false, bookingId: "", customerName: "", reason: "", submitting: false });

  async function handleAccept(bookingId: string) {
    try {
      setActionId(bookingId);
      await bookingsApi.accept(bookingId);
      toast.success("Booking accepted! Customer has 3 hours to pay.");
      fetchRequests(reqFilter || undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not accept booking.");
    } finally {
      setActionId(null);
    }
  }

  function openRejectModal(bookingId: string, customerName: string) {
    setRejectModal({
      open: true,
      bookingId,
      customerName,
      reason: "",
      submitting: false,
    });
  }

  async function submitReject() {
    const reason = rejectModal.reason.trim();
    if (!reason || reason.length < 5) {
      toast.error("Please give a short reason (at least 5 characters).");
      return;
    }
    try {
      setRejectModal((m) => ({ ...m, submitting: true }));
      await bookingsApi.reject(rejectModal.bookingId, reason);
      toast.success("Booking rejected. Customer has been notified.");
      setRejectModal({ open: false, bookingId: "", customerName: "", reason: "", submitting: false });
      fetchRequests(reqFilter || undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not reject booking.");
      setRejectModal((m) => ({ ...m, submitting: false }));
    }
  }

  // Generic PATCH status action — kept for any non-accept/reject flows
  // that haven't migrated yet (there shouldn't be any caller after this batch).
  async function handleAction(id: string, status: string, msg: string, body?: any) {
    try {
      setActionId(id);
      await api.patch(`/bookings/${id}/status`, { status, ...body });
      toast.success(msg);
      fetchRequests(reqFilter || undefined);
    } catch (err: any) { toast.error(err?.response?.data?.message || "Action failed."); }
    finally { setActionId(null); }
  }

  // ─── COOKING OTP HANDLERS ──────────────────────────────
  async function handleSendStartOtp(bookingId: string) {
    setOtpState((s) => ({ ...s, [bookingId]: { step: "enter_start", otp: "", loading: true } }));
    try {
      await bookingsApi.sendStartOtp(bookingId);
      toast.success("Start OTP sent to customer's email!");
      setOtpState((s) => ({ ...s, [bookingId]: { step: "enter_start", otp: "", loading: false } }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not send OTP.");
      setOtpState((s) => { const n = { ...s }; delete n[bookingId]; return n; });
    }
  }

  async function handleVerifyStartOtp(bookingId: string) {
    const otp = otpState[bookingId]?.otp;
    if (!otp || otp.length < 4) { toast.error("Enter the OTP the customer received."); return; }
    setOtpState((s) => ({ ...s, [bookingId]: { ...s[bookingId], loading: true } }));
    try {
      await bookingsApi.verifyStartOtp(bookingId, otp);
      toast.success("Cooking session started!");
      setOtpState((s) => { const n = { ...s }; delete n[bookingId]; return n; });
      fetchRequests(reqFilter || undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid OTP.");
      setOtpState((s) => ({ ...s, [bookingId]: { ...s[bookingId], loading: false } }));
    }
  }

  async function handleSendEndOtp(bookingId: string) {
    setOtpState((s) => ({ ...s, [bookingId]: { step: "enter_end", otp: "", loading: true } }));
    try {
      await bookingsApi.sendEndOtp(bookingId);
      toast.success("End OTP sent to customer's email!");
      setOtpState((s) => ({ ...s, [bookingId]: { step: "enter_end", otp: "", loading: false } }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not send OTP.");
      setOtpState((s) => { const n = { ...s }; delete n[bookingId]; return n; });
    }
  }

  async function handleVerifyEndOtp(bookingId: string) {
    const otp = otpState[bookingId]?.otp;
    if (!otp || otp.length < 4) { toast.error("Enter the OTP the customer received."); return; }
    setOtpState((s) => ({ ...s, [bookingId]: { ...s[bookingId], loading: true } }));
    try {
      await bookingsApi.verifyEndOtp(bookingId, otp);
      toast.success("Session completed! Great work.");
      setOtpState((s) => { const n = { ...s }; delete n[bookingId]; return n; });
      fetchRequests(reqFilter || undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid OTP.");
      setOtpState((s) => ({ ...s, [bookingId]: { ...s[bookingId], loading: false } }));
    }
  }

  // ─── PROFILE SAVE ──────────────────────────────────────
  async function handleSaveProfile() {
    try {
      // P1.6 — Validate: chef must either tick 'Serve all of Ahmedabad' or pick at least 1 area
      if (!profileForm.serves_all_city && profileForm.service_area_slugs.length === 0) {
        toast.error("Pick at least one service area, or tick 'Serve all of Ahmedabad'.");
        return;
      }
      setProfileSaving(true);
      await api.patch("/cooks/me", {
        bio: profileForm.bio, city: profileForm.city, pincode: profileForm.pincode,
        is_veg_only: profileForm.is_veg_only, cuisines: profileForm.cuisines,
        service_roles: profileForm.service_roles,
        service_area_slugs: profileForm.service_area_slugs,
        serves_all_city: profileForm.serves_all_city,
        service_area_fees: profileForm.service_area_fees,
        ...(profileForm.latitude != null && profileForm.longitude != null
          ? { latitude: profileForm.latitude, longitude: profileForm.longitude }
          : {}),
      });
      toast.success("Profile updated!");
      fetchProfile();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Could not save profile."); }
    finally { setProfileSaving(false); }
  }

  // P1.6 — toggle a service area on/off (only when serves_all_city is OFF)
  function toggleArea(slug: string) {
    setProfileForm((f) => {
      const has = f.service_area_slugs.includes(slug);
      const nextSlugs = has
        ? f.service_area_slugs.filter((s) => s !== slug)
        : [...f.service_area_slugs, slug];
      // If un-selecting an area, also drop its fee override
      const nextFees = { ...f.service_area_fees };
      if (has) delete nextFees[slug];
      return { ...f, service_area_slugs: nextSlugs, service_area_fees: nextFees };
    });
  }

  // P1.6 — set per-area fee (₹49 or ₹79). Toggling cycles between the two.
  function toggleAreaFee(slug: string) {
    setProfileForm((f) => {
      const current = f.service_area_fees[slug] ?? 49;
      const next = current === 49 ? 79 : 49;
      return {
        ...f,
        service_area_fees: { ...f.service_area_fees, [slug]: next },
      };
    });
  }

  // P1.6 — submit "Other area" request from the chef profile
  async function submitAreaRequest() {
    const name = areaRequestName.trim();
    if (!name) { toast.error("Please type the area name."); return; }
    setAreaRequestSubmitting(true);
    try {
      const res: any = await api.post("/areas/request", { name, city: "Ahmedabad" });
      const body = res?.data?.data ?? res?.data ?? {};
      if (body.already_exists && body.area) {
        toast.success(`'${body.area.name}' is already on our list.`);
        // Auto-select it
        setProfileForm((f) =>
          f.service_area_slugs.includes(body.area.slug)
            ? f
            : { ...f, service_area_slugs: [...f.service_area_slugs, body.area.slug] },
        );
        // refresh master list
        const fresh: any = await api.get("/areas", { params: { city: "Ahmedabad" } });
        const list = (fresh?.data?.data ?? fresh?.data ?? []) as any[];
        setAreaList(list.map((a) => ({ slug: a.slug, name: a.name, region: a.region })));
      } else {
        toast.success(
          body.already_requested
            ? "You already requested this area. Pending admin review."
            : "Request sent. Admin will review within 24 hours.",
        );
      }
      setAreaRequestMode(false);
      setAreaRequestName("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not submit request.");
    } finally {
      setAreaRequestSubmitting(false);
    }
  }

  // ─── DETECT KITCHEN LOCATION ──────────────────────────
  // Uses browser geolocation; fills lat/lng so we can later compute distance
  // to customer addresses. Works on HTTPS only (production is HTTPS).
  function handleDetectLocation() {
    if (!navigator.geolocation) {
      toast.error("Location not supported on this device.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfileForm((f) => ({
          ...f,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        toast.success("Kitchen location captured. Click Save Profile to confirm.");
        setDetectingLocation(false);
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) toast.error("Location permission denied. Please allow it in your browser.");
        else if (err.code === 2) toast.error("Could not detect location. Try again or check GPS.");
        else toast.error("Location request timed out. Try again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function handleToggleAvailability() {
    try {
      setAvailToggling(true);
      await api.patch("/cooks/me/availability");
      setIsAvailable((v) => !v);
      toast.success(isAvailable ? "You're now offline." : "You're now available!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not toggle availability.");
    }
    finally { setAvailToggling(false); }
  }

  // ─── MENU CRUD ─────────────────────────────────────────
  function openAddMenu() {
    setEditingItem(null);
    setMenuForm({ name: "", price: "", type: "veg", category: "main_course", description: "", image: "" });
    setShowMenuForm(true);
  }
  function openEditMenu(item: any) {
    setEditingItem(item);
    setMenuForm({ name: item.name || "", price: String(item.price || ""), type: item.type || "veg", category: item.category || "main_course", description: item.description || "", image: item.image || "" });
    setShowMenuForm(true);
  }
  async function handleSaveMenuItem() {
    if (!menuForm.name.trim()) { toast.error("Dish name is required."); return; }
    if (!menuForm.price || Number(menuForm.price) < 1) { toast.error("Price must be at least ₹1."); return; }
    try {
      setMenuSaving(true);
      const payload: any = { name: menuForm.name.trim(), price: Number(menuForm.price), type: menuForm.type, category: menuForm.category, description: menuForm.description.trim() || undefined };
      if (menuForm.image) payload.image = menuForm.image;
      if (editingItem) { await api.patch(`/cooks/me/menu/${editingItem.id}`, payload); toast.success("Menu item updated!"); }
      else { await api.post("/cooks/me/menu", payload); toast.success("Menu item added!"); }
      setShowMenuForm(false);
      fetchMenu();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Could not save menu item."); }
    finally { setMenuSaving(false); }
  }
  async function handleDeleteMenuItem(itemId: string) {
    if (!confirm("Delete this menu item?")) return;
    try { await api.delete(`/cooks/me/menu/${itemId}`); toast.success("Menu item deleted."); fetchMenu(); }
    catch { toast.error("Could not delete item."); }
  }

  async function handleMenuImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setMenuImageUploading(true);
      const compressed = await compressImage(file, 600, 0.7);
      const { data } = await uploadsApi.uploadMenu(compressed);
      const url = data?.data?.url || data?.url;
      if (url) {
        setMenuForm((f) => ({ ...f, image: url }));
        toast.success("Dish photo uploaded!");
      }
    } catch { toast.error("Could not upload photo."); }
    finally { setMenuImageUploading(false); }
  }

  function toggleCuisine(c: string) {
    setProfileForm((f) => ({ ...f, cuisines: f.cuisines.includes(c) ? f.cuisines.filter((x) => x !== c) : [...f.cuisines, c] }));
  }

  // ─── VERIFICATION UPLOAD ───────────────────────────────
  async function handleVerDocUpload(field: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingField(field);
      const compressed = await compressImage(file, 1200, 0.8);
      const { data } = await uploadsApi.uploadDocument(compressed);
      const url = data?.data?.url || data?.url;
      if (url) {
        setVerForm((f) => ({ ...f, [field]: url }));
        toast.success("Document uploaded!");
      }
    } catch { toast.error("Upload failed. Try again."); }
    finally { setUploadingField(null); }
  }

  async function handleSubmitVerification() {
    if (!verForm.aadhaar_url || verForm.aadhaar_url === "(uploaded)") {
      // If already uploaded from backend, we just need fresh URLs for new submissions
      if (verForm.aadhaar_url !== "(uploaded)") { toast.error("Please upload your Aadhaar card."); return; }
    }
    if (!verForm.pan_url || verForm.pan_url === "(uploaded)") {
      if (verForm.pan_url !== "(uploaded)") { toast.error("Please upload your PAN card."); return; }
    }
    if (!verForm.emergency_contact_name.trim()) { toast.error("Emergency contact name is required."); return; }
    if (!verForm.emergency_contact_phone.trim()) { toast.error("Emergency contact phone is required."); return; }
    if (!verForm.terms_accepted) { toast.error("Please accept the Terms of Service."); return; }

    try {
      setVerSubmitting(true);
      const payload: any = {
        emergency_contact_name: verForm.emergency_contact_name.trim(),
        emergency_contact_phone: verForm.emergency_contact_phone.trim(),
        terms_accepted: true,
      };
      // Only send URLs that are actual URLs (not "(uploaded)" placeholder)
      if (verForm.aadhaar_url && verForm.aadhaar_url !== "(uploaded)") payload.aadhaar_url = verForm.aadhaar_url;
      if (verForm.pan_url && verForm.pan_url !== "(uploaded)") payload.pan_url = verForm.pan_url;
      if (verForm.address_proof_url && verForm.address_proof_url !== "(uploaded)") payload.address_proof_url = verForm.address_proof_url;
      if (verForm.fssai_url && verForm.fssai_url !== "(uploaded)") payload.fssai_url = verForm.fssai_url;

      await cooksApi.submitVerification(payload);
      toast.success("Verification submitted! Our team will review it soon.");
      fetchVerification();
    } catch (err: any) { toast.error(err?.response?.data?.message || "Could not submit verification."); }
    finally { setVerSubmitting(false); }
  }

  // ─── SIDEBAR ───────────────────────────────────────────
  const sections: SidebarSection[] = [
    { title: "Dashboard", links: [
      { id: "overview", label: "Overview", icon: <Home className="w-5 h-5" /> },
      { id: "requests", label: "Booking Requests", icon: <Calendar className="w-5 h-5" />, badge: stats.pending },
      { id: "earnings", label: "My Earnings", icon: <DollarSign className="w-5 h-5" /> },
      { id: "reviews", label: "My Reviews", icon: <Star className="w-5 h-5" /> },
    ]},
    { title: "Manage", links: [
      { id: "menu", label: "My Menu", icon: <FileText className="w-5 h-5" /> },
      { id: "packages", label: "Meal Packages", icon: <Package className="w-5 h-5" /> },
      { id: "availability", label: "Availability", icon: <CalendarClock className="w-5 h-5" /> },
      { id: "profile", label: "My Profile", icon: <User className="w-5 h-5" /> },
      { id: "verification", label: "Verification", icon: <ShieldCheck className="w-5 h-5" />,
        badge: verStatus === "pending" ? undefined : verStatus === "not_submitted" || verStatus === "rejected" ? 1 : undefined },
    ]},
  ];

  const headerRight = (
    <div className="flex items-center gap-2.5">
      {verStatus === "approved" && (
        <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[0.72rem] font-semibold border border-emerald-200">
          <BadgeCheck className="w-3 h-3" /> Verified
        </span>
      )}
      <span className={cn("text-[0.82rem] font-medium", isAvailable ? "text-[var(--green-ok)]" : "text-gray-400")}>
        {isAvailable ? "Available" : "Offline"}
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={isAvailable} onChange={handleToggleAvailability} disabled={availToggling} className="sr-only peer" />
        <div className="w-11 h-6 bg-[var(--cream-300)] peer-checked:bg-[var(--green-ok)] rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
      </label>
    </div>
  );

  if (isLoading || !authorized) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream-100)]">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[0.9rem] text-[var(--text-muted)]">Loading your dashboard...</p>
      </div>
    </div>
  );

  // ─── BOOKING CARD ──────────────────────────────────────
  function renderBookingCard(b: any, showActions: boolean) {
    const customer = b.user;
    const customerName = customer ? `${customer.name || ""} ${customer.lastName || customer.last_name || ""}`.trim() : "Customer";
    const status = b.status || "pending";
    const otpS = otpState[b.id];

    return (
      <div key={b.id} className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)] transition-all hover:shadow-[0_4px_16px_rgba(26,15,10,0.05)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-bold text-[0.95rem]">{customerName}</div>
            <div className="text-[0.78rem] text-[var(--text-muted)]">{customer?.email || ""}</div>
          </div>
          <span className={cn("px-3 py-1 rounded-full text-[0.72rem] font-semibold border", statusStyles[status] || "bg-gray-50 text-gray-500")}>{statusLabels[status] || status}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-[0.82rem] text-[var(--text-muted)]"><Calendar className="w-3.5 h-3.5 shrink-0" /><span>{b.scheduled_at ? formatDate(b.scheduled_at) : "—"}</span></div>
          <div className="flex items-center gap-1.5 text-[0.82rem] text-[var(--text-muted)]"><Clock className="w-3.5 h-3.5 shrink-0" /><span>{b.scheduled_at ? formatTime(b.scheduled_at) : "—"} · {b.duration_hours || 2}h</span></div>
          <div className="flex items-center gap-1.5 text-[0.82rem] text-[var(--text-muted)]"><Users className="w-3.5 h-3.5 shrink-0" /><span>{b.guests || 2} guests</span></div>
          <div className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-[var(--green-ok)]"><IndianRupee className="w-3.5 h-3.5 shrink-0" /><span>{Math.round((Number(b.total_price) || 0) * 0.85)} <span className="font-normal text-[var(--text-muted)]">(your share)</span></span></div>
        </div>
        {b.address && <div className="flex items-start gap-1.5 text-[0.82rem] text-[var(--text-muted)] mb-3"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span className="line-clamp-1">{b.address}</span></div>}
        {b.dishes && <div className="text-[0.82rem] text-[var(--text-muted)] mb-3 bg-[var(--cream-100)] rounded-[8px] px-3 py-2"><span className="font-semibold text-[var(--brown-800)]">Dishes requested:</span> {b.dishes}</div>}
        {b.instructions && <div className="text-[0.82rem] text-[var(--text-muted)] mb-3 italic">Note: {b.instructions}</div>}

        {/* Duration tracking for completed bookings */}
        {status === "completed" && b.actual_duration_minutes && (
          <div className="text-[0.82rem] text-emerald-600 mb-3 bg-emerald-50 rounded-[8px] px-3 py-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Session duration: {Math.floor(b.actual_duration_minutes / 60)}h {b.actual_duration_minutes % 60}m
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 pt-3 border-t border-[rgba(212,114,26,0.06)] flex-wrap">
            {/* Apr 21 NEW FLOW — Accept / Reject
                Accept → POST /bookings/:id/accept  (→ AWAITING_PAYMENT, customer gets 3hr)
                Reject → opens modal with reason textarea → POST /bookings/:id/reject */}
            {(status === "pending_chef_approval" || status === "pending") && (<>
              <button onClick={() => handleAccept(b.id)} disabled={actionId === b.id} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-white bg-[var(--green-ok)] border-none cursor-pointer hover:opacity-90 disabled:opacity-50" style={{ fontFamily: "var(--font-body)" }}><CheckCircle2 className="w-4 h-4" />{actionId === b.id ? "..." : "Accept"}</button>
              <button onClick={() => openRejectModal(b.id, customerName)} disabled={actionId === b.id} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-red-500 bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 disabled:opacity-50" style={{ fontFamily: "var(--font-body)" }}><XCircle className="w-4 h-4" />Reject</button>
            </>)}

            {/* CONFIRMED: Start Cooking OTP */}
            {status === "confirmed" && !otpS && (
              <button onClick={() => handleSendStartOtp(b.id)} disabled={actionId === b.id}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-white bg-blue-500 border-none cursor-pointer hover:bg-blue-600 disabled:opacity-50" style={{ fontFamily: "var(--font-body)" }}>
                <KeyRound className="w-4 h-4" /> Start Cooking (Send OTP)
              </button>
            )}
            {status === "confirmed" && otpS?.step === "enter_start" && (
              <div className="flex items-center gap-2 w-full">
                <input type="text" maxLength={6} placeholder="Enter customer's OTP"
                  value={otpS.otp} onChange={(e) => setOtpState((s) => ({ ...s, [b.id]: { ...s[b.id], otp: e.target.value } }))}
                  className="flex-1 px-4 py-2.5 rounded-[12px] border border-blue-200 text-[0.88rem] outline-none focus:border-blue-500 max-w-[200px]"
                  style={{ fontFamily: "var(--font-body)" }} />
                <button onClick={() => handleVerifyStartOtp(b.id)} disabled={otpS.loading}
                  className="px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-white bg-blue-500 border-none cursor-pointer hover:bg-blue-600 disabled:opacity-50" style={{ fontFamily: "var(--font-body)" }}>
                  {otpS.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Start"}
                </button>
              </div>
            )}

            {/* IN PROGRESS: End Session OTP */}
            {status === "in_progress" && !otpS && (
              <button onClick={() => handleSendEndOtp(b.id)} disabled={actionId === b.id}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-white bg-emerald-500 border-none cursor-pointer hover:bg-emerald-600 disabled:opacity-50" style={{ fontFamily: "var(--font-body)" }}>
                <KeyRound className="w-4 h-4" /> End Session (Send OTP)
              </button>
            )}
            {status === "in_progress" && otpS?.step === "enter_end" && (
              <div className="flex items-center gap-2 w-full">
                <input type="text" maxLength={6} placeholder="Enter customer's OTP"
                  value={otpS.otp} onChange={(e) => setOtpState((s) => ({ ...s, [b.id]: { ...s[b.id], otp: e.target.value } }))}
                  className="flex-1 px-4 py-2.5 rounded-[12px] border border-emerald-200 text-[0.88rem] outline-none focus:border-emerald-500 max-w-[200px]"
                  style={{ fontFamily: "var(--font-body)" }} />
                <button onClick={() => handleVerifyEndOtp(b.id)} disabled={otpS.loading}
                  className="px-5 py-2.5 rounded-full text-[0.82rem] font-semibold text-white bg-emerald-500 border-none cursor-pointer hover:bg-emerald-600 disabled:opacity-50" style={{ fontFamily: "var(--font-body)" }}>
                  {otpS.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Complete"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Apr 21 new flow: new-request status is pending_chef_approval.
  // Legacy `pending` kept for any old rows still in the DB.
  const pendingRequests = requests.filter(
    (b) => b.status === "pending_chef_approval" || b.status === "pending",
  );
  const inputClass = "w-full px-4 py-3 rounded-[12px] border border-[var(--cream-300)] bg-white text-[0.9rem] outline-none focus:border-[var(--orange-500)] focus:ring-1 focus:ring-[var(--orange-500)] transition-all";
  const labelClass = "block text-[0.82rem] font-semibold text-[var(--brown-800)] mb-1.5";
  const btnPrimary = "px-6 py-3 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] border-none cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2";

  return (
    <DashboardLayout sections={sections} roleLabel="Chef Partner" titles={titles} headerRight={headerRight}>

      {/* ═══ UNDER REVIEW BANNER ═══
          Bug 7 fix — gated on verChecked so the banner does NOT flash the default
          "Complete Verification" state for already-verified chefs while the status
          is being fetched. Only renders once the real status has been loaded at least once. */}
      {verChecked && verStatus !== "approved" && activePanel !== "verification" && (
        <div className={cn(
          "rounded-[16px] p-5 mb-6 border flex items-start gap-3",
          verStatus === "rejected" ? "bg-red-50 border-red-200" :
          verStatus === "pending" ? "bg-yellow-50 border-yellow-200" :
          "bg-blue-50 border-blue-200"
        )}>
          {verStatus === "rejected" ? <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> :
           verStatus === "pending" ? <Loader2 className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5 animate-spin" /> :
           <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <div className="font-semibold text-[0.9rem]">
              {verStatus === "rejected" ? "Verification Rejected" :
               verStatus === "pending" ? "Under Review" :
               "Complete Verification"}
            </div>
            <p className="text-[0.82rem] text-[var(--text-muted)] mt-0.5">
              {verStatus === "rejected"
                ? `Reason: ${verRejection || "Please re-submit with correct documents."}`
                : verStatus === "pending"
                ? "Your documents are being reviewed by our team. You cannot receive bookings until verified."
                : "You need to submit your verification documents before you can go online and receive bookings."}
            </p>
            <button onClick={() => setPanel("verification")}
              className="mt-2 px-4 py-2 rounded-full text-[0.82rem] font-semibold text-white bg-[var(--orange-500)] border-none cursor-pointer hover:bg-[var(--orange-400)]"
              style={{ fontFamily: "var(--font-body)" }}>
              {verStatus === "rejected" ? "Re-submit Documents" : verStatus === "pending" ? "View Status" : "Start Verification"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ OVERVIEW ═══ */}
      {activePanel === "overview" && (
        <div>
          <div className="bg-white rounded-[20px] p-7 md:p-9 mb-6 border border-[rgba(212,114,26,0.06)]">
            <div className="text-[0.85rem] text-[var(--text-muted)]">{greeting}</div>
            <div className="font-display text-[1.6rem] font-[900] text-[var(--brown-800)] mt-1">
              Chef <span className="text-[var(--orange-500)]">{user?.name || "—"}</span>, ready to cook?
            </div>
            <p className="text-[0.9rem] text-[var(--text-muted)] mt-2">You have <strong>{stats.pending}</strong> pending booking request{stats.pending !== 1 ? "s" : ""}.</p>
            <div className="flex gap-3 mt-6 flex-wrap">
              <button onClick={() => setPanel("requests")} className={btnPrimary} style={{ fontFamily: "var(--font-body)" }}>View Requests</button>
              <button onClick={() => setPanel("earnings")} className="px-6 py-3 rounded-full bg-white border-[1.5px] border-[var(--brown-800)] text-[var(--brown-800)] font-semibold text-[0.9rem] cursor-pointer transition-all hover:bg-[var(--brown-800)] hover:text-white" style={{ fontFamily: "var(--font-body)" }}>My Earnings</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Pending Requests", value: stats.pending },
              { label: "Jobs Done", value: stats.completed },
              { label: "Total Earned", value: formatCurrency(stats.totalEarned) },
              { label: "Rating", value: stats.rating > 0 ? stats.rating.toFixed(1) : "New" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)] text-center">
                <div className="font-display text-[1.4rem] font-[800]">{s.value}</div>
                <div className="text-[0.78rem] text-[var(--text-muted)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Recent Requests</h3>
            <button onClick={() => setPanel("requests")} className="text-[0.85rem] text-[var(--orange-500)] font-semibold bg-transparent border-none cursor-pointer" style={{ fontFamily: "var(--font-body)" }}>View All</button>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-[16px] p-8 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)]">No pending requests. Customers will find you soon!</div>
          ) : (
            <div className="space-y-4">{pendingRequests.slice(0, 3).map((b) => renderBookingCard(b, true))}</div>
          )}
        </div>
      )}

      {/* ═══ REQUESTS ═══ */}
      {activePanel === "requests" && (
        <div>
          <h2 className="font-bold text-[1.05rem] mb-1">Booking Requests</h2>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-5">Accept or decline customer bookings. You receive 97.5% of all dish revenue you cook.</p>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {requestFilters.map((f) => (
              <button key={f.value} onClick={() => setReqFilter(f.value)} className={cn("px-4 py-2 rounded-full text-[0.82rem] font-semibold border-none cursor-pointer transition-all shrink-0", reqFilter === f.value ? "bg-[var(--orange-500)] text-white" : "bg-white text-[var(--text-muted)] border border-[rgba(212,114,26,0.1)] hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]")} style={{ fontFamily: "var(--font-body)" }}>{f.label}</button>
            ))}
          </div>
          {reqLoading && <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)] animate-pulse"><div className="h-5 bg-gray-100 rounded w-1/3 mb-3" /><div className="h-4 bg-gray-100 rounded w-2/3 mb-2" /><div className="h-4 bg-gray-100 rounded w-1/2" /></div>)}</div>}
          {reqError && <div className="bg-white rounded-[16px] p-12 border border-red-100 text-center"><AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" /><p className="text-[0.9rem] text-red-400">{reqError}</p><button onClick={() => fetchRequests(reqFilter || undefined)} className="mt-3 px-5 py-2 rounded-full bg-[var(--orange-500)] text-white text-[0.82rem] font-semibold border-none cursor-pointer" style={{ fontFamily: "var(--font-body)" }}>Retry</button></div>}
          {!reqLoading && !reqError && requests.length === 0 && <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)]"><ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-[0.9rem]">{reqFilter ? "No bookings with this status." : "No booking requests yet."}</p></div>}
          {!reqLoading && !reqError && requests.length > 0 && <div className="space-y-4">{requests.map((b) => renderBookingCard(b, true))}</div>}
        </div>
      )}

      {/* ═══ EARNINGS ═══ */}
      {activePanel === "earnings" && (
        <div>
          <h2 className="font-bold text-[1.05rem] mb-1">My Earnings</h2>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-5">You receive 97.5% of all dish revenue. Platform keeps the ₹49 visit fee and a 2.5% convenience fee.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Earned", value: formatCurrency(stats.totalEarned), color: "text-[var(--green-ok)]" },
              { label: "Completed Jobs", value: stats.completed.toString(), color: "text-blue-500" },
              {
                label: "Avg per Booking",
                value: stats.completed > 0 ? formatCurrency(Math.round(stats.totalEarned / stats.completed)) : "—",
                color: "text-[var(--orange-500)]",
              },
            ].map((e) => (
              <div key={e.label} className="bg-white rounded-[16px] p-6 border border-[rgba(212,114,26,0.06)] text-center">
                <div className={cn("font-display text-[1.6rem] font-[800]", e.color)}>{e.value}</div>
                <div className="text-[0.82rem] text-[var(--text-muted)] mt-1">{e.label}</div>
              </div>
            ))}
          </div>
          <h3 className="font-bold mb-4">Completed Jobs</h3>
          {requests.filter((b) => b.status === "completed").length === 0 ? (
            <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)]">No completed jobs yet. Accept a booking to get started!</div>
          ) : (
            <div className="space-y-4">{requests.filter((b) => b.status === "completed").map((b) => renderBookingCard(b, false))}</div>
          )}
        </div>
      )}

      {/* ═══ MENU ═══ */}
      {activePanel === "menu" && (
        <div>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-[1.05rem]">My Menu</h2>
              <p className="text-[0.88rem] text-[var(--text-muted)] mt-1">Add your signature dishes — customers see these when booking you.</p>
            </div>
            <button onClick={openAddMenu} className={btnPrimary} style={{ fontFamily: "var(--font-body)" }}><Plus className="w-4 h-4" /> Add Item</button>
          </div>

          {showMenuForm && (
            <div className="bg-white rounded-[16px] p-6 border-2 border-[var(--orange-500)] mb-6 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[0.95rem]">{editingItem ? "Edit Menu Item" : "Add New Dish"}</h3>
                <button onClick={() => setShowMenuForm(false)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer border-none bg-transparent"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Dish Name *</label><input type="text" value={menuForm.name} onChange={(e) => setMenuForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Paneer Butter Masala" className={inputClass} /></div>
                <div><label className={labelClass}>Price (₹) *</label><input type="number" min="1" value={menuForm.price} onChange={(e) => setMenuForm((f) => ({ ...f, price: e.target.value }))} placeholder="e.g. 250" className={inputClass} /></div>
                <div>
                  <label className={labelClass}>Type</label>
                  <div className="flex gap-3">
                    {[{ v: "veg", l: "🟢 Veg" }, { v: "non_veg", l: "🔴 Non-Veg" }].map((t) => (
                      <button key={t.v} onClick={() => setMenuForm((f) => ({ ...f, type: t.v }))} className={cn("flex-1 py-3 rounded-[12px] border-[1.5px] text-[0.88rem] font-semibold cursor-pointer transition-all", menuForm.type === t.v ? "border-[var(--orange-500)] bg-[rgba(212,114,26,0.04)] text-[var(--orange-500)]" : "border-[var(--cream-300)] bg-white text-[var(--text-muted)] hover:border-[var(--orange-500)]")} style={{ fontFamily: "var(--font-body)" }}>{t.l}</button>
                    ))}
                  </div>
                </div>
                <div><label className={labelClass}>Category</label><select value={menuForm.category} onChange={(e) => setMenuForm((f) => ({ ...f, category: e.target.value }))} className={inputClass}>{DISH_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <div className="sm:col-span-2"><label className={labelClass}>Description (optional)</label><textarea value={menuForm.description} onChange={(e) => setMenuForm((f) => ({ ...f, description: e.target.value }))} placeholder="A brief description..." rows={2} className={cn(inputClass, "resize-none")} /></div>

                {/* Dish photo upload */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Dish Photo (optional)</label>
                  <div className="flex items-center gap-3">
                    {menuForm.image && (
                      <img src={menuForm.image} alt="Dish" className="w-16 h-16 rounded-[10px] object-cover border border-[var(--cream-300)]" />
                    )}
                    <button onClick={() => menuImageRef.current?.click()} disabled={menuImageUploading}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] border border-dashed border-[var(--cream-300)] text-[0.82rem] font-semibold text-[var(--text-muted)] bg-white cursor-pointer hover:border-[var(--orange-500)] hover:text-[var(--orange-500)] disabled:opacity-50"
                      style={{ fontFamily: "var(--font-body)" }}>
                      {menuImageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {menuImageUploading ? "Uploading..." : menuForm.image ? "Change Photo" : "Upload Photo"}
                    </button>
                    <input ref={menuImageRef} type="file" accept="image/*" className="hidden" onChange={handleMenuImageUpload} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleSaveMenuItem} disabled={menuSaving} className={btnPrimary} style={{ fontFamily: "var(--font-body)" }}>{menuSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{menuSaving ? "Saving..." : editingItem ? "Update" : "Add Dish"}</button>
                <button onClick={() => setShowMenuForm(false)} className="px-6 py-3 rounded-full bg-gray-100 text-gray-600 font-semibold text-[0.9rem] border-none cursor-pointer hover:bg-gray-200" style={{ fontFamily: "var(--font-body)" }}>Cancel</button>
              </div>
            </div>
          )}

          {menuLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">{[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)] animate-pulse"><div className="h-5 bg-gray-100 rounded w-2/3 mb-3" /><div className="h-4 bg-gray-100 rounded w-1/3" /></div>)}</div>
          ) : menuItems.length === 0 && !showMenuForm ? (
            <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)] mt-5"><FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-[0.9rem]">No menu items yet. Add your signature dishes!</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              {menuItems.map((item: any) => (
                <div key={item.id} className="bg-white rounded-[16px] overflow-hidden border border-[rgba(212,114,26,0.06)] transition-all hover:shadow-[0_4px_16px_rgba(26,15,10,0.05)] flex flex-col">
                  {/* Batch B2: aspect-ratio locked, onError fallback, clean placeholder when no image. */}
                  <div className="w-full aspect-[16/9] bg-gradient-to-br from-[var(--cream-100)] to-[rgba(212,114,26,0.08)] flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = "none";
                          const sib = img.nextElementSibling as HTMLElement | null;
                          if (sib) sib.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full items-center justify-center text-[var(--orange-500)] opacity-40"
                      style={{ display: item.image ? "none" : "flex" }}
                    >
                      <Utensils className="w-10 h-10" />
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", item.type === "veg" ? "bg-green-500" : "bg-red-500")} />
                          <span className="font-bold text-[0.95rem] capitalize">{item.name}</span>
                        </div>
                        <div className="text-[0.78rem] text-[var(--text-muted)] mt-1 capitalize">{(item.category || "main_course").replace(/_/g, " ")}</div>
                        {item.description && <p className="text-[0.82rem] text-[var(--text-muted)] mt-2 line-clamp-2">{item.description}</p>}
                      </div>
                      <div className="text-right ml-4"><div className="font-display text-[1.1rem] font-[800] text-[var(--orange-500)]">{formatCurrency(Number(item.price))}</div></div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-[rgba(212,114,26,0.06)]">
                      <button onClick={() => openEditMenu(item)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.78rem] font-semibold text-[var(--orange-500)] bg-[rgba(212,114,26,0.06)] border-none cursor-pointer hover:bg-[rgba(212,114,26,0.12)]" style={{ fontFamily: "var(--font-body)" }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                      <button onClick={() => handleDeleteMenuItem(item.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.78rem] font-semibold text-red-400 bg-red-50 border-none cursor-pointer hover:bg-red-100" style={{ fontFamily: "var(--font-body)" }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activePanel === "packages" && (
       <div className="p-5 sm:p-6">
          <MealPackagesPanel />
        </div>
      )}


      {/* ═══ PROFILE ═══ */}
      {activePanel === "profile" && (
        <div>
          <h2 className="font-bold text-[1.05rem] mb-1">My Profile</h2>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-6">Update your bio, cuisines, and rate. Customers see this when booking.</p>
          {profileLoading ? (
            <div className="bg-white rounded-[16px] p-8 border border-[rgba(212,114,26,0.06)] animate-pulse"><div className="h-5 bg-gray-100 rounded w-1/3 mb-4" /><div className="h-12 bg-gray-100 rounded mb-4" /><div className="h-5 bg-gray-100 rounded w-1/4 mb-4" /><div className="h-12 bg-gray-100 rounded" /></div>
          ) : (
            <div className="bg-white rounded-[16px] p-6 md:p-8 border border-[rgba(212,114,26,0.06)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2"><label className={labelClass}>Bio</label><textarea value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Tell customers about your cooking style and experience..." rows={3} className={cn(inputClass, "resize-none")} /></div>
                <div><label className={labelClass}>City</label><input type="text" value={profileForm.city} onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Ahmedabad" className={inputClass} /></div>
                <div><label className={labelClass}>Pincode</label><input type="text" value={profileForm.pincode} onChange={(e) => setProfileForm((f) => ({ ...f, pincode: e.target.value }))} placeholder="e.g. 380015" maxLength={6} className={inputClass} /></div>
                {/* Service role — what the chef actually does on-site.
                    Helps customers filter chefs for their need (home cooking vs tiffin vs events). */}
                <div className="sm:col-span-2">
                  {/* Service Type — multi-select */}
                  <div>
                    <label className={labelClass}>Service Type</label>
                     <div className="flex flex-wrap gap-2">
                      {[
                        { value: "home_cook", label: "Home Chef" },
                        { value: "delivery", label: "Delivery" },
                        { value: "both", label: "Both" },
                      ].map((opt) => {
                        const selected = profileForm.service_roles.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              if (opt.value === "both") {
                                setProfileForm((f) => ({
                                   ...f,
                                   service_roles: f.service_roles.includes("home_cook") && f.service_roles.includes("delivery")
                                   ? ["home_cook"]
                                   : ["home_cook", "delivery"],
                                }));
                              } else {
                                setProfileForm((f) => ({
                                  ...f,
                                  service_roles: f.service_roles.includes(opt.value)
                                  ? f.service_roles.filter((r) => r !== opt.value)
                                 : [...f.service_roles.filter((r) => r !== "both"), opt.value],
                                }));
                              }
                            }}
                            className={`px-4 py-2 rounded-full text-[0.82rem] font-semibold border transition-all cursor-pointer ${
                            selected || (opt.value === "both" && profileForm.service_roles.includes("home_cook") && profileForm.service_roles.includes("delivery"))
                            ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                            : "bg-white text-[var(--brown-800)] border-[var(--cream-300)] hover:border-[var(--orange-500)]"
                            }`} style={{ fontFamily: "var(--font-body)" }}
                            >
                            {opt.label}
                          </button>
                        );
                      })}
                  </div>
                  <p className="text-[0.72rem] text-[var(--text-muted)] mt-1.5">Customers will see this on your chef card and filter by it.</p>
                 </div>
              </div>
                {/* Batch B2: "Rate per Session" input removed. Chefs earn per-dish; flat ₹49 visit fee is platform revenue. */}

                {/* ─── KITCHEN LOCATION ─────────────────────────────── */}
                {/* Captures the chef's home/kitchen coordinates. Used to show
                    customers how far you are and (soon) for distance-based
                    visit fees and service-area filtering. */}
                <div className="sm:col-span-2 mt-2 p-4 rounded-[14px] border border-[var(--cream-300)] bg-[var(--cream-50,#FAF5EE)]">
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[var(--orange-500)] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[0.92rem] text-[var(--brown-800)]">Kitchen location</div>
                      <p className="text-[0.78rem] text-[var(--text-muted)] mt-0.5">
                        Customers see this as your starting point. We never share your exact address — only an approximate area on chef cards.
                      </p>
                    </div>
                  </div>
                  {profileForm.latitude != null && profileForm.longitude != null ? (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-[0.82rem] text-[var(--brown-800)]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Location set
                        </span>
                        <span className="ml-2 text-[var(--text-muted)] font-mono text-[0.74rem]">
                          {profileForm.latitude.toFixed(4)}, {profileForm.longitude.toFixed(4)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={detectingLocation}
                        className="text-[0.82rem] font-semibold text-[var(--orange-500)] hover:underline disabled:opacity-50 cursor-pointer"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {detectingLocation ? "Detecting…" : "Update location"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[0.85rem] font-semibold border border-[var(--orange-500)] text-[var(--orange-500)] hover:bg-[var(--orange-500)] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {detectingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                      {detectingLocation ? "Detecting…" : "Detect my kitchen location"}
                    </button>
                  )}
                </div>

                {/* ─── SERVICE AREAS (P1.6) ────────────────────────── */}
                <div className="sm:col-span-2 mt-2 p-4 rounded-[14px] border border-[var(--cream-300)] bg-white">
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[var(--orange-500)] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-[0.92rem] text-[var(--brown-800)]">
                        Areas you serve
                      </div>
                      <p className="text-[0.78rem] text-[var(--text-muted)] mt-0.5">
                        Customers in these areas will see your profile. Set ₹49 (close) or ₹79 (further) per area.
                      </p>
                    </div>
                  </div>

                  {/* Serve all of Ahmedabad toggle */}
                  <label className="flex items-center gap-3 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileForm.serves_all_city}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          serves_all_city: e.target.checked,
                          // When on, we keep slugs in state but they're ignored on save
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--cream-300)] peer-checked:bg-[var(--orange-500)] rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    <div className="text-[0.85rem]">
                      <span className="font-semibold text-[var(--brown-800)]">Serve all of Ahmedabad</span>
                      <div className="text-[0.72rem] text-[var(--text-muted)]">
                        Visible to every customer. Default fee ₹49 unless you set per-area below.
                      </div>
                    </div>
                  </label>

                  {/* Area chips — disabled UI when serves_all_city is on */}
                  <div className={cn("transition-opacity", profileForm.serves_all_city ? "opacity-50 pointer-events-none" : "")}>
                    {areasLoading && areaList.length === 0 ? (
                      <div className="text-[0.78rem] text-[var(--text-muted)] py-2">Loading areas…</div>
                    ) : areaList.length === 0 ? (
                      <div className="text-[0.78rem] text-[var(--text-muted)] py-2">No areas available right now.</div>
                    ) : (
                      <>
                        {/* Group by region */}
                        {["west", "central", "north", "east", "south"].map((region) => {
                          const inRegion = areaList.filter((a) => a.region === region);
                          if (inRegion.length === 0) return null;
                          return (
                            <div key={region} className="mb-3">
                              <div className="text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                                {region}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {inRegion.map((a) => {
                                  const selected = profileForm.service_area_slugs.includes(a.slug);
                                  const fee = profileForm.service_area_fees[a.slug] ?? 49;
                                  return (
                                    <div key={a.slug} className="inline-flex items-center">
                                      <button
                                        type="button"
                                        onClick={() => toggleArea(a.slug)}
                                        className={cn(
                                          "px-3 py-1.5 text-[0.78rem] font-semibold border-[1.5px] rounded-l-full transition-all cursor-pointer",
                                          selected
                                            ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]"
                                            : "bg-white text-[var(--brown-800)] border-[var(--cream-300)] hover:border-[var(--orange-500)]"
                                        )}
                                        style={{ fontFamily: "var(--font-body)" }}
                                      >
                                        {a.name}
                                      </button>
                                      {selected && (
                                        <button
                                          type="button"
                                          onClick={() => toggleAreaFee(a.slug)}
                                          title="Click to switch ₹49 ↔ ₹79"
                                          className={cn(
                                            "px-2.5 py-1.5 text-[0.74rem] font-bold border-[1.5px] border-l-0 rounded-r-full cursor-pointer transition-all",
                                            fee === 79
                                              ? "bg-amber-100 text-amber-800 border-amber-300"
                                              : "bg-emerald-50 text-emerald-700 border-emerald-300"
                                          )}
                                          style={{ fontFamily: "var(--font-body)" }}
                                        >
                                          ₹{fee}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Other (request) */}
                        <div className="mt-3 pt-3 border-t border-[var(--cream-300)]">
                          {!areaRequestMode ? (
                            <button
                              type="button"
                              onClick={() => { setAreaRequestMode(true); setAreaRequestName(""); }}
                              className="text-[0.78rem] font-semibold text-[var(--orange-500)] hover:underline cursor-pointer bg-transparent border-none p-0"
                              style={{ fontFamily: "var(--font-body)" }}
                            >
                              + My area isn't listed (request to add)
                            </button>
                          ) : (
                            <div className="space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-[12px]">
                              <p className="text-[0.74rem] text-[var(--text-muted)]">
                                Type your area name. Admin will review and add it within 24 hours.
                              </p>
                              <input
                                type="text"
                                value={areaRequestName}
                                onChange={(e) => setAreaRequestName(e.target.value)}
                                placeholder="e.g. Memnagar"
                                maxLength={100}
                                className={inputClass}
                              />
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={submitAreaRequest}
                                  disabled={areaRequestSubmitting}
                                  className="px-3.5 py-2 rounded-full text-[0.78rem] font-semibold bg-[var(--orange-500)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer border-none"
                                  style={{ fontFamily: "var(--font-body)" }}
                                >
                                  {areaRequestSubmitting ? "Submitting…" : "Send request"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setAreaRequestMode(false); setAreaRequestName(""); }}
                                  disabled={areaRequestSubmitting}
                                  className="px-3.5 py-2 rounded-full text-[0.78rem] font-semibold bg-white border-[1.5px] border-[var(--cream-300)] text-[var(--brown-800)] hover:border-[var(--orange-500)] cursor-pointer"
                                  style={{ fontFamily: "var(--font-body)" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {!profileForm.serves_all_city && profileForm.service_area_slugs.length === 0 && (
                    <div className="mt-2 text-[0.74rem] text-amber-700">
                      ⚠️ Pick at least one area, or tick "Serve all of Ahmedabad". Without this, customers can't see your profile.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4 sm:col-span-2">
                  <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={profileForm.is_veg_only} onChange={(e) => setProfileForm((f) => ({ ...f, is_veg_only: e.target.checked }))} className="sr-only peer" /><div className="w-11 h-6 bg-[var(--cream-300)] peer-checked:bg-[var(--green-ok)] rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" /></label>
                  <div><span className="text-[0.88rem] font-semibold text-[var(--brown-800)] flex items-center gap-1.5"><Leaf className="w-4 h-4 text-green-500" /> Pure Vegetarian</span><p className="text-[0.75rem] text-[var(--text-muted)]">Only cook vegetarian dishes</p></div>
                </div>
              </div>
              <div className="mt-6"><label className={labelClass}>Cuisines You Cook</label><div className="flex flex-wrap gap-2 mt-2">{CUISINE_OPTIONS.map((c) => <button key={c} onClick={() => toggleCuisine(c)} className={cn("px-4 py-2 rounded-full text-[0.82rem] font-semibold border cursor-pointer transition-all", profileForm.cuisines.includes(c) ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]" : "bg-white text-[var(--text-muted)] border-[var(--cream-300)] hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]")} style={{ fontFamily: "var(--font-body)" }}>{c}</button>)}</div></div>
              <div className="mt-8 pt-5 border-t border-[rgba(212,114,26,0.06)]"><button onClick={handleSaveProfile} disabled={profileSaving} className={btnPrimary} style={{ fontFamily: "var(--font-body)" }}>{profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{profileSaving ? "Saving..." : "Save Profile"}</button></div>
            </div>
          )}
        </div>
      )}

      {/* ═══ VERIFICATION ═══ */}
      {activePanel === "verification" && (
        <div>
          <h2 className="font-bold text-[1.05rem] mb-1">Verification</h2>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-6">
            Submit your identity documents to get verified. Verified chefs can go online and receive bookings.
          </p>

          {/* Status banner */}
          {verStatus === "approved" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-[16px] p-5 mb-6 flex items-center gap-3">
              <BadgeCheck className="w-6 h-6 text-emerald-500" />
              <div>
                <div className="font-semibold text-emerald-700">Verified</div>
                <p className="text-[0.82rem] text-emerald-600">Your profile is verified. You can receive bookings.</p>
              </div>
            </div>
          )}
          {verStatus === "pending" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-[16px] p-5 mb-6 flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
              <div>
                <div className="font-semibold text-yellow-700">Under Review</div>
                <p className="text-[0.82rem] text-yellow-600">Your documents are being reviewed. We&apos;ll notify you once approved.</p>
              </div>
            </div>
          )}
          {verStatus === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-[16px] p-5 mb-6 flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <div>
                <div className="font-semibold text-red-700">Rejected</div>
                <p className="text-[0.82rem] text-red-600">Reason: {verRejection || "Please re-submit correct documents."}</p>
              </div>
            </div>
          )}

          {/* Verification form */}
          {(verStatus === "not_submitted" || verStatus === "rejected") && (
            <div className="bg-white rounded-[16px] p-6 md:p-8 border border-[rgba(212,114,26,0.06)]">
              <div className="space-y-5">
                {/* Document uploads */}
                {[
                  { field: "aadhaar_url", label: "Aadhaar Card *", icon: <FileCheck className="w-4 h-4" /> },
                  { field: "pan_url", label: "PAN Card *", icon: <FileCheck className="w-4 h-4" /> },
                  { field: "address_proof_url", label: "Address Proof (optional)", icon: <MapPin className="w-4 h-4" /> },
                  { field: "fssai_url", label: "FSSAI Certificate (optional — earns badge)", icon: <BadgeCheck className="w-4 h-4" /> },
                ].map((doc) => (
                  <div key={doc.field}>
                    <label className={labelClass}>{doc.label}</label>
                    <div className="flex items-center gap-3">
                      {verForm[doc.field as keyof typeof verForm] && verForm[doc.field as keyof typeof verForm] !== "" && (
                        <span className="text-[0.82rem] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Uploaded</span>
                      )}
                      <label className={cn(
                        "flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] border border-dashed text-[0.82rem] font-semibold cursor-pointer transition-all",
                        uploadingField === doc.field ? "opacity-50 cursor-wait" : "border-[var(--cream-300)] text-[var(--text-muted)] hover:border-[var(--orange-500)] hover:text-[var(--orange-500)]"
                      )} style={{ fontFamily: "var(--font-body)" }}>
                        {uploadingField === doc.field ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploadingField === doc.field ? "Uploading..." : "Upload"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVerDocUpload(doc.field, e)} disabled={uploadingField === doc.field} />
                      </label>
                    </div>
                  </div>
                ))}

                {/* Emergency contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[rgba(212,114,26,0.06)]">
                  <div>
                    <label className={labelClass}>Emergency Contact Name *</label>
                    <input type="text" value={verForm.emergency_contact_name}
                      onChange={(e) => setVerForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                      placeholder="e.g. Parent or spouse name" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Emergency Contact Phone *</label>
                    <input type="tel" value={verForm.emergency_contact_phone}
                      onChange={(e) => setVerForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
                      placeholder="98XXXXXXXX" className={inputClass} />
                  </div>
                </div>

                {/* Terms checkbox */}
                <div className="flex items-center gap-2.5 pt-4">
                  <input type="checkbox" checked={verForm.terms_accepted}
                    onChange={(e) => setVerForm((f) => ({ ...f, terms_accepted: e.target.checked }))}
                    className="w-[18px] h-[18px] accent-[var(--orange-500)] cursor-pointer" id="ver-terms" />
                  <label htmlFor="ver-terms" className="text-[0.88rem] text-[var(--text-muted)] cursor-pointer">
                    I agree to the <a href="/terms" target="_blank" className="text-[var(--orange-500)] no-underline hover:underline">Terms of Service</a> and{" "}
                    <a href="/privacy" target="_blank" className="text-[var(--orange-500)] no-underline hover:underline">Privacy Policy</a>
                  </label>
                </div>

                <button onClick={handleSubmitVerification} disabled={verSubmitting}
                  className={cn(btnPrimary, "mt-2")} style={{ fontFamily: "var(--font-body)" }}>
                  {verSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {verSubmitting ? "Submitting..." : "Submit for Verification"}
                </button>
              </div>
            </div>
          )}

          {verStatus === "pending" && (
            <div className="bg-white rounded-[16px] p-6 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)]">
              <p className="text-[0.9rem]">Your documents have been submitted. Please wait for our team to review them. You&apos;ll be notified once approved.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ MY REVIEWS (chef-side — reviews RECEIVED) ═══ */}
      {activePanel === "reviews" && (
        <div>
          <h2 className="font-bold text-[1.05rem] mb-1">My Reviews</h2>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-6">
            What your customers say about you. This is public on your chef profile.
          </p>

          {reviewsLoading ? (
            <div className="bg-white rounded-[16px] p-8 border border-[rgba(212,114,26,0.06)] animate-pulse">
              <div className="h-6 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-24 bg-gray-100 rounded mb-3" />
              <div className="h-24 bg-gray-100 rounded" />
            </div>
          ) : reviewsError ? (
            <div className="bg-red-50 border border-red-200 rounded-[16px] p-5 text-red-600 text-[0.88rem]">
              {reviewsError}
            </div>
          ) : (
            <>
              {/* Summary card — average + distribution */}
              <div className="bg-white rounded-[16px] p-6 md:p-8 border border-[rgba(212,114,26,0.06)] mb-6">
                <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-8 items-center">
                  {/* Average */}
                  <div className="text-center md:border-r md:pr-8 md:border-[rgba(212,114,26,0.12)]">
                    <div className="text-[2.5rem] font-bold text-[var(--brown-800)] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                      {reviewsStats.average_rating ? reviewsStats.average_rating.toFixed(1) : "—"}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "w-4 h-4",
                            n <= Math.round(reviewsStats.average_rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-200 fill-gray-200",
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[0.78rem] text-[var(--text-muted)] mt-1.5">
                      {reviewsStats.total_reviews} {reviewsStats.total_reviews === 1 ? "review" : "reviews"}
                    </p>
                  </div>

                  {/* Distribution */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviewsStats.distribution?.[String(star)] || 0;
                      const pct = reviewsStats.total_reviews > 0
                        ? Math.round((count / reviewsStats.total_reviews) * 100)
                        : 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-[0.82rem]">
                          <span className="w-10 flex items-center gap-1 text-[var(--text-muted)]">
                            {star} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-[var(--text-muted)] tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reviews list */}
              {reviewsList.length === 0 ? (
                <div className="bg-white rounded-[16px] p-10 border border-[rgba(212,114,26,0.06)] text-center">
                  <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-60" />
                  <p className="text-[0.92rem] font-semibold text-[var(--brown-800)] mb-1">No reviews yet</p>
                  <p className="text-[0.82rem] text-[var(--text-muted)]">Complete your first bookings and customers will be able to leave reviews here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsList.map((r: any) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-[16px] p-5 md:p-6 border border-[rgba(212,114,26,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--cream-200)] border border-[var(--cream-300)] flex items-center justify-center text-[var(--brown-800)] font-semibold text-[0.9rem] shrink-0">
                            {(r.user?.name || "?").trim().charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[0.92rem] text-[var(--brown-800)]">
                              {r.user?.name || "Customer"}
                            </div>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star
                                  key={n}
                                  className={cn(
                                    "w-3.5 h-3.5",
                                    n <= (Number(r.rating) || 0)
                                      ? "text-amber-400 fill-amber-400"
                                      : "text-gray-200 fill-gray-200",
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-[0.72rem] text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-[0.9rem] text-[var(--text-muted)] leading-relaxed pl-[52px]">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Apr 21 NEW FLOW — Reject Booking Modal
          Chef must give a reason. Reason is stored server-side but NEVER shown to customer.
          Customer only sees "Chef unavailable" + rebook option. */}
      {rejectModal.open && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
          onClick={() => !rejectModal.submitting && setRejectModal({ open: false, bookingId: "", customerName: "", reason: "", submitting: false })}
        >
          <div
            className="bg-white rounded-[16px] max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-[1.05rem] mb-0.5">Reject this booking?</h3>
                <p className="text-[0.82rem] text-[var(--text-muted)]">
                  {rejectModal.customerName} will be notified that you can't take it. They'll be offered another chef.
                </p>
              </div>
            </div>

            <label className="block text-[0.82rem] font-semibold text-[var(--brown-800)] mb-1.5">
              Why are you rejecting? <span className="text-red-500">*</span>
            </label>
            <p className="text-[0.72rem] text-[var(--text-muted)] mb-2">
              This reason is for internal records only — the customer never sees it. Be honest so we can improve matching.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
              placeholder="e.g. Not available that day, too far from my location, dishes outside my specialty..."
              rows={3}
              maxLength={500}
              disabled={rejectModal.submitting}
              className="w-full px-3 py-2.5 rounded-[10px] border border-[var(--cream-300)] bg-white text-[0.88rem] outline-none focus:border-[var(--orange-500)] resize-none disabled:opacity-50"
              style={{ fontFamily: "var(--font-body)" }}
            />
            <div className="text-right text-[0.7rem] text-[var(--text-muted)] mt-1">
              {rejectModal.reason.length}/500
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRejectModal({ open: false, bookingId: "", customerName: "", reason: "", submitting: false })}
                disabled={rejectModal.submitting}
                className="flex-1 py-2.5 rounded-full bg-white border border-[var(--cream-300)] text-[var(--text-muted)] font-semibold text-[0.85rem] cursor-pointer hover:border-[var(--text-muted)] disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={rejectModal.submitting || rejectModal.reason.trim().length < 5}
                className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-semibold text-[0.85rem] border-none cursor-pointer hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {rejectModal.submitting ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activePanel === "availability" && verStatus === "approved" && (
        <AvailabilityPanel />
      )}
      {activePanel === "availability" && verStatus !== "approved" && (
        <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4 max-w-2xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[0.9rem] text-amber-800">Verification required</div>
              <div className="text-[0.82rem] text-amber-700 mt-1">
                Complete verification to set your availability schedule.
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
