import { create } from "zustand";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  chefEmail: string;
  chefId: string;       // cook UUID — needed to create the booking
  chefName: string;
  isOpen: boolean;

  addItem: (
    menuItemId: string,
    name: string,
    price: number,
    chefEmail: string,
    chefName: string,
    chefId: string,
  ) => void;
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
  chefId: "",
  chefName: "",
  isOpen: false,
  deliveryFee: 40,

  addItem: (menuItemId, name, price, chefEmail, chefName, chefId) => {
    const state = get();
    // If items from a different chef, confirm or clear
    if (state.items.length > 0 && state.chefEmail !== chefEmail) {
      const confirmed = window.confirm(
        `Your cart has items from ${state.chefName}. Clear cart and add from ${chefName}?`
      );
      if (!confirmed) return;
      set({ items: [], chefEmail: "", chefId: "", chefName: "" });
    }

    set((s) => {
      const existing = s.items.find((i) => i.menuItemId === menuItemId);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.menuItemId === menuItemId ? { ...i, qty: i.qty + 1 } : i
          ),
          chefEmail,
          chefId,
          chefName,
        };
      }
      return {
        items: [...s.items, { menuItemId, name, price, qty: 1 }],
        chefEmail,
        chefId,
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
        ...(updated.length === 0 ? { chefEmail: "", chefId: "", chefName: "" } : {}),
      };
    });
  },

  clearCart: () =>
    set({ items: [], chefEmail: "", chefId: "", chefName: "" }),

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  total: () => {
    const sub = get().items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return sub > 0 ? sub + get().deliveryFee : 0;
  },
}));
