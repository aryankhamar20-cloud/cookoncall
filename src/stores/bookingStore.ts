import { create } from "zustand";
import type { Cook, Booking } from "@/types";
import type { BookingFormData } from "@/components/modals/BookingModal";

interface BookingState {
  // Chef being booked
  selectedChef: Cook | null;
  setSelectedChef: (chef: Cook | null) => void;

  // Booking form data (from BookingModal)
  bookingFormData: BookingFormData | null;
  setBookingFormData: (data: BookingFormData | null) => void;

  // Active booking (for cancel/review)
  activeBooking: Booking | null;
  setActiveBooking: (booking: Booking | null) => void;

  // Modal visibility
  showBookingModal: boolean;
  showPaymentModal: boolean;
  showCancelModal: boolean;
  showReviewModal: boolean;

  openBookingModal: (chef: Cook) => void;
  openPaymentModal: (data: BookingFormData) => void;
  openCancelModal: (booking: Booking) => void;
  openReviewModal: (booking: Booking) => void;
  closeAllModals: () => void;

  // Review target
  reviewChefName: string;
  reviewBookingId: string;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedChef: null,
  setSelectedChef: (chef) => set({ selectedChef: chef }),

  bookingFormData: null,
  setBookingFormData: (data) => set({ bookingFormData: data }),

  activeBooking: null,
  setActiveBooking: (booking) => set({ activeBooking: booking }),

  showBookingModal: false,
  showPaymentModal: false,
  showCancelModal: false,
  showReviewModal: false,

  reviewChefName: "",
  reviewBookingId: "",

  openBookingModal: (chef) =>
    set({
      selectedChef: chef,
      showBookingModal: true,
      showPaymentModal: false,
      showCancelModal: false,
      showReviewModal: false,
    }),

  openPaymentModal: (data) =>
    set({
      bookingFormData: data,
      showBookingModal: false,
      showPaymentModal: true,
    }),

  openCancelModal: (booking) =>
    set({
      activeBooking: booking,
      showCancelModal: true,
      showBookingModal: false,
      showPaymentModal: false,
      showReviewModal: false,
    }),

  openReviewModal: (booking) => {
    const cookName = booking.cook
      ? `${booking.cook.user?.name || ""} ${booking.cook.user?.lastName || ""}`.trim()
      : "Chef";
    set({
      activeBooking: booking,
      reviewChefName: cookName,
      reviewBookingId: booking.id,
      showReviewModal: true,
      showBookingModal: false,
      showPaymentModal: false,
      showCancelModal: false,
    });
  },

  closeAllModals: () =>
    set({
      showBookingModal: false,
      showPaymentModal: false,
      showCancelModal: false,
      showReviewModal: false,
      selectedChef: null,
      bookingFormData: null,
      activeBooking: null,
    }),
}));
