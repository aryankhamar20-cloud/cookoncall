"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, AlertCircle, ShieldAlert, Check, X } from "lucide-react";
import { disputesApi } from "@/lib/api";

type Dispute = {
  id: string;
  booking_id: string;
  raised_by_role: "customer" | "cook";
  reason: string;
  description: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  resolution_note: string | null;
  refund_amount: string | number | null;
  created_at: string;
  raised_by?: { name?: string };
};

const STATUSES = ["open", "under_review", "resolved", "rejected"] as const;

function fmt(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function AdminDisputesPanel() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [refund, setRefund] = useState<Record<string, string>>({});

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await disputesApi.adminList(filter ? { status: filter, limit: 100 } : { limit: 100 });
      const r = data.data || data;
      setDisputes(Array.isArray(r?.disputes) ? r.disputes : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  async function resolve(id: string, status: "resolved" | "rejected" | "under_review") {
    setBusyId(id);
    try {
      await disputesApi.resolve(id, {
        status,
        resolution_note: note[id] || undefined,
        refund_amount: refund[id] ? Number(refund[id]) : undefined,
      });
      await fetchDisputes();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not update dispute");
    } finally {
      setBusyId(null);
    }
  }

  const statusColor = (s: string) =>
    s === "resolved" ? "bg-emerald-500/15 text-emerald-300" :
    s === "rejected" ? "bg-red-500/15 text-red-300" :
    s === "under_review" ? "bg-blue-500/15 text-blue-300" :
    "bg-amber-500/15 text-amber-300";

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[1.1rem] font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[var(--orange-400)]" /> Disputes
          </h2>
          <p className="text-[0.82rem] text-white/50 mt-0.5">Issues raised on bookings by customers or chefs.</p>
        </div>
        <button onClick={fetchDisputes} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.82rem] bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold border cursor-pointer ${
              filter === s ? "bg-[var(--orange-500)] text-white border-[var(--orange-500)]" : "bg-white/5 text-white/60 border-white/10"
            }`}
          >
            {s ? s.replace("_", " ") : "all"}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[0.85rem] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/50"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : disputes.length === 0 ? (
        <div className="text-white/50 text-[0.88rem] py-10 text-center">No disputes{filter ? ` (${filter.replace("_", " ")})` : ""}.</div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const canAct = d.status === "open" || d.status === "under_review";
            return (
              <div key={d.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-[0.9rem]">
                      {d.raised_by?.name || "User"} <span className="text-white/40">({d.raised_by_role})</span> · {d.reason}
                    </div>
                    <div className="text-[0.74rem] text-white/50 mt-0.5">
                      Booking {d.booking_id.slice(0, 8).toUpperCase()} · {fmt(d.created_at)}
                    </div>
                  </div>
                  <span className={`text-[0.72rem] px-2 py-1 rounded-full font-semibold ${statusColor(d.status)}`}>{d.status.replace("_", " ")}</span>
                </div>
                <p className="text-[0.85rem] text-white/80 mt-2 whitespace-pre-wrap">{d.description}</p>
                {d.resolution_note && (
                  <div className="text-[0.78rem] text-white/60 mt-2 bg-white/[0.03] rounded-lg p-2">
                    <span className="font-semibold">Resolution:</span> {d.resolution_note}
                    {d.refund_amount != null && Number(d.refund_amount) > 0 && ` · Refund ₹${Number(d.refund_amount)}`}
                  </div>
                )}
                {canAct && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <input
                      value={note[d.id] || ""}
                      onChange={(e) => setNote((n) => ({ ...n, [d.id]: e.target.value }))}
                      placeholder="Resolution note (optional)"
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.85rem] outline-none focus:border-[var(--orange-400)] placeholder:text-white/30"
                    />
                    <div className="flex gap-2 flex-wrap items-center">
                      <input
                        value={refund[d.id] || ""}
                        onChange={(e) => setRefund((r) => ({ ...r, [d.id]: e.target.value }))}
                        placeholder="Refund ₹ (optional)"
                        type="number"
                        className="w-36 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-[0.85rem] outline-none focus:border-[var(--orange-400)] placeholder:text-white/30"
                      />
                      <div className="flex-1" />
                      {d.status === "open" && (
                        <button onClick={() => resolve(d.id, "under_review")} disabled={busyId === d.id} className="px-3 py-2 rounded-lg text-[0.8rem] font-semibold bg-blue-500/15 text-blue-300 border-none cursor-pointer hover:bg-blue-500/25 disabled:opacity-60">
                          Mark reviewing
                        </button>
                      )}
                      <button onClick={() => resolve(d.id, "rejected")} disabled={busyId === d.id} className="flex items-center gap-1 px-3 py-2 rounded-lg text-[0.8rem] font-semibold bg-red-500/15 text-red-300 border-none cursor-pointer hover:bg-red-500/25 disabled:opacity-60">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button onClick={() => resolve(d.id, "resolved")} disabled={busyId === d.id} className="flex items-center gap-1 px-3 py-2 rounded-lg text-[0.8rem] font-semibold bg-emerald-500 text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-60">
                        {busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Resolve
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
