"use client";

import { useState, useEffect, useCallback } from "react";
import { MenuCardSkeleton } from "@/components/ui/Skeleton";
import {
  AlertCircle, Plus, Minus, Leaf, Star, ShoppingCart,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";
import { formatCurrency, getInitials, cn } from "@/lib/utils";

interface ChefSummary {
  id: string;
  user: { name?: string; lastName?: string; last_name?: string; email?: string };
  cuisines?: string[];
  rating?: number;
  total_reviews?: number;
  is_veg_only?: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  price: number | string;
  type?: string;
  category?: string;
  description?: string;
}

// ─── Lazy-loaded chef card ────────────────────────────────────
// Shows chef header immediately. Menu is fetched only when user expands.
function ChefMenuCard({
  chef,
  onAddItem,
}: {
  chef: ChefSummary;
  onAddItem: (item: MenuItem, chefEmail: string, chefName: string, chefId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[] | null>(null);
  const cartItems = useCartStore((s) => s.items);

  const chefName = `${chef.user?.name || ""} ${chef.user?.lastName || chef.user?.last_name || ""}`.trim() || "Chef";
  const chefEmail = chef.user?.email || chef.id;
  const ini = getInitials(chef.user?.name, chef.user?.lastName || chef.user?.last_name);
  const rating = parseFloat(String(chef.rating ?? 0)) || 0;

  const loadMenu = useCallback(async () => {
    if (menuItems !== null) return;
    setMenuLoading(true);
    try {
      const { data } = await api.get(`/cooks/${chef.id}/menu`);
      const items = data?.data ?? data;
      setMenuItems(Array.isArray(items) ? (items as MenuItem[]) : []);
    } catch {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  }, [chef.id, menuItems]);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadMenu();
  }

  function getItemQty(itemName: string): number {
    return cartItems.find((i) => i.name === itemName)?.qty ?? 0;
  }

  const categories: Record<string, MenuItem[]> = {};
  (menuItems ?? []).forEach((item) => {
    const cat = (item.category || "main_course").replace(/_/g, " ");
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  return (
    <div className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] overflow-hidden">
      <button
        onClick={toggle}
        className="w-full p-5 bg-gradient-to-r from-[rgba(212,114,26,0.04)] to-transparent border-b border-[rgba(212,114,26,0.06)] text-left cursor-pointer"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] flex items-center justify-center font-display font-[800] text-[0.9rem] text-[rgba(0,0,0,0.3)] shrink-0">
            {ini}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[1rem]">{chefName}</span>
              {chef.is_veg_only && (
                <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                  <Leaf className="w-3 h-3" /> Pure Veg
                </span>
              )}
            </div>
            <div className="text-[0.82rem] text-[var(--text-muted)]">
              {chef.cuisines?.join(", ") || "Home Cooking"}
            </div>
            {rating > 0 ? (
              <div className="flex items-center gap-1 text-[0.78rem] text-yellow-500 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                <span>{rating.toFixed(1)}</span>
                <span className="text-[var(--text-muted)]">({chef.total_reviews ?? 0})</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-[var(--green-ok)] bg-[rgba(34,197,94,0.1)] px-2 py-0.5 rounded-full mt-1">
                ✨ New chef
              </div>
            )}
          </div>
          <div className="ml-auto text-[var(--text-muted)] shrink-0">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="p-5">
          {menuLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--orange-500)]" />
            </div>
          )}
          {!menuLoading && menuItems !== null && menuItems.length === 0 && (
            <p className="text-center text-[0.85rem] text-[var(--text-muted)] py-4">No menu items yet</p>
          )}
          {!menuLoading && menuItems !== null && menuItems.length > 0 && (
            <div className="space-y-4">
              {Object.entries(categories).map(([category, catItems]) => (
                <div key={category}>
                  <h4 className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 capitalize">{category}</h4>
                  <div className="space-y-3">
                    {catItems.map((item) => {
                      const qty = getItemQty(item.name);
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", item.type === "veg" ? "bg-green-500" : "bg-red-500")} />
                              <span className="font-semibold text-[0.9rem]">{item.name}</span>
                            </div>
                            {item.description && (
                              <p className="text-[0.78rem] text-[var(--text-muted)] mt-0.5 line-clamp-1 ml-4">{item.description}</p>
                            )}
                          </div>
                          <div className="font-bold text-[0.9rem] text-[var(--orange-500)] shrink-0 mr-2">
                            {formatCurrency(Number(item.price))}
                          </div>
                          {qty === 0 ? (
                            <button
                              onClick={() => onAddItem(item, chefEmail, chefName, chef.id)}
                              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[0.78rem] font-semibold text-[var(--orange-500)] bg-[rgba(212,114,26,0.08)] border border-[rgba(212,114,26,0.15)] cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]"
                              style={{ fontFamily: "var(--font-body)" }}>
                              <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => useCartStore.getState().changeQty(item.name, -1)}
                                className="w-7 h-7 rounded-full border border-[rgba(212,114,26,0.15)] bg-transparent flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-[0.85rem] min-w-[18px] text-center">{qty}</span>
                              <button
                                onClick={() => onAddItem(item, chefEmail, chefName, chef.id)}
                                className="w-7 h-7 rounded-full border border-[rgba(212,114,26,0.15)] bg-transparent flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────
export default function OrderFoodPanel() {
  const [chefs, setChefs] = useState<ChefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, openCart, totalItems } = useCartStore();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/cooks");
        const raw = data?.data ?? data;
        const cooks: ChefSummary[] = Array.isArray(raw) ? raw : raw?.cooks ?? raw?.data ?? [];
        setChefs(cooks);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load chefs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleAddItem(item: MenuItem, chefEmail: string, chefName: string, chefId: string) {
    addItem(item.id, item.name, Number(item.price), chefEmail, chefName, chefId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-[1.05rem]">Order Food Delivery</h2>
          <p className="text-[0.88rem] text-[var(--text-muted)] mt-1 leading-relaxed">
            Browse chef menus below. They cook at their place and deliver fresh to your door.
          </p>
        </div>
        {totalItems() > 0 && (
          <button onClick={openCart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--orange-500)] text-white text-[0.85rem] font-semibold border-none cursor-pointer transition-all hover:bg-[var(--orange-400)]"
            style={{ fontFamily: "var(--font-body)" }}>
            <ShoppingCart className="w-4 h-4" />
            Cart ({totalItems()})
          </button>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
          {[1, 2].map((i) => (<MenuCardSkeleton key={i} />))}
        </div>
      )}

      {error && (
        <div className="bg-white rounded-[16px] p-12 border border-red-100 text-center mt-5">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-[0.9rem] text-red-400">Could not load chefs. Please try again.</p>
        </div>
      )}

      {!loading && !error && chefs.length === 0 && (
        <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)] mt-5">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[0.9rem] font-semibold mb-1">No chefs available yet</p>
          <p className="text-[0.82rem]">Check back soon!</p>
        </div>
      )}

      {!loading && !error && chefs.length > 0 && (
        <div className="space-y-4 mt-5">
          <p className="text-[0.82rem] text-[var(--text-muted)]">
            Tap a chef card to browse their menu
          </p>
          {chefs.map((chef) => (
            <ChefMenuCard key={chef.id} chef={chef} onAddItem={handleAddItem} />
          ))}
        </div>
      )}
    </div>
  );
}
