"use client";

import { useState, useEffect } from "react";
import { MenuCardSkeleton } from "@/components/ui/Skeleton";
import { AlertCircle, Plus, Minus, Leaf, Star, ShoppingCart } from "lucide-react";
import api from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";
import { formatCurrency, getInitials, cn } from "@/lib/utils";

interface ChefWithMenu {
  id: string;
  user: { name?: string; lastName?: string; last_name?: string; email?: string };
  cuisines?: string[];
  rating?: number;
  total_reviews?: number;
  is_veg_only?: boolean;
  menuItems: any[];
}

export default function OrderFoodPanel() {
  const [chefsWithMenu, setChefsWithMenu] = useState<ChefWithMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, items, openCart, totalItems } = useCartStore();

  useEffect(() => {
    const fetchCooksAndMenus = async () => {
      try {
        setLoading(true);
        // Fetch all verified cooks
        const { data } = await api.get("/cooks");
        const raw = data?.data ?? data;
        const cooks = Array.isArray(raw) ? raw : raw?.cooks ?? raw?.data ?? [];

        // Fetch menu for each cook in parallel
        const results = await Promise.allSettled(
          cooks.map(async (cook: any) => {
            try {
              const { data: menuData } = await api.get(`/cooks/${cook.id}/menu`);
              const items = menuData?.data ?? menuData;
              return { ...cook, menuItems: Array.isArray(items) ? items : [] };
            } catch {
              return { ...cook, menuItems: [] };
            }
          })
        );

        const chefsData = results
          .filter((r): r is PromiseFulfilledResult<ChefWithMenu> => r.status === "fulfilled")
          .map((r) => r.value)
          .filter((c) => c.menuItems.length > 0); // Only show chefs with menu items

        setChefsWithMenu(chefsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCooksAndMenus();
  }, []);

  function getItemQty(itemName: string) {
    return items.find((i) => i.name === itemName)?.qty || 0;
  }

  function handleAddToCart(item: any, chefEmail: string, chefName: string, chefId: string) {
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
          <p className="text-[0.9rem] text-red-400">Could not load menus. Please try again.</p>
        </div>
      )}

      {!loading && !error && chefsWithMenu.length === 0 && (
        <div className="bg-white rounded-[16px] p-12 border border-[rgba(212,114,26,0.06)] text-center text-[var(--text-muted)] mt-5">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[0.9rem] font-semibold mb-1">No chefs with menus available yet</p>
          <p className="text-[0.82rem]">Chefs need to add menu items first. Check back soon!</p>
        </div>
      )}

      {!loading && !error && chefsWithMenu.length > 0 && (
        <div className="space-y-6 mt-5">
          {chefsWithMenu.map((chef) => {
            const chefName = `${chef.user?.name || ""} ${chef.user?.lastName || chef.user?.last_name || ""}`.trim() || "Chef";
            const chefEmail = chef.user?.email || chef.id;
            const ini = getInitials(chef.user?.name, chef.user?.lastName || chef.user?.last_name);
            const rating = parseFloat(chef.rating as any) || 0;

            // Group menu items by category
            const categories: Record<string, any[]> = {};
            chef.menuItems.forEach((item: any) => {
              const cat = (item.category || "main_course").replace(/_/g, " ");
              if (!categories[cat]) categories[cat] = [];
              categories[cat].push(item);
            });

            return (
              <div key={chef.id} className="bg-white rounded-[16px] border border-[rgba(212,114,26,0.06)] overflow-hidden">
                {/* Chef header */}
                <div className="p-5 bg-gradient-to-r from-[rgba(212,114,26,0.04)] to-transparent border-b border-[rgba(212,114,26,0.06)]">
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
                          <span className="text-[var(--text-muted)]">({chef.total_reviews || 0})</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-[var(--green-ok)] bg-[rgba(34,197,94,0.1)] px-2 py-0.5 rounded-full mt-1">
                          ✨ New chef
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu items grouped by category */}
                <div className="p-5">
                  {Object.entries(categories).map(([category, catItems]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <h4 className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 capitalize">{category}</h4>
                      <div className="space-y-3">
                        {catItems.map((item: any) => {
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
                                <button onClick={() => handleAddToCart(item, chefEmail, chefName, chef.id)}
                                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[0.78rem] font-semibold text-[var(--orange-500)] bg-[rgba(212,114,26,0.08)] border border-[rgba(212,114,26,0.15)] cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]"
                                  style={{ fontFamily: "var(--font-body)" }}>
                                  <Plus className="w-3.5 h-3.5" /> Add
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => useCartStore.getState().changeQty(item.name, -1)}
                                    className="w-7 h-7 rounded-full border border-[rgba(212,114,26,0.15)] bg-transparent flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--orange-500)] hover:text-white hover:border-[var(--orange-500)]">
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="font-bold text-[0.85rem] min-w-[18px] text-center">{qty}</span>
                                  <button onClick={() => handleAddToCart(item, chefEmail, chefName, chef.id)}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
