"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cooksApi } from "@/lib/api";

/**
 * Cook → My Earnings (Round 4)
 *
 * Replaces the legacy 3-tile earnings block with a payout-aware view
 * sourced from `/cooks/me/payouts`. Shows:
 *   • Lifetime / paid / pending net summary tiles.
 *   • Per-booking payout history with razorpay payment-id + paid_at.
 *   • Filter chips by payment status.
 *   • Pagination so a busy chef doesn't load 500 rows at once.
 */

type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "refunded"
  | "failed";

type Payout = {
  booking_id: string;
  completed_at: string | null;
  scheduled_at: string | null;
  customer_name: string | null;
  gross_total: number;
  subtotal: number;
  visit_fee: number;
  platform_commission: number;
  net_payout: number;
  payment_status: PaymentStatus | string;
  payment_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_transfer_id: string | null;
  paid_at: string | null;
  released_at: string | null;
  refund_amount: number | null;
};

type Summary = {
  lifetime_net: number;
  paid_net: number;
  pending_net: number;
};

type StatusFilter = "all" | PaymentStatus;

const PAGE_LIMIT = 20;

const STATUS_LABEL: Record<PaymentStatus, string> = {
  created: "Pending",
  authorized: "Authorized",
  captured: "Paid",
  refunded: "Refunded",
  failed: "Failed",
};

const STATUS_PILL: Record<PaymentStatus, string> = {
  created: "bg-amber-100 text-amber-700",
  authorized: "bg-blue-100 text-blue-700",
  captured: "bg-emerald-100 text-emerald-700",
  refunded: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
};

const fmtINR = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function EarningsHistoryPanel() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPayouts = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await cooksApi.getMyPayouts({
          page,
          limit: PAGE_LIMIT,
          status: filter === "all" ? undefined : filter,
        });
        const body = (res.data as any)?.data ?? res.data;
        setPayouts(Array.isArray(body?.payouts) ? body.payouts : []);
        setSummary(body?.summary ?? null);
        const pagination = body?.pagination;
        setTotalPages(pagination?.total_pages ?? 1);
        setTotal(pagination?.total ?? 0);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Could not load earnings history.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, filter],
  );

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Reset to page 1 whenever the filter changes — otherwise a chef on
  // page 5 of "captured" might land on an empty page when they switch
  // to "refunded" (only a handful of refunded rows exist).
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const toggleExpand = (bookingId: string) =>
    setExpanded((cur) => (cur === bookingId ? null : bookingId));

  // Sums to show in the summary tiles. Always hydrate from `summary`
  // because that's the lifetime aggregate; the visible page only
  // contains a slice. Fallback to derived totals for resilience.
  const lifetime = summary?.lifetime_net ?? 0;
  const paid = summary?.paid_net ?? 0;
  const pending = summary?.pending_net ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-[1.05rem]">My Earnings</h2>
          <p className="text-[0.85rem] text-[var(--text-muted)] mt-0.5">
            You receive 97.5% of all dish revenue. Platform keeps the ₹49 visit
            fee and a 2.5% convenience fee.
          </p>
        </div>
        <button
          onClick={() => fetchPayouts(true)}
          disabled={refreshing}
          className="px-3 py-2 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.85rem] font-semibold flex items-center gap-2 hover:border-[var(--orange-500)] disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile
          icon={<Wallet className="w-4 h-4" />}
          label="Lifetime net"
          value={fmtINR(lifetime)}
          tone="emerald"
        />
        <SummaryTile
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Paid out"
          value={fmtINR(paid)}
          tone="blue"
        />
        <SummaryTile
          icon={<Clock className="w-4 h-4" />}
          label="Pending"
          value={fmtINR(pending)}
          tone="amber"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-[var(--text-muted)]" />
        {(
          [
            "all",
            "captured",
            "created",
            "authorized",
            "refunded",
            "failed",
          ] as StatusFilter[]
        ).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold transition-all ${
              filter === s
                ? "bg-[var(--orange-500)] text-white"
                : "bg-white border border-[rgba(0,0,0,0.08)] text-[var(--brown-800)] hover:border-[var(--orange-500)]"
            }`}
          >
            {s === "all"
              ? "All"
              : STATUS_LABEL[s as PaymentStatus]}
          </button>
        ))}
        <div className="flex-1" />
        {total > 0 && (
          <span className="text-[0.78rem] text-[var(--text-muted)]">
            {total.toLocaleString("en-IN")} total
          </span>
        )}
      </div>

      {/* Errors */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-red-50 border border-red-200 text-red-800 text-[0.82rem]">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading earnings…
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-16 text-center text-[0.88rem] text-[var(--text-muted)]">
            {filter === "all"
              ? "No completed jobs yet. Accept a booking to get started!"
              : `No payouts with status “${STATUS_LABEL[filter as PaymentStatus] ?? filter}”.`}
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(0,0,0,0.06)]">
            {payouts.map((p) => (
              <PayoutRow
                key={p.booking_id}
                payout={p}
                expanded={expanded === p.booking_id}
                onToggle={() => toggleExpand(p.booking_id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] text-[var(--text-muted)]">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-2 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.82rem] font-semibold flex items-center gap-1 hover:border-[var(--orange-500)] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-2 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.82rem] font-semibold flex items-center gap-1 hover:border-[var(--orange-500)] disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "blue" | "amber";
}) {
  const cls = {
    emerald: "text-emerald-600 bg-emerald-100",
    blue: "text-blue-600 bg-blue-100",
    amber: "text-amber-600 bg-amber-100",
  }[tone];
  return (
    <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${cls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[0.7rem] uppercase tracking-wide font-semibold text-[var(--text-muted)]">
          {label}
        </div>
        <div className="font-display font-[800] text-[1.4rem] text-[var(--brown-800)] mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

function PayoutRow({
  payout,
  expanded,
  onToggle,
}: {
  payout: Payout;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = (payout.payment_status as PaymentStatus) || "created";
  const isPaid = status === "captured";
  const isRefund = status === "refunded";
  const pillCls = STATUS_PILL[status] ?? "bg-gray-100 text-gray-600";

  // Show the most-recent meaningful timestamp. If the payment was
  // captured we prefer paid_at; otherwise the booking's completed_at;
  // otherwise the scheduled time.
  const primaryTs = payout.paid_at || payout.completed_at || payout.scheduled_at;

  return (
    <li className="px-4 py-3.5">
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start gap-4"
      >
        {/* Left: customer + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[0.92rem] text-[var(--brown-800)]">
              {payout.customer_name || "Customer"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase tracking-wide ${pillCls}`}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[0.78rem] text-[var(--text-muted)]">
            <span>{fmtDate(primaryTs)}</span>
            <span className="font-mono opacity-70">
              · {payout.booking_id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Right: net amount */}
        <div className="text-right shrink-0">
          <div
            className={`font-display font-[800] text-[1.05rem] ${
              isPaid
                ? "text-emerald-600"
                : isRefund
                  ? "text-purple-600"
                  : "text-[var(--brown-800)]"
            }`}
          >
            {isRefund ? "−" : "+"}
            {fmtINR(payout.net_payout)}
          </div>
          <div className="text-[0.7rem] text-[var(--text-muted)]">
            net payout
          </div>
        </div>

        {/* Caret */}
        <div className="shrink-0 text-[var(--text-muted)] mt-1">
          {expanded ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] grid grid-cols-2 sm:grid-cols-3 gap-2 text-[0.78rem]">
          <Cell label="Gross total" value={fmtINR(payout.gross_total)} />
          <Cell label="Subtotal (dishes)" value={fmtINR(payout.subtotal)} />
          <Cell label="Visit fee (platform)" value={fmtINR(payout.visit_fee)} />
          <Cell
            label="Platform commission"
            value={`−${fmtINR(payout.platform_commission)}`}
            tone="negative"
          />
          <Cell
            label="Net to chef"
            value={fmtINR(payout.net_payout)}
            tone="positive"
          />
          {payout.refund_amount != null && payout.refund_amount > 0 && (
            <Cell
              label="Refunded"
              value={fmtINR(payout.refund_amount)}
              tone="negative"
            />
          )}
          {payout.razorpay_payment_id && (
            <Cell
              label="Razorpay payment"
              value={payout.razorpay_payment_id}
              mono
              wide
            />
          )}
          {payout.razorpay_transfer_id && (
            <Cell
              label="Razorpay transfer"
              value={payout.razorpay_transfer_id}
              mono
              wide
            />
          )}
          {payout.paid_at && (
            <Cell label="Paid at" value={fmtDate(payout.paid_at)} />
          )}
          {payout.released_at && (
            <Cell label="Released at" value={fmtDate(payout.released_at)} />
          )}
        </div>
      )}
    </li>
  );
}

function Cell({
  label,
  value,
  tone,
  mono,
  wide,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  mono?: boolean;
  wide?: boolean;
}) {
  const valueCls =
    tone === "positive"
      ? "text-emerald-600 font-bold"
      : tone === "negative"
        ? "text-red-500 font-bold"
        : "text-[var(--brown-800)] font-semibold";
  return (
    <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
      <div className="text-[var(--text-muted)] uppercase tracking-wide font-semibold text-[0.65rem]">
        {label}
      </div>
      <div
        className={`mt-0.5 ${valueCls} ${mono ? "font-mono break-all" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
