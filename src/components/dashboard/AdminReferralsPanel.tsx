"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, AlertCircle, Gift, ArrowRight } from "lucide-react";
import { adminApi } from "@/lib/api";

type Referral = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  status: "pending" | "rewarded";
  referrer_reward: string | number;
  referee_reward: string | number;
  rewarded_booking_id: string | null;
  created_at: string;
};

function money(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return "₹" + (isNaN(n) ? 0 : n).toLocaleString("en-IN");
}
function fmt(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function shortId(id: string) {
  return id ? id.slice(0, 8).toUpperCase() : "—";
}

export default function AdminReferralsPanel() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminApi.referralsList({ limit: 100 });
      const r = data.data || data;
      setReferrals(Array.isArray(r?.referrals) ? r.referrals : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const rewarded = referrals.filter((r) => r.status === "rewarded");
  const totalPaid = rewarded.reduce((s, r) => s + Number(r.referrer_reward || 0), 0);

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[1.1rem] font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-[var(--orange-400)]" /> Refer &amp; Earn
          </h2>
          <p className="text-[0.82rem] text-white/50 mt-0.5">
            Every referral, its status, and rewards paid to referrers.
          </p>
        </div>
        <button onClick={fetchReferrals} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.82rem] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50">Total referrals</div>
          <div className="text-[1.3rem] font-bold mt-1">{referrals.length}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50">Rewarded</div>
          <div className="text-[1.3rem] font-bold mt-1">{rewarded.length}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50">Rewards paid</div>
          <div className="text-[1.3rem] font-bold text-[var(--orange-400)] mt-1">{money(totalPaid)}</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[0.85rem] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/50"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : referrals.length === 0 ? (
        <div className="text-white/50 text-[0.88rem] py-10 text-center">No referrals yet.</div>
      ) : (
        <div className="space-y-2">
          {referrals.map((r) => (
            <div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-semibold text-[0.88rem] flex items-center gap-1.5">
                  <span className="font-mono text-white/80">{shortId(r.referrer_user_id)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/40" />
                  <span className="font-mono text-white/80">{shortId(r.referred_user_id)}</span>
                </div>
                <div className="text-[0.74rem] text-white/50 mt-0.5">
                  {fmt(r.created_at)} · referrer {money(r.referrer_reward)} / referee {money(r.referee_reward)}
                </div>
              </div>
              <span className={`text-[0.72rem] px-2 py-1 rounded-full font-semibold ${r.status === "rewarded" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
