"use client";

import { useState } from "react";
import { Loader2, Wallet, Search, Plus, Minus, AlertCircle } from "lucide-react";
import { adminApi } from "@/lib/api";

type Txn = {
  id: string;
  amount: string | number;
  type: string;
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
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
}

export default function AdminWalletPanel() {
  const [userId, setUserId] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Adjustment form
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  async function lookup(id?: string) {
    const uid = (id ?? userId).trim();
    if (!uid) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await adminApi.getUserWallet(uid);
      const body = data.data || data;
      setBalance(Number(body?.balance ?? 0));
      setTxns(Array.isArray(body?.transactions) ? body.transactions : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not find that user's wallet (check the user ID).");
      setBalance(null);
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }

  async function adjust(sign: 1 | -1) {
    const amt = Math.abs(Number(adjAmount)) * sign;
    if (!userId.trim() || !amt) {
      setError("Enter a user ID and a non-zero amount.");
      return;
    }
    setAdjusting(true);
    setError("");
    try {
      await adminApi.adjustWallet(userId.trim(), { amount: amt, description: adjReason || undefined });
      setAdjAmount("");
      setAdjReason("");
      await lookup();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Adjustment failed.");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div className="text-white max-w-3xl">
      <div className="mb-5">
        <h2 className="text-[1.1rem] font-bold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[var(--orange-400)]" /> Wallets
        </h2>
        <p className="text-[0.82rem] text-white/50 mt-0.5">
          Look up a customer&apos;s wallet by their user ID (from the Users tab) and issue credits or debits.
        </p>
      </div>

      {/* Lookup */}
      <div className="flex gap-2 mb-5">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="User ID (UUID)"
          className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-white text-[0.9rem] outline-none focus:border-[var(--orange-400)] placeholder:text-white/30 font-mono"
        />
        <button onClick={() => lookup()} disabled={loading} className="px-4 py-2.5 rounded-lg text-[0.85rem] font-semibold bg-[var(--orange-500)] text-white cursor-pointer hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Look up
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[0.85rem] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {balance !== null && (
        <>
          {/* Balance + adjust */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 mb-4">
            <div className="text-[0.72rem] text-white/50">Current balance</div>
            <div className="text-[1.8rem] font-bold text-[var(--orange-400)] mt-1 mb-4">{money(balance)}</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                type="number"
                placeholder="Amount ₹"
                className="w-28 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.85rem] outline-none focus:border-[var(--orange-400)] placeholder:text-white/30"
              />
              <input
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 min-w-[140px] bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.85rem] outline-none focus:border-[var(--orange-400)] placeholder:text-white/30"
              />
              <button onClick={() => adjust(1)} disabled={adjusting} className="flex items-center gap-1 px-3 py-2 rounded-lg text-[0.82rem] font-semibold bg-emerald-500/90 text-white cursor-pointer hover:opacity-90 disabled:opacity-60">
                <Plus className="w-3.5 h-3.5" /> Credit
              </button>
              <button onClick={() => adjust(-1)} disabled={adjusting} className="flex items-center gap-1 px-3 py-2 rounded-lg text-[0.82rem] font-semibold bg-red-500/80 text-white cursor-pointer hover:opacity-90 disabled:opacity-60">
                <Minus className="w-3.5 h-3.5" /> Debit
              </button>
            </div>
          </div>

          {/* Transactions */}
          <div className="text-[0.8rem] uppercase tracking-wide text-white/40 mb-2">Transactions</div>
          {txns.length === 0 ? (
            <div className="text-white/50 text-[0.85rem] py-6 text-center">No transactions.</div>
          ) : (
            <div className="space-y-2">
              {txns.map((t) => {
                const credit = Number(t.amount) >= 0;
                return (
                  <div key={t.id} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[0.85rem]">{TYPE_LABEL[t.type] || t.type}</div>
                      <div className="text-[0.72rem] text-white/50">{t.description || fmt(t.created_at)}</div>
                    </div>
                    <div className={`font-bold text-[0.88rem] ${credit ? "text-emerald-300" : "text-white/70"}`}>
                      {credit ? "+" : "−"}{money(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
