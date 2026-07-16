"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Star, RefreshCw, AlertCircle, MessageSquare } from "lucide-react";
import { adminApi } from "@/lib/api";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  booking_id: string;
  customer_name: string | null;
  chef_name: string | null;
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          fill={i <= rating ? "#f59e0b" : "none"}
          stroke={i <= rating ? "#f59e0b" : "rgba(255,255,255,0.25)"}
        />
      ))}
    </div>
  );
}

export default function ReviewsPanel() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminApi.reviews({
        limit: 50,
        ...(lowOnly ? { max_rating: 3 } : {}),
      });
      const r = data.data || data;
      setReviews(Array.isArray(r.reviews) ? r.reviews : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [lowOnly]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-white font-bold text-[1.15rem] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--orange-400)]" /> Reviews
          </h2>
          <p className="text-[rgba(255,255,255,0.45)] text-[0.85rem]" style={{ fontFamily: "var(--font-body)" }}>
            Monitor customer feedback and flag low-rated bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLowOnly((v) => !v)}
            className={`px-3.5 py-2 rounded-[10px] text-[0.8rem] font-semibold border transition-all ${
              lowOnly
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)]"
            }`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {lowOnly ? "Showing ≤ 3★" : "Low ratings only"}
          </button>
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="px-3 py-2 rounded-[10px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-[10px] px-4 py-3 text-red-400 text-[0.85rem]">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--orange-400)]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-[rgba(255,255,255,0.4)] text-[0.9rem]" style={{ fontFamily: "var(--font-body)" }}>
          No reviews {lowOnly ? "≤ 3★ " : ""}yet.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-4"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Stars rating={r.rating} />
                  <span
                    className={`text-[0.78rem] font-semibold ${
                      r.rating <= 3 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {r.rating}/5
                  </span>
                </div>
                <span className="text-[0.74rem] text-[rgba(255,255,255,0.35)]">{fmtDate(r.created_at)}</span>
              </div>
              {r.comment && (
                <p
                  className="text-[0.9rem] text-[rgba(255,255,255,0.82)] mt-2 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {r.comment}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-[0.78rem] text-[rgba(255,255,255,0.5)]" style={{ fontFamily: "var(--font-body)" }}>
                <span>Customer: <span className="text-[rgba(255,255,255,0.75)]">{r.customer_name || "—"}</span></span>
                <span>Chef: <span className="text-[rgba(255,255,255,0.75)]">{r.chef_name || "—"}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
