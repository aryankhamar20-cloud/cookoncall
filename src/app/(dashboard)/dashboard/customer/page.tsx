"use client";

import {
  Home,
  Users,
  ShoppingCart,
  CalendarCheck,
  User,
  Settings as SettingsIcon,
  LifeBuoy,
  Gift,
  Heart,
  Repeat,
  Wallet,
} from "lucide-react";
import dynamic from "next/dynamic";
import DashboardLayout, { type SidebarSection } from "@/components/layout/DashboardLayout";
import { useUIStore } from "@/stores/uiStore";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import Skeleton from "@/components/ui/Skeleton";
import CustomerHome from "@/components/dashboard/CustomerHome";
import CartDrawer from "@/components/dashboard/CartDrawer";
import NotificationBell from "@/components/dashboard/NotificationBell";
import BookingModal from "@/components/modals/BookingModal";
import { useBookingStore } from "@/stores/bookingStore";

// "home" (CustomerHome, above) is what nearly every session opens first, so
// it stays a static import. Every other panel is a full, independent
// component that a given session may never open — they were previously all
// static imports, so all 11 were downloaded and parsed up front regardless
// of which tab (if any) got clicked (measured: /dashboard/customer was the
// heaviest route in the app, 208 kB First Load JS — see
// docs/30_GLOBAL_BRAND_AND_SEO_AUDIT.md-adjacent perf audit). next/dynamic
// defers each to when its tab is actually opened, mirroring the same fix
// already applied to /dashboard/admin (297 kB -> 154 kB, commit c2afcba).
function PanelLoadingFallback() {
  return (
    <div role="status" aria-label="Loading panel" className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
const BookChefPanel = dynamic(() => import("@/components/dashboard/BookChefPanel"), { loading: PanelLoadingFallback, ssr: false });
const OrderFoodPanel = dynamic(() => import("@/components/dashboard/OrderFoodPanel"), { loading: PanelLoadingFallback, ssr: false });
const OrdersPanel = dynamic(() => import("@/components/dashboard/OrdersPanel"), { loading: PanelLoadingFallback, ssr: false });
const ProfilePanel = dynamic(() => import("@/components/dashboard/ProfilePanel"), { loading: PanelLoadingFallback, ssr: false });
const SettingsPanel = dynamic(() => import("@/components/dashboard/SettingsPanel"), { loading: PanelLoadingFallback, ssr: false });
const HelpSupportPanel = dynamic(() => import("@/components/dashboard/HelpSupportPanel"), { loading: PanelLoadingFallback, ssr: false });
const ReferralPanel = dynamic(() => import("@/components/dashboard/ReferralPanel"), { loading: PanelLoadingFallback, ssr: false });
const WalletPanel = dynamic(() => import("@/components/dashboard/WalletPanel"), { loading: PanelLoadingFallback, ssr: false });
const SavedChefsPanel = dynamic(() => import("@/components/dashboard/SavedChefsPanel"), { loading: PanelLoadingFallback, ssr: false });
const SubscriptionsPanel = dynamic(() => import("@/components/dashboard/SubscriptionsPanel"), { loading: PanelLoadingFallback, ssr: false });

const titles: Record<string, string> = {
  home: "Home",
  "book-chef": "Book a Chef",
  "order-food": "Order Food",
  orders: "My Bookings",
  subscriptions: "Subscriptions",
  profile: "My Profile",
  wallet: "Wallet",
  saved: "Saved Chefs",
  referrals: "Refer & Earn",
  settings: "Settings",
  help: "Help & Support",
};

export default function CustomerDashboardPage() {
  const { isLoading, authorized } = useAuth({ requiredRole: "user" });
  const { activePanel } = useUIStore();
  const cartStore = useCartStore();
  const {
    showBookingModal,
    selectedChef,
    closeAllModals,
    openPaymentModal,
  } = useBookingStore();

  const sections: SidebarSection[] = [
    {
      title: "Main Menu",
      links: [
        { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
        { id: "book-chef", label: "Book a Chef", icon: <Users className="w-5 h-5" /> },
        {
          id: "order-food",
          label: "Order Food",
          icon: <ShoppingCart className="w-5 h-5" />,
          badge: cartStore.totalItems(),
        },
        { id: "orders", label: "My Bookings", icon: <CalendarCheck className="w-5 h-5" /> },
        { id: "subscriptions", label: "Subscriptions", icon: <Repeat className="w-5 h-5" /> },
        { id: "saved", label: "Saved Chefs", icon: <Heart className="w-5 h-5" /> },
      ],
    },
    {
      title: "Account",
      links: [
        { id: "profile", label: "My Profile", icon: <User className="w-5 h-5" /> },
        { id: "wallet", label: "Wallet", icon: <Wallet className="w-5 h-5" /> },
        { id: "referrals", label: "Refer & Earn", icon: <Gift className="w-5 h-5" /> },
        { id: "settings", label: "Settings", icon: <SettingsIcon className="w-5 h-5" /> },
        { id: "help", label: "Help & Support", icon: <LifeBuoy className="w-5 h-5" /> },
      ],
    },
  ];

  const headerRight = (
    <div className="flex items-center gap-2">
      <NotificationBell />
      <button
        onClick={() => cartStore.openCart()}
        className="bg-transparent border-none cursor-pointer relative p-1.5"
      >
        <ShoppingCart className="w-[22px] h-[22px] text-[var(--brown-800)]" />
        {cartStore.totalItems() > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[var(--orange-500)] text-white text-[0.6rem] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center">
            {cartStore.totalItems()}
          </span>
        )}
      </button>
    </div>
  );

  if (isLoading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream-100)]">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[0.9rem] text-[var(--text-muted)]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout
        sections={sections}
        roleLabel="Customer"
        titles={titles}
        headerRight={headerRight}
      >
        {activePanel === "home" && <CustomerHome />}
        {activePanel === "book-chef" && <BookChefPanel />}
        {activePanel === "order-food" && <OrderFoodPanel />}
        {activePanel === "orders" && <OrdersPanel />}
        {activePanel === "profile" && <ProfilePanel />}
        {activePanel === "wallet" && <WalletPanel />}
        {activePanel === "subscriptions" && <SubscriptionsPanel />}
        {activePanel === "saved" && <SavedChefsPanel />}
        {activePanel === "referrals" && <ReferralPanel />}
        {activePanel === "settings" && <SettingsPanel />}
        {activePanel === "help" && <HelpSupportPanel />}
      </DashboardLayout>

      <CartDrawer />

      <BookingModal
        isOpen={showBookingModal}
        onClose={closeAllModals}
        chef={selectedChef}
        onProceedToPayment={(data) => {
          openPaymentModal(data);
        }}
      />
    </>
  );
}