"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, AlertCircle, Repeat, CalendarClock } from "lucide-react";
import { subscriptionsApi } from "@/lib/api";

type Sub = {
  id: string;
  cadence: "weekly" | "biweekly" | "monthly";
  days_of_week: number[];
  time_slot: string;
  status: "active" | "paused" | "cancelled";
  price_per_session: string | number;
  next_run_at: string | null;
  user?: { name?: string };
  cook?: { user?: { name?: string } };
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Rough sessions/month by cadence, for an MRR estimate.
const SESSIONS_PER_MONTH: Record<string, number> = { weekly: 4.33, biweekly: 2.17, monthly: 1 };

function money(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return "₹" + (isNaN(n) ? 0 : Math.round(n)).toLocaleString("en-IN");
}
function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function AdminSubscriptionsPanel() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await subscriptionsApi.adminList({ limit: 100 });
      const r = data.data || data;
      setSubs(Array.isArray(r?.subscriptions) ? r.subscriptions : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const active = subs.filter((s) => s.status === "active");
  const mrr = active.reduce((sum, s) => {
    const perDays = (s.days_of_week?.length || 1) * (SESSIONS_PER_MONTH[s.cadence] || 4.33);
    return sum + Number(s.price_per_session || 0) * perDays;
  }, 0);

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[1.1rem] font-bold flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[var(--orange-400)]" /> Subscriptions
          </h2>
          <p className="text-[0.82rem] text-white/50 mt-0.5">Recurring meal-plan subscriptions across the platform.</p>
        </div>
        <button onClick={fetchSubs} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.82rem] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50">Active</div>
          <div className="text-[1.3rem] font-bold mt-1">{active.length}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50">Total</div>
          <div className="text-[1.3rem] font-bold mt-1">{subs.length}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50">Est. MRR</div>
          <div className="text-[1.3rem] font-bold text-[var(--orange-400)] mt-1">{money(mrr)}</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[0.85rem] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/50"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : subs.length === 0 ? (
        <div className="text-white/50 text-[0.88rem] py-10 text-center">No subscriptions yet.</div>
      ) : (
        <div className="space-y-2">
          {subs.map((s) => {
            const days = [...(s.days_of_week || [])].sort().map((d) => DAY_LABELS[d]).join(", ");
            const statusColor =
              s.status === "active" ? "bg-emerald-500/15 text-emerald-300" :
              s.status === "paused" ? "bg-amber-500/15 text-amber-300" :
              "bg-white/10 text-white/50";
            return (
              <div key={s.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-[0.9rem]">
                    {s.user?.name || "Customer"} <span className="text-white/40">→</span> {s.cook?.user?.name || "Chef"}
                  </div>
                  <div className="text-[0.74rem] text-white/50 mt-0.5 flex items-center gap-1.5">
                    <CalendarClock className="w-3 h-3" />
                    {s.cadence} · {days} · {s.time_slot} · {money(s.price_per_session)}/session
                    {s.status === "active" && <span>· next {fmt(s.next_run_at)}</span>}
                  </div>
                </div>
                <span className={`text-[0.72rem] px-2 py-1 rounded-full font-semibold ${statusColor}`}>{s.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
