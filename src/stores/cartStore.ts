import { create } from "zustand";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  chefEmail: string;
  chefName: string;
  isOpen: boolean;

  addItem: (name: string, price: number, chefEmail: string, chefName: string) => void;
  changeQty: (name: string, delta: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Derived
  totalItems: () => number;
  subtotal: () => number;
  deliveryFee: number;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  chefEmail: "",
  chefName: "",
  isOpen: false,
  deliveryFee: 40,

  addItem: (name, price, chefEmail, chefName) => {
    const state = get();
    // If items from a different chef, confirm or clear
    if (state.items.length > 0 && state.chefEmail !== chefEmail) {
      const confirmed = window.confirm(
        `Your cart has items from ${state.chefName}. Clear cart and add from ${chefName}?`
      );
      if (!confirmed) return;
      set({ items: [], chefEmail: "", chefName: "" });
    }

    set((s) => {
      const existing = s.items.find((i) => i.name === name);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.name === name ? { ...i, qty: i.qty + 1 } : i
          ),
          chefEmail,
          chefName,
        };
      }
      return {
        items: [...s.items, { name, price, qty: 1 }],
        chefEmail,
        chefName,
      };
    });
  },

  changeQty: (name, delta) => {
    set((s) => {
      const updated = s.items
        .map((i) => (i.name === name ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0);
      return {
        items: updated,
        ...(updated.length === 0 ? { chefEmail: "", chefName: "" } : {}),
      };
    });
  },

  clearCart: () =>
    set({ items: [], chefEmail: "", chefName: "" }),

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  total: () => {
    const sub = get().items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return sub > 0 ? sub + get().deliveryFee : 0;
  },
}));
