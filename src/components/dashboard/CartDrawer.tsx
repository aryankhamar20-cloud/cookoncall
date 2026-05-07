"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { cn, formatCurrency } from "@/lib/utils";
import { X, Minus, Plus, MapPin, Clock, Loader2, ChevronRight } from "lucide-react";
import api, { addressesApi } from "@/lib/api";
import AddressCard from "@/components/ui/AddressCard";
import { formatAddressLine } from "@/types";
import type { Address } from "@/types";
import toast from "react-hot-toast";

export default function CartDrawer() {
  const {
    items,
    chefId,
    chefName,
    isOpen,
    closeCart,
    changeQty,
    clearCart,
    subtotal,
    deliveryFee,
    total,
  } = useCartStore();

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Post-booking pending screen
  const [showPending, setShowPending] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string>("");

  // Fetch addresses whenever drawer opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setAddressesLoading(true);
    addressesApi
      .getAll()
      .then((res: any) => {
        if (cancelled) return;
        const raw = res?.data?.data ?? res?.data ?? [];
        const arr: Address[] = Array.isArray(raw) ? raw : [];
        setAddresses(arr);
        // Pre-select default address
        const def = arr.find((a) => a.is_default) ?? arr[0] ?? null;
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      })
      .finally(() => {
        if (!cancelled) setAddressesLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  async function handleProceedToPayment() {
    // Guards
    if (!chefId) {
      toast.error("Cart error — chef not found. Please clear and retry.");
      return;
    }
    if (!selectedAddress) {
      toast.error("Please select a delivery address.");
      return;
    }
    if (items.length === 0) return;

    try {
      setCheckoutLoading(true);

      // scheduled_at = 2 hours from now (delivery window)
      const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const payload = {
        cook_id: chefId,
        booking_type: "food_delivery",
        scheduled_at: scheduledAt,
        duration_hours: 1,
        guests: 1,
        address: formatAddressLine(selectedAddress),
        latitude: selectedAddress.latitude ?? undefined,
        longitude: selectedAddress.longitude ?? undefined,
        customer_area_slug: selectedAddress.area_slug ?? undefined,
        order_items: items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
        instructions: `Delivery order. Items: ${items.map((i) => `${i.name} x${i.qty}`).join(", ")}`,
      };

      const { data } = await api.post("/bookings", payload);
      const booking = data?.data ?? data;
      const bookingId = booking?.id ?? booking?.booking_id ?? "";

      if (!bookingId) {
        toast.error("Could not place order. Please try again.");
        return;
      }

      clearCart();
      setPendingBookingId(bookingId);
      setShowPending(true);
      toast.success("Order request sent to chef!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  function handleClose() {
    if (checkoutLoading) return; // block close during payment
    setShowPending(false);
    closeCart();
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[300] bg-black/40" onClick={handleClose} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 w-[400px] max-w-[95vw] h-screen bg-white z-[301] shadow-[-8px_0_40px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* ── Pending screen (shown after successful booking) ── */}
        {showPending ? (
          <div className="flex flex-col h-full">
            <div className="px-6 py-5 border-b border-[rgba(212,114,26,0.08)] flex items-center justify-between">
              <h3 className="font-display text-[1.2rem] font-[800]">Order Placed!</h3>
              <button onClick={handleClose} className="bg-transparent border-none cursor-pointer p-1 text-[var(--text-muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="font-bold text-[1.1rem] mb-2">Request sent to chef!</h4>
              <p className="text-[0.85rem] text-[var(--text-muted)] mb-1">
                Booking ID: <span className="font-mono">{pendingBookingId.slice(0, 8)}</span>
              </p>
              <p className="text-[0.85rem] text-[var(--text-muted)] leading-relaxed mb-6">
                The chef has <strong>3 hours</strong> to confirm your delivery order.
                You'll get an email when they respond. Pay from <strong>My Orders</strong> once confirmed.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-full bg-[var(--orange-500)] text-white font-semibold text-[0.85rem] border-none cursor-pointer"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-[rgba(212,114,26,0.08)] flex items-center justify-between shrink-0">
              <h3 className="font-display text-[1.3rem] font-[800]">Your Cart</h3>
              <button onClick={handleClose} className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="text-center py-10 text-[var(--text-muted)] text-[0.9rem]">
                  Your cart is empty. Browse chef menus to add items!
                </div>
              ) : (
                <>
                  {/* Chef name */}
                  {chefName && (
                    <div className="text-[0.82rem] text-[var(--text-muted)] mb-3">
                      Chef: <strong>{chefName}</strong>
                    </div>
                  )}

                  {/* Cart items */}
                  {items.map((item) => (
                    <div
                      key={item.menuItemId}
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
                        <span className="font-bold text-[0.9rem] min-w-[20px] text-center">{item.qty}</span>
                        <button
                          onClick={() => changeQty(item.name, 1)}
                          className="w-7 h-7 rounded-full border border-[rgba(212,114,26,0.1)] bg-transparent flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="font-bold min-w-[52px] text-right">
                        {formatCurrency(item.price * item.qty)}
                      </div>
                    </div>
                  ))}

                  {/* Delivery address section */}
                  <div className="mt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-[var(--orange-500)]" />
                      <span className="font-semibold text-[0.88rem]">Delivery Address</span>
                    </div>

                    {addressesLoading ? (
                      <div className="flex items-center gap-2 text-[0.82rem] text-[var(--text-muted)] py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading your addresses...
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="bg-[var(--cream-100)] rounded-[12px] p-4 text-center">
                        <p className="text-[0.82rem] text-[var(--text-muted)] mb-1">No saved address found.</p>
                        <p className="text-[0.78rem] text-[var(--text-muted)]">
                          Go to <strong>Settings → Addresses</strong> to add one.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {addresses.map((addr) => (
                          <AddressCard
                            key={addr.id}
                            address={addr}
                            mode="select"
                            selected={selectedAddressId === addr.id}
                            onSelect={() => setSelectedAddressId(addr.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer — only shown when cart has items */}
            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-[rgba(212,114,26,0.08)] shrink-0">
                <div className="flex justify-between text-[0.88rem] mb-1.5">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal())}</span>
                </div>
                <div className="flex justify-between text-[0.88rem] mb-1.5">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-[1.05rem] mt-2 pt-2 border-t border-[rgba(212,114,26,0.06)]">
                  <span>Total</span>
                  <span className="text-[var(--orange-500)]">{formatCurrency(total())}</span>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={checkoutLoading || !selectedAddress}
                  className="w-full mt-4 py-3.5 border-none rounded-[12px] bg-[var(--orange-500)] text-white font-bold text-[0.95rem] cursor-pointer transition-all hover:bg-[var(--orange-400)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Placing order...
                    </>
                  ) : (
                    <>
                      Place Order · {formatCurrency(total())}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {!selectedAddress && !addressesLoading && addresses.length === 0 && (
                  <p className="text-[0.75rem] text-red-400 text-center mt-2">
                    Add a delivery address in Settings first.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
