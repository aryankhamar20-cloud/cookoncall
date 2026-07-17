"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  CalendarClock,
  Pause,
  Play,
  X,
  Repeat,
} from "lucide-react";
import { subscriptionsApi } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";

type Sub = {
  id: string;
  cadence: "weekly" | "biweekly" | "monthly";
  days_of_week: number[];
  time_slot: string;
  status: "active" | "paused" | "cancelled";
  price_per_session: string | number;
  next_run_at: string | null;
  cook?: { user?: { name?: string } };
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function money(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return "₹" + (isNaN(n) ? 0 : n).toLocaleString("en-IN");
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SubscriptionsPanel() {
  const { setPanel } = useUIStore();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await subscriptionsApi.mine();
      const list = (res.data as any)?.data ?? res.data;
      setSubs(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load your subscriptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  async function act(id: string, action: "pause" | "resume" | "cancel") {
    if (busyId) return;
    if (action === "cancel" && !window.confirm("Cancel this subscription? Upcoming sessions will stop.")) return;
    setBusyId(id);
    try {
      await subscriptionsApi[action](id);
      await fetchSubs();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Action failed. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error && subs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-[0.9rem] text-[var(--text-muted)] mb-3">{error}</p>
        <button onClick={fetchSubs} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.85rem] bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] cursor-pointer hover:bg-[rgba(0,0,0,0.06)]">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-[rgba(212,114,26,0.08)] flex items-center justify-center mx-auto mb-4">
          <Repeat className="w-7 h-7 text-[var(--orange-500)]" />
        </div>
        <div className="font-display text-[1.15rem] font-[900] text-[var(--brown-800)] mb-1">No subscriptions yet</div>
        <p className="text-[0.88rem] text-[var(--text-muted)] mb-5">
          Book a chef, then choose &ldquo;Make it recurring&rdquo; to have your favourite meals cooked on a schedule.
        </p>
        <button onClick={() => setPanel("book-chef")} className="px-4 py-2.5 rounded-[12px] bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] cursor-pointer hover:opacity-95">
          Book a chef
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {error && <div className="text-[0.85rem] text-red-600 mb-4">{error}</div>}
      <div className="space-y-3">
        {subs.map((s) => {
          const days = [...s.days_of_week].sort().map((d) => DAY_LABELS[d]).join(", ");
          const cadence = s.cadence.charAt(0).toUpperCase() + s.cadence.slice(1);
          const statusColor =
            s.status === "active" ? "text-emerald-600 bg-emerald-50" :
            s.status === "paused" ? "text-amber-600 bg-amber-50" :
            "text-[var(--text-muted)] bg-[rgba(0,0,0,0.04)]";
          return (
            <div key={s.id} className="bg-white rounded-[16px] p-5 border border-[rgba(212,114,26,0.06)]">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-[0.98rem] flex items-center gap-2">
                    {s.cook?.user?.name || "Chef"}
                    <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{s.status}</span>
                  </div>
                  <div className="text-[0.83rem] text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {cadence} · {days} · {s.time_slot}
                  </div>
                  {s.status === "active" && (
                    <div className="text-[0.78rem] text-[var(--text-muted)] mt-1">
                      Next session: {fmtDateTime(s.next_run_at)}
                    </div>
                  )}
                  {Number(s.price_per_session) > 0 && (
                    <div className="text-[0.78rem] text-[var(--brown-800)] mt-0.5">
                      {money(s.price_per_session)} / session
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {s.status === "active" && (
                    <button onClick={() => act(s.id, "pause")} disabled={busyId === s.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold text-amber-700 bg-amber-50 border-none cursor-pointer hover:bg-amber-100 disabled:opacity-60">
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  {s.status === "paused" && (
                    <button onClick={() => act(s.id, "resume")} disabled={busyId === s.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold text-emerald-700 bg-emerald-50 border-none cursor-pointer hover:bg-emerald-100 disabled:opacity-60">
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  {s.status !== "cancelled" && (
                    <button onClick={() => act(s.id, "cancel")} disabled={busyId === s.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold text-[var(--text-muted)] bg-[rgba(0,0,0,0.03)] border-none cursor-pointer hover:bg-[rgba(0,0,0,0.06)] disabled:opacity-60">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
