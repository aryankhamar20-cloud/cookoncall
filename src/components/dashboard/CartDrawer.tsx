"use client";

import { useCartStore } from "@/stores/cartStore";
import { cn, formatCurrency } from "@/lib/utils";
import { X, Minus, Plus } from "lucide-react";

export default function CartDrawer() {
  const {
    items,
    chefName,
    isOpen,
    closeCart,
    changeQty,
    subtotal,
    deliveryFee,
    total,
  } = useCartStore();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/40"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 w-[380px] max-w-[90vw] h-screen bg-white z-[301] shadow-[-8px_0_40px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="px-[22px] py-5 border-b border-[rgba(212,114,26,0.08)] flex items-center justify-between">
          <h3 className="font-display text-[1.3rem] font-[800]">Your Cart</h3>
          <button
            onClick={closeCart}
            className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-[22px] py-4">
          {items.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)] text-[0.9rem]">
              Your cart is empty. Browse chef menus to add items!
            </div>
          ) : (
            <>
              {chefName && (
                <div className="text-[0.82rem] text-[var(--text-muted)] mb-3">
                  Chef: <strong>{chefName}</strong>
                </div>
              )}
              {items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 py-3 border-b border-[rgba(0,0,0,0.04)] last:border-none"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[0.9rem]">{item.name}</div>
                    <div className="text-[0.82rem] text-[var(--text-muted)]">
                      {formatCurrency(item.price)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => changeQty(item.name, -1)}
                      className="w-7 h-7 rounded-full border border-[rgba(212,114,26,0.1)] bg-transparent flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-[0.9rem] min-w-[20px] text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => changeQty(item.name, 1)}
                      className="w-7 h-7 rounded-full border border-[rgba(212,114,26,0.1)] bg-transparent flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-bold min-w-[50px] text-right">
                    {formatCurrency(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-[22px] py-[18px] border-t border-[rgba(212,114,26,0.08)]">
            <div className="flex justify-between text-[0.9rem] mb-1.5">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal())}</span>
            </div>
            <div className="flex justify-between text-[0.9rem] mb-1.5">
              <span>Delivery Fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-[1.05rem] mt-2 pt-2 border-t border-[rgba(212,114,26,0.08)]">
              <span>Total</span>
              <span className="text-[var(--orange-500)]">
                {formatCurrency(total())}
              </span>
            </div>

            <div className="mt-3">
              <label className="block font-semibold text-[0.82rem] mb-1.5">
                Delivery Address
              </label>
              <input
                type="text"
                placeholder="Enter your full address in Ahmedabad"
                className="w-full px-3.5 py-2.5 border-[1.5px] border-[var(--cream-300)] rounded-[12px] text-[0.88rem] outline-none focus:border-[var(--orange-500)]"
                style={{ fontFamily: "var(--font-body)" }}
              />
            </div>

            <button
              className="w-full mt-4 py-3.5 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-[0.95rem] cursor-pointer transition-all hover:bg-[var(--orange-400)]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Proceed to Payment
            </button>
          </div>
        )}
      </div>
    </>
  );
}
