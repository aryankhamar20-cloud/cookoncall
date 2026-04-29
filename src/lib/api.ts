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

// ═══ Request interceptor — attach JWT ═══
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

// ═══ Response interceptor — handle 401 + refresh ═══
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

// ═══ Auth API ═══
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

  googleAuth: (data: { idToken: string; role?: string }) =>
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

// ═══ Users API ═══
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
};

// ═══ Cooks API ═══
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

  // ─── VERIFICATION ──────────────────────────────────
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

  // ─── REVIEWS RECEIVED (chef-side "My Reviews" panel) ─
  // Fetches reviews + aggregate stats for the currently logged-in chef.
  getMyReviewsReceived: (params?: { page?: number; limit?: number }) =>
    api.get("/reviews/cook/me/received", { params }),
};

// ═══ Availability API (Apr 24, 2026) ═══
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

// ═══ Bookings API ═══
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
    // ─── Package booking fields (P1.5c) ───────────────
     packageId?: string;
     guestCount?: number;
     selectedCategories?: Array<{ categoryId: string; dishIds: string[] }>;
     selectedAddonIds?: string[];
  }) => api.post("/bookings", data),

  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/bookings", { params }),

  getById: (id: string) => api.get(`/bookings/${id}`),

  // ─── NEW FLOW (Apr 21, 2026) — backend uses POST, not PATCH ──
  /** Chef accepts → booking becomes AWAITING_PAYMENT, customer has 3hr to pay */
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
    api.patch(`/bookings/${id}/cancel`, { reason }),
  start: (id: string) => api.patch(`/bookings/${id}/start`),
  complete: (id: string) => api.patch(`/bookings/${id}/complete`),

  // ─── COOKING SESSION OTP ───────────────────────────
  sendStartOtp: (id: string) => api.post(`/bookings/${id}/start-otp`),
  verifyStartOtp: (id: string, otp: string) =>
    api.post(`/bookings/${id}/verify-start-otp`, { otp }),
  sendEndOtp: (id: string) => api.post(`/bookings/${id}/end-otp`),
  verifyEndOtp: (id: string, otp: string) =>
    api.post(`/bookings/${id}/verify-end-otp`, { otp }),

  /** Get refund estimate before cancelling */
  getRefundEstimate: (id: string) => api.get(`/bookings/${id}/refund-estimate`),
};

// ═══ Payments API ═══
export const paymentsApi = {
  createOrder: (data: { booking_id: string }) =>
    api.post("/payments/create-order", data),
  verify: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post("/payments/verify", data),
};

// ═══ Reviews API ═══
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


// ═══ Notifications API ═══
export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get("/notifications", { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

// ═══ Admin API ═══
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

  // ─── AUDIT LOG (NEW Apr 24) ────────────────────────
  getAuditLog: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    target_type?: string;
  }) => api.get("/admin/audit-log", { params }),
};

// ═══ Uploads API ═══
export const uploadsApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);          // ✅ was "image", backend expects "file"
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

// ─── MEAL PACKAGES API (P1.5) ───────────────────────────────
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


// ═══ Addresses API ═══
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

// ═══ Areas API (P1.6 — Apr 27, 2026) ═══
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
    api.patch(`/areas/admin/requests/${id}/reject`, { reason }),
};

// ═══ Pincode Lookup (India Post API — free, no key) ═══
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
