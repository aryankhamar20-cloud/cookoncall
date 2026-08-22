import { create } from "zustand";
import type { Cook } from "@/types";

// Cross-panel handoff store: CustomerHome (and anywhere else outside the
// "Book a Chef" panel) calls openBookingModal(chef) + navigates to the
// book-chef panel; BookChefPanel picks up selectedChef/showBookingModal on
// mount and opens its own local booking modal, then calls closeAllModals()
// to clear the flag so a refresh doesn't re-open it.
//
// Payment, cancel, and review are no longer orchestrated through this
// store — each now lives as local state on the panel that renders it
// (PaymentModal + ReviewModal in OrdersPanel; cancellation is inline in
// OrdersPanel with no modal component). This store used to also carry
// bookingFormData/activeBooking/showPaymentModal/showCancelModal/
// showReviewModal/openPaymentModal/openCancelModal/openReviewModal/
// reviewChefName/reviewBookingId for that older single-store-drives-every-
// modal design; removed as dead code once every consumer had moved to
// local state.
interface BookingState {
  // Chef being booked
  selectedChef: Cook | null;

  // Modal visibility
  showBookingModal: boolean;

  openBookingModal: (chef: Cook) => void;
  closeAllModals: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedChef: null,
  showBookingModal: false,

  openBookingModal: (chef) =>
    set({
      selectedChef: chef,
      showBookingModal: true,
    }),

  closeAllModals: () =>
    set({
      showBookingModal: false,
      selectedChef: null,
    }),
}));
