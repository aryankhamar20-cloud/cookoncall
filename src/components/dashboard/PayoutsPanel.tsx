"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Landmark,
  IndianRupee,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { adminApi } from "@/lib/api";

type Balance = {
  cook_id: string;
  cook_name: string | null;
  total_earned: number;
  total_paid: number;
  outstanding: number;
  completed_bookings: number;
};

type Payout = {
  id: string;
  amount: string | number;
  status: "pending" | "processing" | "paid" | "failed";
  method: string | null;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  cook?: { user?: { name?: string } };
};

const METHODS = [
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function money(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return "₹" + (isNaN(n) ? 0 : n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function PayoutsPanel() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Inline "record payout" form state, keyed by cook_id
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, pRes] = await Promise.all([
        adminApi.getPayoutBalances(),
        adminApi.getPayouts({ limit: 30 }),
      ]);
      const b = (bRes.data as any)?.data ?? bRes.data;
      const p = (pRes.data as any)?.data ?? pRes.data;
      setBalances(Array.isArray(b) ? b : []);
      setPayouts(Array.isArray(p?.payouts) ? p.payouts : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function startForm(bal: Balance) {
    setOpenForm(bal.cook_id);
    setAmount(String(bal.outstanding));
    setMethod("upi");
    setReference("");
    setNotes("");
  }

  async function submitPayout(cookId: string) {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setBusyId(cookId);
    setError("");
    try {
      await adminApi.createPayout({
        cook_id: cookId,
        amount: amt,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
        mark_paid: true, // admin records money already sent
      });
      setOpenForm(null);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not record payout");
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(id: string) {
    setBusyId(id);
    setError("");
    try {
      await adminApi.markPayoutPaid(id, {});
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not mark paid");
    } finally {
      setBusyId(null);
    }
  }

  const totalOutstanding = balances.reduce((s, b) => s + b.outstanding, 0);

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[1.1rem] font-bold flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[var(--orange-400)]" /> Chef Payouts
          </h2>
          <p className="text-[0.82rem] text-white/50 mt-0.5">
            Outstanding = total earned − amount already paid. Record a payout after you transfer it.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.82rem] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Total outstanding</div>
          <div className="text-[1.3rem] font-bold text-[var(--orange-400)] mt-1">{money(totalOutstanding)}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-[0.72rem] text-white/50">Chefs owed</div>
          <div className="text-[1.3rem] font-bold mt-1">{balances.filter((b) => b.outstanding > 0.01).length}</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[0.85rem] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/50">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Balances */}
          <div className="text-[0.8rem] uppercase tracking-wide text-white/40 mb-2">Outstanding balances</div>
          <div className="space-y-2 mb-8">
            {balances.length === 0 && (
              <div className="text-white/50 text-[0.88rem] py-6 text-center">No chef earnings yet.</div>
            )}
            {balances.map((b) => (
              <div key={b.cook_id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="font-semibold">{b.cook_name || "Chef"}</div>
                    <div className="text-[0.75rem] text-white/50 mt-0.5">
                      Earned {money(b.total_earned)} · Paid {money(b.total_paid)} · {b.completed_bookings} bookings
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[0.68rem] text-white/40">Outstanding</div>
                      <div className={cn2(b.outstanding > 0.01 ? "text-[var(--orange-400)]" : "text-emerald-400", "font-bold")}>
                        {money(b.outstanding)}
                      </div>
                    </div>
                    {b.outstanding > 0.01 && openForm !== b.cook_id && (
                      <button
                        onClick={() => startForm(b)}
                        className="px-3 py-2 rounded-lg text-[0.8rem] font-semibold bg-[var(--orange-500)] text-white hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                      >
                        <IndianRupee className="w-3.5 h-3.5" /> Record payout
                      </button>
                    )}
                  </div>
                </div>

                {openForm === b.cook_id && (
                  <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-[0.78rem] text-white/60">
                      Amount (₹)
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.9rem] outline-none focus:border-[var(--orange-400)]"
                      />
                    </label>
                    <label className="text-[0.78rem] text-white/60">
                      Method
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.9rem] outline-none focus:border-[var(--orange-400)]"
                      >
                        {METHODS.map((m) => (
                          <option key={m.value} value={m.value} className="bg-[#120B07]">{m.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[0.78rem] text-white/60">
                      Reference (UTR / txn id)
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Optional"
                        className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.9rem] outline-none focus:border-[var(--orange-400)] placeholder:text-white/30"
                      />
                    </label>
                    <label className="text-[0.78rem] text-white/60">
                      Notes
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional"
                        className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.9rem] outline-none focus:border-[var(--orange-400)] placeholder:text-white/30"
                      />
                    </label>
                    <div className="sm:col-span-2 flex gap-2 justify-end">
                      <button
                        onClick={() => setOpenForm(null)}
                        className="px-3 py-2 rounded-lg text-[0.82rem] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitPayout(b.cook_id)}
                        disabled={busyId === b.cook_id}
                        className="px-4 py-2 rounded-lg text-[0.82rem] font-semibold bg-emerald-500 text-white hover:opacity-90 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {busyId === b.cook_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Record as paid
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recent payouts */}
          <div className="text-[0.8rem] uppercase tracking-wide text-white/40 mb-2">Recent payouts</div>
          <div className="space-y-2">
            {payouts.length === 0 && (
              <div className="text-white/50 text-[0.88rem] py-6 text-center">No payouts recorded yet.</div>
            )}
            {payouts.map((p) => (
              <div key={p.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-[0.9rem]">
                    {p.cook?.user?.name || "Chef"} · {money(p.amount)}
                  </div>
                  <div className="text-[0.74rem] text-white/50 mt-0.5">
                    {(p.method || "—")}{p.reference ? ` · ${p.reference}` : ""} · {fmtDate(p.paid_at || p.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn2(
                      "text-[0.72rem] px-2 py-1 rounded-full font-semibold",
                      p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" :
                      p.status === "failed" ? "bg-red-500/15 text-red-300" :
                      "bg-amber-500/15 text-amber-300",
                    )}
                  >
                    {p.status}
                  </span>
                  {p.status !== "paid" && p.status !== "failed" && (
                    <button
                      onClick={() => markPaid(p.id)}
                      disabled={busyId === p.id}
                      className="px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold bg-[var(--orange-500)] text-white hover:opacity-90 cursor-pointer disabled:opacity-60"
                    >
                      {busyId === p.id ? "…" : "Mark paid"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// local classnames helper (avoids importing cn just for this)
function cn2(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
