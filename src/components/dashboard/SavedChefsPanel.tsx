"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, Star, BadgeCheck, RefreshCw } from "lucide-react";
import { favoritesApi } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

type Chef = {
  id: string;
  rating?: number | string;
  cuisines?: string[];
  is_verified?: boolean;
  total_bookings?: number;
  user?: { name?: string; lastName?: string; avatar?: string };
};

export default function SavedChefsPanel() {
  const { setPanel } = useUIStore();
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await favoritesApi.list();
      const list = (res.data as any)?.data ?? res.data;
      setChefs(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load your saved chefs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  async function remove(cookId: string) {
    if (removingId) return;
    setRemovingId(cookId);
    const prev = chefs;
    setChefs((c) => c.filter((x) => x.id !== cookId)); // optimistic
    try {
      await favoritesApi.toggle(cookId);
    } catch {
      setChefs(prev); // roll back
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-[0.9rem] text-[var(--text-muted)] mb-3">{error}</p>
        <button
          onClick={fetchSaved}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.85rem] bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] cursor-pointer hover:bg-[rgba(0,0,0,0.06)]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (chefs.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-[rgba(212,114,26,0.08)] flex items-center justify-center mx-auto mb-4">
          <Heart className="w-7 h-7 text-[var(--orange-500)]" />
        </div>
        <div className="font-display text-[1.15rem] font-[900] text-[var(--brown-800)] mb-1">
          No saved chefs yet
        </div>
        <p className="text-[0.88rem] text-[var(--text-muted)] mb-5">
          Tap the heart on any chef to save them here for quick booking later.
        </p>
        <button
          onClick={() => setPanel("book-chef")}
          className="px-4 py-2.5 rounded-[12px] bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] cursor-pointer hover:opacity-95"
        >
          Browse chefs
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[0.88rem] text-[var(--text-muted)] mb-5">
        {chefs.length} saved {chefs.length === 1 ? "chef" : "chefs"}. Tap the heart to remove.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {chefs.map((chef) => {
          const name = `${chef.user?.name || ""} ${chef.user?.lastName || ""}`.trim() || "Chef";
          const rating = Number(chef.rating) || 0;
          return (
            <div
              key={chef.id}
              className="bg-white rounded-[16px] overflow-hidden border border-[rgba(212,114,26,0.06)]"
            >
              <div className="h-[90px] bg-gradient-to-br from-[#FFE4B5] to-[#FFB347] flex items-center justify-center relative">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center font-bold text-[var(--orange-500)] text-[1.1rem]">
                  {getInitials(name)}
                </div>
                <button
                  onClick={() => remove(chef.id)}
                  disabled={removingId === chef.id}
                  aria-label="Remove from saved"
                  className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center cursor-pointer border-none hover:bg-white disabled:opacity-60"
                >
                  <Heart className="w-4 h-4" fill="#a43700" stroke="#a43700" />
                </button>
              </div>
              <div className="p-4">
                <div className="font-bold text-[0.95rem] mb-0.5 flex items-center gap-1.5">
                  {name}
                  {chef.is_verified && <BadgeCheck className="w-4 h-4 text-[var(--green-ok)]" />}
                </div>
                <div className="text-[0.8rem] text-[var(--text-muted)] mb-2">
                  {chef.cuisines?.join(", ") || "Home Cooking"}
                </div>
                {rating > 0 && (
                  <div className="flex items-center gap-1 text-[0.8rem] mb-3">
                    <Star className="w-3.5 h-3.5 fill-[#F5A623] text-[#F5A623]" />
                    <span className="font-semibold">{rating.toFixed(1)}</span>
                  </div>
                )}
                <button
                  onClick={() => setPanel("book-chef")}
                  className="w-full py-2 rounded-[10px] text-[0.82rem] font-semibold text-[var(--orange-500)] bg-[rgba(212,114,26,0.08)] border-none cursor-pointer hover:bg-[rgba(212,114,26,0.14)]"
                >
                  Book this chef
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
