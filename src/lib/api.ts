import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
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

// â•â•â• Request interceptor â€” attach JWT â•â•â•
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get("coc_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// â•â•â• Response interceptor â€” handle 401 + refresh â•â•â•
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

// â•â•â• Auth API â•â•â•
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

  logout: () => api.post("/auth/logout"),

  getMe: () => api.get("/auth/me"),
};

// â•â•â• Users API â•â•â•
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

// â•â•â• Cooks API â•â•â•
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

  // â”€â”€â”€ VERIFICATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ REVIEWS RECEIVED (chef-side "My Reviews" panel) â”€
  // Fetches reviews + aggregate stats for the currently logged-in chef.
  getMyReviewsReceived: (params?: { page?: number; limit?: number }) =>
    api.get("/reviews/cook/me/received", { params }),
};

// â•â•â• Availability API (Apr 24, 2026) â•â•â•
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
  // Public â€” slot picker
  getCookSlots: (cookId: string, date: string, durationHours: number) =>
    api.get(`/availability/cook/${cookId}/slots`, {
      params: { date, duration: durationHours },
    }),
};

// â•â•â• Bookings API â•â•â•
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
    // â”€â”€â”€ Package booking fields (P1.5c) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     packageId?: string;
     guestCount?: number;
     selectedCategories?: Array<{ categoryId: string; dishIds: string[] }>;
     selectedAddonIds?: string[];
  }) => api.post("/bookings", data),

  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/bookings", { params }),

  getById: (id: string) => api.get(`/bookings/${id}`),

  // â”€â”€â”€ NEW FLOW (Apr 21, 2026) â€” backend uses POST, not PATCH â”€â”€
  /** Chef accepts â†’ booking becomes AWAITING_PAYMENT, customer has 3hr to pay */
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

  // â”€â”€â”€ COOKING SESSION OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â•â•â• Payments API â•â•â•
export const paymentsApi = {
  createOrder: (data: { booking_id: string }) =>
    api.post("/payments/create-order", data),
  verify: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post("/payments/verify", data),
};

// â•â•â• Reviews API â•â•â•
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


// â•â•â• Notifications API â•â•â•
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

// â•â•â• Admin API â•â•â•
export const adminApi = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/admin/users", { params }),
  getCooks: (params?: { verified?: string; page?: number; limit?: number }) =>
    api.get("/admin/cooks", { params }),
  getPendingCooks: (params?: { page?: number; limit?: number }) =>
    api.get("/admin/cooks/pending", { params }),
  verifyCook: (cookId: string, verified: boolean, rejectionReason?: string) =>
    api.patch(`/admin/cooks/${cookId}/verify`, { verified, rejection_reason: rejectionReason }),
  toggleUserActive: (userId: string) =>
    api.patch(`/admin/users/${userId}/toggle-active`),
  getBookings: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get("/admin/bookings", { params }),
  updateBookingStatus: (bookingId: string, status: string) =>
    api.patch(`/admin/bookings/${bookingId}/status`, { status }),
  getRecentUsers: () => api.get("/admin/recent-users"),
  getRecentBookings: () => api.get("/admin/recent-bookings"),

  // â”€â”€â”€ AUDIT LOG (NEW Apr 24) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getAuditLog: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    target_type?: string;
  }) => api.get("/admin/audit-log", { params }),

  // ─── ANALYTICS PHASE 1 ──────────────────────────────────────
  // Every endpoint accepts ?range=24h|7d|30d|90d|custom (+ from/to for custom).
  getAnalyticsOverview: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/overview", { params }),
  getAnalyticsUsers: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/users", { params }),
  getAnalyticsBookings: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/bookings", { params }),
  getAnalyticsRevenue: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/revenue", { params }),
  getAnalyticsChefs: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/chefs", { params }),
  getAnalyticsLocations: (params?: AnalyticsRangeParams) =>
    api.get("/admin/analytics/locations", { params }),
  /** Returns CSV as a Blob — caller triggers the download. */
  exportAnalyticsCsv: (
    metric: "bookings" | "revenue" | "users" | "top_chefs",
    params?: AnalyticsRangeParams,
  ) =>
    api.get("/admin/analytics/export.csv", {
      params: { ...params, metric },
      responseType: "blob",
    }),

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
  }) => api.post("/admin/notifications/broadcast", data),

  /** Last N broadcasts for the history panel (newest first). */
  getBroadcasts: (params?: { page?: number; limit?: number }) =>
    api.get("/admin/notifications/broadcasts", { params }),

  // ─── ROUND 4: PROMO CODE MANAGER ────────────────────────────
  // Backend mounts these under /promo-codes (admin-only via @Roles).
  promos: {
    /** List promos. status filter: active|inactive|expired|exhausted. */
    list: (status?: "active" | "inactive" | "expired" | "exhausted") =>
      api.get("/promo-codes", { params: status ? { status } : {} }),

    get: (id: string) => api.get(`/promo-codes/${id}`),

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
    }) => api.post("/promo-codes", data),

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
    ) => api.patch(`/promo-codes/${id}`, data),

    toggle: (id: string) => api.patch(`/promo-codes/${id}/toggle`),

    /**
     * Backend returns 409 with a friendly message when the promo has
     * already been used. Caller surfaces the message verbatim.
     */
    remove: (id: string) => api.delete(`/promo-codes/${id}`),

    /** Paginated redemption history with hydrated user names/emails. */
    usages: (id: string, params?: { page?: number; limit?: number }) =>
      api.get(`/promo-codes/${id}/usages`, { params }),
  },
};

export type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "custom";
export interface AnalyticsRangeParams {
  range?: AnalyticsRange;
  from?: string;
  to?: string;
}

// â•â•â• Uploads API â•â•â•
export const uploadsApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);          // âœ… was "image", backend expects "file"
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

// â”€â”€â”€ MEAL PACKAGES API (P1.5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Public (customer view â€” used in P1.5c)
  getCookPackages: (cookId: string) => api.get(`/meal-packages/cook/${cookId}`),
  getPublicByCook: (cookId: string) => api.get(`/meal-packages/cook/${cookId}`),  
};


// â•â•â• Addresses API â•â•â•
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

// â•â•â• Areas API (P1.6 â€” Apr 27, 2026) â•â•â•
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

export const areasApi = {
  // Public â€” list active areas (cached client-side via SWR-style)
  list: (city?: string) =>
    api.get<{ data: ServiceAreaDto[] }>('/areas', {
      params: city ? { city } : undefined,
    }),

  // Auth â€” request a new area (chef or customer)
  request: (data: { name: string; city?: string }) =>
    api.post('/areas/request', data),

  // Admin â€” list all area requests, filterable by status
  adminListRequests: (status?: 'pending' | 'approved' | 'rejected') =>
    api.get<{ data: AreaRequestDto[] }>('/areas/admin/requests', {
      params: status ? { status } : undefined,
    }),

  // Admin â€” approve a request, must specify slug + region
  adminApprove: (id: string, data: { slug: string; region: string }) =>
    api.patch(`/areas/admin/requests/${id}/approve`, data),

  // Admin â€” reject a request with a reason
  adminReject: (id: string, reason: string) =>
    api.patch(`/areas/admin/requests/${id}/reject`, { reject_reason: reason }),
};

// â•â•â• Pincode Lookup (India Post API â€” free, no key) â•â•â•
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
