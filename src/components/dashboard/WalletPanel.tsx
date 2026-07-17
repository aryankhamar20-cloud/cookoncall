"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Wallet, Gift, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { walletApi } from "@/lib/api";
import { useUIStore } from "@/stores/uiStore";

type Txn = {
  id: string;
  amount: string | number;
  balance_after: string | number;
  type: "referral_reward" | "referee_discount" | "refund_credit" | "booking_payment" | "adjustment";
  description: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  referral_reward: "Referral reward",
  referee_discount: "Welcome bonus",
  refund_credit: "Refund credit",
  booking_payment: "Booking payment",
  adjustment: "Adjustment",
};

function money(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return "₹" + (isNaN(n) ? 0 : Math.abs(n)).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function fmt(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function WalletPanel() {
  const { setPanel } = useUIStore();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await walletApi.get();
      const body = (res.data as any)?.data ?? res.data;
      setBalance(Number(body?.balance ?? 0));
      setTxns(Array.isArray(body?.transactions) ? body.transactions : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't load your wallet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Balance hero */}
      <div className="rounded-[24px] p-7 text-white bg-gradient-to-br from-[var(--orange-500)] to-[#8a2d00] shadow-lg">
        <div className="flex items-center gap-2 text-white/85 text-[0.85rem]">
          <Wallet className="w-4 h-4" /> Wallet balance
        </div>
        <div className="font-display text-[2.4rem] font-[900] mt-1">{money(balance)}</div>
        <p className="text-[0.82rem] text-white/80 mt-1">
          Use your balance at checkout. Referral rewards land here automatically.
        </p>
      </div>

      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="font-semibold text-[0.95rem] text-[var(--brown-800)]">Transactions</div>
        <button onClick={fetchWallet} className="flex items-center gap-1.5 text-[0.8rem] text-[var(--text-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--orange-500)]">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && <div className="text-[0.85rem] text-red-600 mb-4">{error}</div>}

      {txns.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-14 h-14 rounded-full bg-[rgba(212,114,26,0.08)] flex items-center justify-center mx-auto mb-3">
            <Gift className="w-6 h-6 text-[var(--orange-500)]" />
          </div>
          <p className="text-[0.88rem] text-[var(--text-muted)] mb-4">
            No transactions yet. Invite a friend to earn ₹100 when they complete their first booking.
          </p>
          <button onClick={() => setPanel("referrals")} className="px-4 py-2.5 rounded-[12px] bg-[var(--orange-500)] text-white font-semibold text-[0.9rem] cursor-pointer hover:opacity-95">
            Refer &amp; Earn
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {txns.map((t) => {
            const amt = Number(t.amount);
            const credit = amt >= 0;
            return (
              <div key={t.id} className="bg-white rounded-[14px] p-3.5 border border-[rgba(212,114,26,0.06)] flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${credit ? "bg-emerald-50 text-emerald-600" : "bg-[rgba(0,0,0,0.04)] text-[var(--text-muted)]"}`}>
                  {credit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[0.88rem] text-[var(--brown-800)]">{TYPE_LABEL[t.type] || t.type}</div>
                  <div className="text-[0.75rem] text-[var(--text-muted)] truncate">{t.description || fmt(t.created_at)}</div>
                </div>
                <div className={`font-bold text-[0.92rem] shrink-0 ${credit ? "text-emerald-600" : "text-[var(--brown-800)]"}`}>
                  {credit ? "+" : "−"}{money(amt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
