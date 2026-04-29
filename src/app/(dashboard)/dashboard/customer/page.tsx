"use client";

import {
  Home,
  Users,
  ShoppingCart,
  CalendarCheck,
  User,
  Settings as SettingsIcon,
  LifeBuoy,
} from "lucide-react";
import DashboardLayout, { type SidebarSection } from "@/components/layout/DashboardLayout";
import { useUIStore } from "@/stores/uiStore";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import CustomerHome from "@/components/dashboard/CustomerHome";
import BookChefPanel from "@/components/dashboard/BookChefPanel";
import OrderFoodPanel from "@/components/dashboard/OrderFoodPanel";
import OrdersPanel from "@/components/dashboard/OrdersPanel";
import ProfilePanel from "@/components/dashboard/ProfilePanel";
import SettingsPanel from "@/components/dashboard/SettingsPanel";
import HelpSupportPanel from "@/components/dashboard/HelpSupportPanel";
import CartDrawer from "@/components/dashboard/CartDrawer";
import NotificationBell from "@/components/dashboard/NotificationBell";
import BookingModal from "@/components/modals/BookingModal";
import { useBookingStore } from "@/stores/bookingStore";

const titles: Record<string, string> = {
  home: "Home",
  "book-chef": "Book a Chef",
  "order-food": "Order Food",
  orders: "My Bookings",
  profile: "My Profile",
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
      ],
    },
    {
      title: "Account",
      links: [
        { id: "profile", label: "My Profile", icon: <User className="w-5 h-5" /> },
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