// ═══ User Types ═══

export type UserRole = "user" | "cook" | "admin";

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  initials: string;
  avatar?: string;
  isPhoneVerified: boolean;
  email_verified?: boolean;
  googleId?: string;
  createdAt: string;

  // Address & geolocation
  address?: string;
  latitude?: number;
  longitude?: number;
}

// ═══ Cook Types ═══

export type VerificationStatus = "not_submitted" | "pending" | "approved" | "rejected";

export interface Cook {
  id: string;
  userId?: string;
  user_id?: string;
  user: User;
  bio: string;
  location?: { lat: number; lng: number };
  city?: string;
  pincode?: string;
  cuisines: string[];
  pricePerSession?: number;
  price_per_session?: string | number;
  rating: number | string;
  totalReviews?: number;
  total_reviews?: number;
  totalBookings?: number;
  total_bookings?: number;
  isAvailable?: boolean;
  is_available?: boolean;
  isVerified?: boolean;
  is_verified?: boolean;
  isVegOnly?: boolean;
  is_veg_only?: boolean;
  service_roles?: string[]; // ['home_cook'] | ['delivery'] | ['home_cook','delivery']
  // P1.6 — service area model
  service_area_slugs?: string[];
  serves_all_city?: boolean;
  service_area_fees?: Record<string, number>; // slug → ₹49 or ₹79
  experience?: string;
  specialties?: string;
  menuItems?: MenuItem[];

  // Verification fields
  verification_status?: VerificationStatus;
  verification_rejection_reason?: string;
  aadhaar_url?: string;
  pan_url?: string;
  address_proof_url?: string;
  fssai_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  terms_accepted?: boolean;
  verified_at?: string;

  created_at?: string;
}

export interface MenuItem {
  id: string;
  cookId: string;
  name: string;
  price: number;
  type: "veg" | "nonveg";
  category: string;
  description: string;
  image?: string;
  is_available?: boolean;
}

// ═══ Booking Types ═══
//
// IMPORTANT: backend uses lowercase snake_case for status values
// (see modules/bookings/booking.entity.ts in cookoncall-backend).
// The frontend must match exactly — do NOT use uppercase.
export type BookingStatus =
  | "pending_chef_approval"   // Apr 21 new flow — chef has 3hr to respond
  | "awaiting_payment"        // Apr 21 new flow — chef accepted; customer has 3hr to pay
  | "pending"                 // LEGACY — kept only for old DB rows not yet migrated
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled_by_user"
  | "cancelled_by_cook"
  | "expired";

export type BookingType = "booking" | "delivery";

export interface Booking {
  id: string;
  userId: string;
  cookId: string;
  cook: Cook;
  user: User;
  type: BookingType;
  status: BookingStatus;
  scheduledAt: string;
  address: string;
  dishes: string;
  instructions: string;
  durationHours: number;
  guests: string;
  subtotal?: number;
  totalPrice: number;
  platformFee: number;
  visit_fee?: number;
  chef_cancellation_fee?: number;
  payment?: Payment;
  review?: Review;

  // Selected menu items (JSON array from backend)
  order_items?: Array<{ menuItemId: string; name: string; qty: number; price: number }>;

  // Cooking session OTP fields
  start_otp?: string;
  start_otp_expires_at?: string;
  end_otp?: string;
  end_otp_expires_at?: string;
  actual_duration_minutes?: number;

  // Cancellation
  cancellation_reason?: string;
  refund_amount?: number;

  // New flow (Apr 21) timestamps
  chef_responded_at?: string;      // when chef accepted or rejected
  payment_expires_at?: string;     // chef_responded_at + 3hr
  rejection_reason?: string;       // internal — backend strips for customer GETs
  expired_at?: string;

  // Timestamps
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  createdAt: string;


  package_id?: string;
  is_package_booking?: boolean;
  selected_categories?: Array<{
    categoryId: string;
    categoryName: string;
    selectedDishes: Array<{ id: string; name: string; type: string }>;
  }>;
  selected_addons?: Array<{ addonId: string; name: string; price: number }>;
  ingredient_reminder_sent?: boolean;
}

export interface PackageSelectionPayload {
  packageId: string;
  packageName: string;
  guestCount: number;
  dishSummary: string;
  totalAmount: number;
  selectedCategories: Array<{ categoryId: string; dishIds: string[] }>;
  selectedAddonIds: string[];
}
// ═══ Payment Types ═══

export type PaymentStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "RELEASED" | "REFUNDED" | "FAILED";
export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "cod";

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  releasedAt?: string;
  createdAt: string;
}

// ═══ Review Types ═══

export interface Review {
  id: string;
  bookingId: string;
  userId: string;
  cookId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

// ═══ Notification Types ═══

export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "booking_started"
  | "booking_accepted"
  | "booking_declined"
  | "booking_expired"
  | "payment_reminder"
  | "review_received"
  | "review_prompt"
  | "cook_verified"
  | "cook_rejected"
  | "payment_received"
  | "general";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// ═══ Cart Types ═══

export interface CartItem {
  menuItemId: string; // UUID — required for order_items payload to backend
  name: string;
  price: number;
  qty: number;
}

// ═══ API Types ═══

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ═══ Search / Filter Types ═══

export interface CookSearchParams {
  city?: string;
  cuisine?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  vegOnly?: boolean;
  sortBy?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface AdminStats {
  totalUsers: number;
  totalCustomers: number;
  totalCooks: number;
  verifiedCooks: number;
  pendingCooks: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  platformFee: number;
}

// ═══ Verification Status Response ═══

export interface VerificationStatusResponse {
  verification_status: VerificationStatus;
  is_verified: boolean;
  rejection_reason: string | null;
  aadhaar_uploaded: boolean;
  pan_uploaded: boolean;
  address_proof_uploaded: boolean;
  fssai_uploaded: boolean;
  emergency_contact_set: boolean;
  terms_accepted: boolean;
  profile_photo_set: boolean;
}

// ═══ Cancellation Refund Estimate ═══

export interface RefundEstimate {
  refund_amount: number;
  total_price: number;
  hours_until_session: number;
  policy: string;
}

// ═══ Address Types ═══

export type AddressLabel = "home" | "work" | "other";

export interface Address {
  id: string;
  user_id: string;
  label: AddressLabel;
  contact_name?: string | null;
  contact_phone?: string | null;
  house_no: string;
  street: string;
  landmark?: string | null;
  area: string;
  area_slug?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  label: AddressLabel;
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
}

export const ADDRESS_LABELS: { value: AddressLabel; label: string; emoji: string }[] = [
  { value: "home", label: "Home", emoji: "🏠" },
  { value: "work", label: "Work", emoji: "🏢" },
  { value: "other", label: "Other", emoji: "📍" },
];

/** Format a saved address into a single readable line (used as booking.address snapshot) */
export function formatAddressLine(a: Address | AddressFormData): string {
  const parts = [
    a.house_no,
    a.street,
    a.landmark,
    a.area,
    `${a.city} - ${a.pincode}`,
    a.state,
  ].filter((p) => p && String(p).trim().length > 0);
  return parts.join(", ");
}

// ═══ Chef Specialties (predefined list) ═══

export const CUISINE_OPTIONS = [
  "Gujarati",
  "Punjabi",
  "South Indian",
  "Rajasthani",
  "Bengali",
  "Mughlai",
  "Chinese",
  "Italian",
  "Continental",
  "Thai",
  "Mexican",
  "Japanese",
  "Street Food",
  "Bakery & Desserts",
  "Healthy / Diet Food",
  "Jain",
  "Vegan",
] as const;

// ═══ Meal Package Types (P1.5) ═══

export interface PackageCategoryDish {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  type: "veg" | "non_veg";
  image?: string;
  sort_order: number;
  is_available: boolean;
  created_at: string;
}

export interface PackageCategory {
  id: string;
  package_id: string;
  name: string;
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  sort_order: number;
  dishes: PackageCategoryDish[];
  created_at: string;
}

export interface PackageAddon {
  id: string;
  package_id: string;
  name: string;
  price: number;
  type: "veg" | "non_veg";
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface MealPackage {
  id: string;
  cook_id: string;
  name: string;
  description?: string;
  price_2: number;
  price_3: number;
  price_4: number;
  price_5: number;
  extra_person_charge: number;
  is_veg: boolean;
  is_active: boolean;
  cuisine?: string;
  ingredient_note?: string;
  price_lock_days: number;
  categories: PackageCategory[];
  addons: PackageAddon[];
  created_at: string;
  updated_at: string;
}

