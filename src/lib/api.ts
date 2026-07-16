import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import type { ApiResponse } from "@/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://cookoncall-backend-production-7c6d.up.railway.app/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// === Request interceptor — attach JWT ===
//
// Auth-header precedence (highest first):
//
//   1. An Authorization header explicitly set on the request config
//      (e.g. the admin panel's `ah()` helper passes its own token via
//      coc_admin_token, which is a different cookie). The interceptor
//      MUST NOT overwrite an explicit header — doing so was the root
//      cause of the "every 3 seconds I get kicked out of the admin
//      panel" bug, where the regular customer's coc_token got attached
//      to admin API calls instead, the backend returned 401, and the
//      response interceptor below redirected to /login.
//
//   2. Otherwise, fall back to coc_token (regular customer / cook
//      session) from cookies.
//
// The admin panel deliberately uses a separate coc_admin_token cookie
// so an admin can be signed into both views in the same browser without
// the cookies clobbering each other.
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!config.headers) return config;
    // Check both casings — axios normalizes to "Authorization" but
    // older calls may have used "authorization".
    const explicit =
      config.headers.Authorization ?? (config.headers as any).authorization;
    if (explicit) {
      // Caller already attached a token (e.g. admin panel via ah()).
      // Leave it alone.
      return config;
    }
    const token = Cookies.get("coc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === Response interceptor — handle 401 + refresh ===
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-forgot-otp",
  "/auth/send-email-otp",
  "/auth/verify-email-otp",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/google",
];

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((ep) => url.includes(ep));
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && isAuthEndpoint(originalRequest?.url)) {
      return Promise.reject(error);
    }

    // Admin-panel calls supply their own Authorization header (sourced
    // from coc_admin_token, NOT coc_token). The customer-side refresh
    // flow below uses coc_refresh_token which the admin login never
    // sets — so trying to refresh would always fail and bounce the
    // admin to /login on the very first 401.
    //
    // Detect those calls by the presence of an explicit Authorization
    // header on the original request config and surface the 401 to the
    // admin page handler unchanged. Admin re-login is then handled
    // by the panel itself (showing a "session expired" toast and
    // re-rendering the login form), not by this global interceptor.
    const hasExplicitAuth =
      !!originalRequest?.headers?.Authorization ||
      !!(originalRequest?.headers as any)?.authorization;
    if (error.response?.status === 401 && hasExplicitAuth) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get("coc_refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const resp = data.data || (data as any);
        const newToken = resp.accessToken || resp.access_token;
        const newRefresh = resp.refreshToken || resp.refresh_token;

        Cookies.set("coc_token", newToken, { expires: 1 / 96 });
        Cookies.set("coc_refresh_token", newRefresh, { expires: 7 });

        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        Cookies.remove("coc_token");
        Cookies.remove("coc_refresh_token");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// === Auth API ===
export const authApi = {
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: "user" | "cook";
    specialties?: string;
    experience?: string;
    rate?: number;
    address?: string;
  }) => api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  // Round 4: Sign in (or sign up) with a Google ID token from GIS.
  // Sends `token` (matches the backend GoogleAuthDto field name) plus
  // an optional `role` honored only when the email is brand-new — the
  // backend ignores the role for existing accounts so a Chef can't be
  // silently downgraded by clicking the wrong button.
  googleAuth: (data: { token: string; role?: "user" | "cook" }) =>
    api.post("/auth/google", data),

  sendOtp: (data: { phone: string }) =>
    api.post("/auth/send-otp", data),

  verifyOtp: (data: { phone: string; otp: string }) =>
    api.post("/auth/verify-otp", data),

  sendEmailOtp: (data: { email: string }) =>
    api.post("/auth/send-email-otp", data),

  verifyEmailOtp: (data: { email: string; otp: string }) =>
    api.post("/auth/verify-email-otp", data),

  forgotPassword: (data: { email: string }) =>
    api.post("/auth/forgot-password", data),

  verifyForgotOtp: (data: { email: string; otp: string }) =>
    api.post("/auth/verify-forgot-otp", data),

  resetPassword: (data: { email: string; otp: string; new_password: string }) =>
    api.post("/auth/reset-password", data),

  // Logged-in self-service. Distinct from resetPassword (forgot flow) —
  // requires a valid JWT and re-verifies the current password before
  // accepting the new one. Backend: cookoncall-backend PR #28
  // (POST /auth/change-password).
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post("/auth/change-password", data),

  logout: () => api.post("/auth/logout"),

  getMe: () => api.get("/auth/me"),
};

// === Users API ===
export const usersApi = {
  getMe: () => api.get("/users/me"),
  updateMe: (data: Partial<{
    name: string;
    phone: string;
    avatar: string;
    address: string;
    latitude: number;
    longitude: number;
  }>) => api.patch("/users/me", data),
  getMyStats: () => api.get("/users/me/stats"),

  // ─── ROUND 4: NOTIFICATION PREFERENCES ─────────────────────
  // Slim payload (just the three booleans) so the Settings screen
  // doesn't pull the full user PII on every open.
  getNotificationPreferences: () =>
    api.get("/users/me/notification-preferences"),
  updateNotificationPreferences: (data: {
    push_enabled?: boolean;
    email_enabled?: boolean;
    sms_enabled?: boolean;
  }) => api.patch("/users/me/notification-preferences", data),
};

// === Cooks API ===
export const cooksApi = {
  search: (params?: Record<string, string | number | boolean>) =>
    api.get("/cooks", { params }),
  getById: (id: string) => api.get(`/cooks/${id}`),
  getMenu: (id: string) => api.get(`/cooks/${id}/menu`),
  updateMe: (data: Record<string, unknown>) => api.patch("/cooks/me", data),
  toggleAvailability: (isAvailable: boolean) =>
    api.patch("/cooks/me/availability", { isAvailable }),
  getMyProfile: () => api.get("/cooks/me/profile"),
  getMyMenu: () => api.get("/cooks/me/menu"),
  addMenuItem: (data: {
    name: string;
    price: number;
    type: "veg" | "nonveg";
    category: string;
    description?: string;
    image?: string;
  }) => api.post("/cooks/me/menu", data),
  updateMenuItem: (id: string, data: Record<string, unknown>) =>
    api.patch(`/cooks/me/menu/${id}`, data),
  deleteMenuItem: (id: string) => api.delete(`/cooks/me/menu/${id}`),
  getMyStats: () => api.get("/cooks/me/stats"),
  getMyEarnings: () => api.get("/cooks/me/earnings"),

  // ─── ROUND 3: PAYOUT HISTORY ───────────────────────────────
  // Paginated list of completed bookings with the per-booking payment
  // breakdown (gross, platform commission, net, status). Used by the
  // chef "Earnings History" panel.
  getMyPayouts: (params?: {
    page?: number;
    limit?: number;
    status?: "created" | "authorized" | "captured" | "refunded" | "failed";
  }) => api.get("/cooks/me/payouts", { params }),

  // --- VERIFICATION ----------------------------------
  submitVerification: (data: {
    aadhaar_url: string;
    pan_url: string;
    address_proof_url?: string;
    fssai_url?: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    terms_accepted: boolean;
  }) => api.post("/cooks/me/submit-verification", data),

  getVerificationStatus: () => api.get("/cooks/me/verification-status"),

  // --- REVIEWS RECEIVED (chef-side "My Reviews" panel) -
  // Fetches reviews + aggregate stats for the currently logged-in chef.
  getMyReviewsReceived: (params?: { page?: number; limit?: number }) =>
    api.get("/reviews/cook/me/received", { params }),
};

// === Availability API (Apr 24, 2026) ===
// Weekly schedules + date overrides + slot picker.
export interface TimeWindow { start: string; end: string }
export interface AvailSchedule { id: string; weekday: number; enabled: boolean; windows: TimeWindow[] }
export interface AvailOverride { id: string; date: string; closed: boolean; windows: TimeWindow[]; note: string | null }
export interface AvailSettings { min_advance_notice_minutes: number; booking_buffer_minutes: number }
export interface AvailSlot { start: string; end: string; label: string }

export const availabilityApi = {
  // Chef
  getMine: () => api.get("/availability/me"),
  upsertSchedule: (data: { weekday: number; enabled: boolean; windows: TimeWindow[] }) =>
    api.post("/availability/me/schedule", data),
  upsertOverride: (data: { date: string; closed: boolean; windows: TimeWindow[]; note?: string }) =>
    api.post("/availability/me/override", data),
  deleteOverride: (id: string) => api.delete(`/availability/me/override/${id}`),
  updateSettings: (data: Partial<AvailSettings>) =>
    api.patch("/availability/me/settings", data),
  // Public — slot picker
  getCookSlots: (cookId: string, date: string, durationHours: number) =>
    api.get(`/availability/cook/${cookId}/slots`, {
      params: { date, duration: durationHours },
    }),
};

// === Bookings API ===
export const bookingsApi = {
  create: (data: {
    cook_id: string;
    scheduled_at: string;
    address: string;
    duration_hours?: number;
    guests?: number;
    dishes?: string;
    instructions?: string;
    selected_items?: Array<{ menuItemId: string; qty: number }>;
    order_items?: Array<{ menuItemId: string; name: string; qty: number; price: number }>;
    // --- Package booking fields (P1.5c) ---------------
     packageId?: string;
     guestCount?: number;
     selectedCategories?: Array<{ categoryId: string; dishIds: string[] }>;
     selectedAddonIds?: string[];
  }) => api.post("/bookings", data),

  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/bookings", { params }),

  getById: (id: string) => api.get(`/bookings/${id}`),

  /** Customer reschedules a booking to a new time (ISO). Shared backend
   *  endpoint (PATCH /bookings/:id/reschedule) with the mobile app. */
  reschedule: (id: string, scheduled_at: string) =>
    api.patch(`/bookings/${id}/reschedule`, { scheduled_at }),

  // --- NEW FLOW (Apr 21, 2026) — backend uses POST, not PATCH --
  /** Chef accepts -> booking becomes CONFIRMED. Customer can pay any
   *  time before the session-end OTP (May 29, 2026 flow — see backend
   *  PR #36). The chef cannot mark the session COMPLETED via end-OTP
   *  until a captured payment row exists. */
  accept: (id: string) => api.post(`/bookings/${id}/accept`),
  /** Chef rejects with internal reason (never shown to customer) */
  reject: (id: string, reason: string) =>
    api.post(`/bookings/${id}/reject`, { reason }),
  /** Customer rebooks with a different chef after rejection/expiry */
  rebook: (
    id: string,
    data: {
      new_cook_id: string;
      selected_items: Array<{ menuItemId: string; qty?: number }>;
      instructions?: string;
    },
  ) => api.post(`/bookings/${id}/rebook`, data),

  cancel: (id: string, reason?: string) =>
    api.patch(`/bookings/${id}/status`, { status: 'cancelled_by_user', cancellation_reason: reason }),
  start: (id: string) => api.patch(`/bookings/${id}/start`),
  complete: (id: string) => api.patch(`/bookings/${id}/complete`),

  // --- COOKING SESSION OTP ---------------------------
  sendStartOtp: (id: string) => api.post(`/bookings/${id}/start-otp`),
  verifyStartOtp: (id: string, otp: string) =>
    api.post(`/bookings/${id}/verify-start-otp`, { otp }),
  sendEndOtp: (id: string) => api.post(`/bookings/${id}/end-otp`),
  verifyEndOtp: (id: string, otp: string) =>
    api.post(`/bookings/${id}/verify-end-otp`, { otp }),

  /** Get refund estimate before cancelling */
  getRefundEstimate: (id: string) => api.get(`/bookings/${id}/refund-estimate`),

  /** Round 2: download a paid booking's PDF receipt as a Blob. */
  getReceipt: (id: string) =>
    api.get(`/bookings/${id}/receipt`, { responseType: "blob" }),
};

// === Payments API ===
export const paymentsApi = {
  createOrder: (data: { booking_id: string }) =>
    api.post("/payments/create-order", data),
  verify: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post("/payments/verify", data),
};

// === Reviews API ===
export const reviewsApi = {
  submit: (data: {
    booking_id: string;
    rating: number;
    comment?: string;
  }) => api.post("/reviews", data),
  getByCook: (cookId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/reviews/cook/${cookId}`, { params }),
  getMyReviews: () => api.get("/reviews/me"),
};


// === Notifications API ===
export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get("/notifications", { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  // Round 4 / Analytics Phase 2 — first-click is recorded for CTR.
  // Re-clicks are server-side no-ops so we don't double-count.
  recordClick: (id: string) => api.post(`/notifications/${id}/click`),
};

// Events / Page Tracking API
// Phase 3 prep — used by the global page-view tracker hook to fire
// `event_type: 'page_view'` on every route change. The endpoint is
// public (auth optional) so anonymous funnels are still measurable.
export const eventsApi = {
  track: (data: {
    event_type: string;
    page_path?: string;
    referrer?: string;
    session_id?: string;
    metadata?: Record<string, unknown>;
  }) => api.post("/events", data),
};

// === Admin API ===
//
// Every method below MUST go through `withAdminAuth()` so the request
// carries the admin's bearer token (`coc_admin_token`) instead of the
// regular customer token (`coc_token`). The two cookies are deliberately
// separate so an admin can be signed into both views in the same browser
// (see fix/admin-panel-auth-and-polish PR #22 for the original write-up).
//
// Why this matters
// ----------------
// Pre-this-fix, every adminApi.* call hit the bare `api.<verb>` instance.
// The request interceptor saw no explicit Authorization header and fell
// back to coc_token — which is empty for an admin-only session. Backend
// returned 401, the response interceptor redirected to /login, the admin
// got bounced back to the home page every 5–6 seconds. PR #22 added the
// "explicit Authorization header survives" rule to the interceptor, but
// adminApi never set that header — so the rule never kicked in. THIS
// helper sets it.
//
// Calls now carry the admin token AND opt into the response interceptor's
// "don't refresh on 401" escape hatch (because the request had an explicit
// Authorization). The page's handleAdminError surfaces the 401 as a clean
// "session expired" instead of a hard redirect.
function withAdminAuth(extraConfig?: AxiosRequestConfig): AxiosRequestConfig {
  const token = Cookies.get("coc_admin_token");
  const baseHeaders = (extraConfig?.headers ?? {}) as Record<string, string>;
  return {
    ...(extraConfig ?? {}),
    headers: {
      ...baseHeaders,
      // Always set, even if the cookie is missing — sending an empty
      // bearer triggers a 401 immediately, which the page handles by
      // surfacing the login form. That's better UX than a silent fall-
      // through to coc_token.
      Authorization: `Bearer ${token ?? ""}`,
    },
  };
}

export const adminApi = {
  getStats: () => api.get("/admin/stats", withAdminAuth()),
  getUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/admin/users", withAdminAuth({ params })),
  getCooks: (params?: { verified?: string; page?: number; limit?: number }) =>
    api.get("/admin/cooks", withAdminAuth({ params })),
  getPendingCooks: (params?: { page?: number; limit?: number }) =>
    api.get("/admin/cooks/pending", withAdminAuth({ params })),
  verifyCook: (cookId: string, verified: boolean, rejectionReason?: string) =>
    api.patch(
      `/admin/cooks/${cookId}/verify`,
      { verified, rejection_reason: rejectionReason },
      withAdminAuth(),
    ),
  toggleUserActive: (userId: string) =>
    api.patch(`/admin/users/${userId}/toggle-active`, undefined, withAdminAuth()),
  getBookings: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get("/admin/bookings", withAdminAuth({ params })),
  updateBookingStatus: (bookingId: string, status: string) =>
    api.patch(`/admin/bookings/${bookingId}/status`, { status }, withAdminAuth()),
  getRecentUsers: () => api.get("/admin/recent-users", withAdminAuth()),
  getRecentBookings: () => api.get("/admin/recent-bookings", withAdminAuth()),

  // --- AUDIT LOG (NEW Apr 24) ------------------------
  getAuditLog: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    target_type?: string;
  }) => api.get("/admin/audit-log", withAdminAuth({ params })),

  // ─── ANALYTICS PHASE 1 ──────────────────────────────────────
  // Every endpoint accepts ?range=24h|7d|30d|90d|custom (+ from/to for custom).
  getAnalyticsOverview: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/overview", withAdminAuth({ params })),
  getAnalyticsUsers: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/users", withAdminAuth({ params })),
  getAnalyticsBookings: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/bookings", withAdminAuth({ params })),
  getAnalyticsRevenue: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/revenue", withAdminAuth({ params })),
  getAnalyticsChefs: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/chefs", withAdminAuth({ params })),
  getAnalyticsLocations: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/locations", withAdminAuth({ params })),
  /** Returns CSV as a Blob — caller triggers the download. */
  exportAnalyticsCsv: (
    metric: "bookings" | "revenue" | "users" | "top_chefs",
    params?: AnalyticsRangeParams,
  ) =>
    api.get(
      "/admin/analytics/export.csv",
      withAdminAuth({
        params: { ...params, metric },
        responseType: "blob",
      }),
    ),

  /**
   * Phase 3 — PDF export.
   * Returns the report as a Blob (Content-Type: application/pdf).
   * Currently `metric=overview` is the only supported value; the
   * generator pulls top chefs and locations alongside, so 'overview'
   * is the comprehensive report.
   */
  exportAnalyticsPdf: (
    metric: "overview" = "overview",
    params?: AnalyticsRangeParams,
  ) =>
    api.get(
      "/admin/analytics/export.pdf",
      withAdminAuth({
        params: { ...params, metric },
        responseType: "blob",
      }),
    ),

  /** Phase 3 — peek at the daily digest payload without sending email. */
  previewDigest: () => api.get("/admin/analytics/digest/preview", withAdminAuth()),

  /** Phase 3 — fire the daily digest right now (still respects per-admin
   *  email_enabled and the ANALYTICS_DIGEST_DISABLED env flag). */
  runDigestNow: () =>
    api.post("/admin/analytics/digest/run-now", undefined, withAdminAuth()),

  // ─── ROUND 3: BROADCAST PUSH ────────────────────────────────
  // POST a broadcast — title 1-65 chars, body 1-240 chars, audience
  // ('all' | 'customers' | 'cooks' | 'area'). When audience='area',
  // area_slug is required. deep_link is optional and opens inside the
  // app on tap.
  sendBroadcast: (data: {
    title: string;
    body: string;
    audience: "all" | "customers" | "cooks" | "area";
    area_slug?: string;
    deep_link?: string;
  }) => api.post("/admin/notifications/broadcast", data, withAdminAuth()),

  /** Last N broadcasts for the history panel (newest first). */
  getBroadcasts: (params?: { page?: number; limit?: number }) =>
    api.get("/admin/notifications/broadcasts", withAdminAuth({ params })),

  /**
   * Round 4 / Analytics Phase 2 — click-through-rate for one broadcast.
   * Returns {broadcast, stats: {created, clicked, read, ctr_percent,
   * read_rate_percent}, clickers: [first 100]}. Lazy-loaded by the
   * BroadcastPanel when the admin expands a row.
   */
  getBroadcastCtr: (id: string) =>
    api.get(`/admin/notifications/broadcasts/${id}/ctr`, withAdminAuth()),

  // Reviews moderation list (admin). max_rating filters low-rated bookings.
  reviews: (params?: { page?: number; limit?: number; max_rating?: number }) =>
    api.get("/admin/reviews", withAdminAuth({ params })),

  // ─── ROUND 4: PROMO CODE MANAGER ────────────────────────────
  // Backend mounts these under /promo-codes. `validate` is customer-facing
  // (regular coc_token auth); the rest are admin-only via @Roles.
  promos: {
    /**
     * CUSTOMER — validate a promo code against an order amount before
     * booking. Returns { discount, final_amount, message }. Same endpoint
     * the mobile app calls, so web + app stay in parity.
     */
    validate: (data: { code: string; order_amount: number }) =>
      api.post<{ discount: number; final_amount: number; message: string }>(
        "/promo-codes/validate",
        data,
      ),

    /** List promos. status filter: active|inactive|expired|exhausted. */
    list: (status?: "active" | "inactive" | "expired" | "exhausted") =>
      api.get("/promo-codes", withAdminAuth({ params: status ? { status } : {} })),

    get: (id: string) => api.get(`/promo-codes/${id}`, withAdminAuth()),

    create: (data: {
      code: string;
      type: "percentage" | "flat" | "free_visit";
      value: number;
      max_discount?: number;
      min_order_amount?: number;
      single_use?: boolean;
      max_uses?: number;
      expires_at?: string; // ISO date
      description?: string;
      is_active?: boolean;
    }) => api.post("/promo-codes", data, withAdminAuth()),

    /** Edit any field except `code`; backend rejects updates to code. */
    update: (
      id: string,
      data: Partial<{
        type: "percentage" | "flat" | "free_visit";
        value: number;
        max_discount: number | null;
        min_order_amount: number;
        single_use: boolean;
        max_uses: number | null;
        expires_at: string | null;
        description: string;
        is_active: boolean;
      }>,
    ) => api.patch(`/promo-codes/${id}`, data, withAdminAuth()),

    toggle: (id: string) =>
      api.patch(`/promo-codes/${id}/toggle`, undefined, withAdminAuth()),

    /**
     * Backend returns 409 with a friendly message when the promo has
     * already been used. Caller surfaces the message verbatim.
     */
    remove: (id: string) => api.delete(`/promo-codes/${id}`, withAdminAuth()),

    /** Paginated redemption history with hydrated user names/emails. */
    usages: (id: string, params?: { page?: number; limit?: number }) =>
      api.get(`/promo-codes/${id}/usages`, withAdminAuth({ params })),
  },
};

export type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "custom";
export interface AnalyticsRangeParams {
  range?: AnalyticsRange;
  from?: string;
  to?: string;
}

// === Uploads API ===
export const uploadsApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);          // OK was "image", backend expects "file"
    return api.post("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  uploadMenu: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/menu", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// --- MEAL PACKAGES API (P1.5) -------------------------------
export const mealPackagesApi = {
  // Chef
  getMy: () => api.get('/meal-packages/my'),
  create: (data: Record<string, unknown>) => api.post('/meal-packages', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/meal-packages/${id}`, data),
  remove: (id: string) => api.delete(`/meal-packages/${id}`),

  // Categories
  addCategory: (pkgId: string, data: Record<string, unknown>) =>
    api.post(`/meal-packages/${pkgId}/categories`, data),
  updateCategory: (pkgId: string, catId: string, data: Record<string, unknown>) =>
    api.patch(`/meal-packages/${pkgId}/categories/${catId}`, data),
  deleteCategory: (pkgId: string, catId: string) =>
    api.delete(`/meal-packages/${pkgId}/categories/${catId}`),

  // Dishes
  addDish: (pkgId: string, catId: string, data: Record<string, unknown>) =>
    api.post(`/meal-packages/${pkgId}/categories/${catId}/dishes`, data),
  updateDish: (pkgId: string, catId: string, dishId: string, data: Record<string, unknown>) =>
    api.patch(`/meal-packages/${pkgId}/categories/${catId}/dishes/${dishId}`, data),
  deleteDish: (pkgId: string, catId: string, dishId: string) =>
    api.delete(`/meal-packages/${pkgId}/categories/${catId}/dishes/${dishId}`),

  // Add-ons
  addAddon: (pkgId: string, data: Record<string, unknown>) =>
    api.post(`/meal-packages/${pkgId}/addons`, data),
  updateAddon: (pkgId: string, addonId: string, data: Record<string, unknown>) =>
    api.patch(`/meal-packages/${pkgId}/addons/${addonId}`, data),
  deleteAddon: (pkgId: string, addonId: string) =>
    api.delete(`/meal-packages/${pkgId}/addons/${addonId}`),

  // Public (customer view — used in P1.5c)
  getCookPackages: (cookId: string) => api.get(`/meal-packages/cook/${cookId}`),
  getPublicByCook: (cookId: string) => api.get(`/meal-packages/cook/${cookId}`),  
};


// === Addresses API ===
export const addressesApi = {
  getAll: () => api.get("/addresses"),

  create: (data: {
    label?: "home" | "work" | "other";
    contact_name?: string;
    contact_phone?: string;
    house_no: string;
    street: string;
    landmark?: string;
    area: string;
    area_slug?: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }) => api.post("/addresses", data),

  update: (
    id: string,
    data: Partial<{
      label: "home" | "work" | "other";
      contact_name: string;
      contact_phone: string;
      house_no: string;
      street: string;
      landmark: string;
      area: string;
      area_slug: string;
      city: string;
      state: string;
      pincode: string;
      latitude: number;
      longitude: number;
      is_default: boolean;
    }>,
  ) => api.patch(`/addresses/${id}`, data),

  setDefault: (id: string) => api.patch(`/addresses/${id}/default`),

  delete: (id: string) => api.delete(`/addresses/${id}`),
};

// === Areas API (P1.6 — Apr 27, 2026) ===
export interface ServiceAreaDto {
  id: string;
  slug: string;
  name: string;
  region: string;
  city: string;
  is_active: boolean;
  sort_order: number;
}

export interface AreaRequestDto {
  id: string;
  requester_id: string;
  requester_role: 'cook' | 'customer';
  name: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_slug: string | null;
  reject_reason: string | null;
  created_at: string;
  requester?: { id: string; name: string; email: string };
}

// Customer favorites (saved chefs). Shared backend with the mobile app.
export const favoritesApi = {
  ids: () => api.get<string[]>("/favorites/ids"),
  list: () => api.get("/favorites"),
  toggle: (cookId: string) =>
    api.post<{ favorited: boolean }>(`/favorites/${cookId}`),
};

export const areasApi = {
  // Public — list active areas (cached client-side via SWR-style)
  list: (city?: string) =>
    api.get<{ data: ServiceAreaDto[] }>('/areas', {
      params: city ? { city } : undefined,
    }),

  // Auth — request a new area (chef or customer)
  request: (data: { name: string; city?: string }) =>
    api.post('/areas/request', data),

  // Admin — list all area requests, filterable by status
  adminListRequests: (status?: 'pending' | 'approved' | 'rejected') =>
    api.get<{ data: AreaRequestDto[] }>('/areas/admin/requests', {
      params: status ? { status } : undefined,
    }),

  // Admin — approve a request, must specify slug + region
  adminApprove: (id: string, data: { slug: string; region: string }) =>
    api.patch(`/areas/admin/requests/${id}/approve`, data),

  // Admin — reject a request with a reason
  adminReject: (id: string, reason: string) =>
    api.patch(`/areas/admin/requests/${id}/reject`, { reject_reason: reason }),
};

// === Pincode Lookup (India Post API — free, no key) ===
export async function lookupPincode(pincode: string): Promise<{
  city: string;
  state: string;
  valid: boolean;
}> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const json = await res.json();
    const entry = Array.isArray(json) ? json[0] : null;
    if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
      return { city: "", state: "", valid: false };
    }
    const po = entry.PostOffice[0];
    return {
      city: po.District || po.Block || po.Name || "",
      state: po.State || "",
      valid: true,
    };
  } catch {
    return { city: "", state: "", valid: false };
  }
}
