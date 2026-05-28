"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Download,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users as UsersIcon,
  ChefHat,
  Wallet,
  Calendar,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import type { AnalyticsRange } from "@/lib/api";

/**
 * Admin → Analytics dashboard.
 *
 * Pulls 6 endpoints in parallel on mount + whenever the range changes,
 * renders 8 KPI cards and 6 recharts visualisations. Export buttons
 * stream CSV directly from the backend (no client-side conversion).
 *
 * Designed to render fully even when some endpoints fail — each card
 * has its own placeholder so a single broken query doesn't black out
 * the whole page.
 */

type Overview = {
  range: { from: string; to: string; days: number };
  users: { total: number; active: number; new_in_range: number; dau: number };
  cooks: { total: number; verified: number; active_now: number };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    active: number;
    cancel_rate_percent: number;
  };
  revenue: {
    gmv: number;
    gross_revenue: number;
    platform_commission: number;
    chef_payouts: number;
    avg_order_value: number;
  };
};

type DailyBookingPoint = {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  gmv: number;
};

type DailyRevenuePoint = {
  date: string;
  gmv: number;
  gross_revenue: number;
  platform_commission: number;
  chef_payout: number;
  aov: number;
  completed_count: number;
};

type StatusSlice = { status: string; count: number };
type SignupPoint = { date: string; count: number };
type CityRow = { city: string; bookings: number; revenue: number };
type TopChef = { id: string; name: string; revenue?: number; bookings_in_range?: number; rating?: number };

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

// Brand-aligned status palette for the booking pie
const STATUS_COLORS: Record<string, string> = {
  pending_chef_approval: "#f59e0b",
  awaiting_payment: "#fbbf24",
  pending: "#fbbf24",
  confirmed: "#3b82f6",
  in_progress: "#8b5cf6",
  completed: "#16a34a",
  cancelled_by_user: "#ef4444",
  cancelled_by_cook: "#dc2626",
  expired: "#6b7280",
};
const PIE_FALLBACK = "#94a3b8";

function fmtINR(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}k`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}
function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return Math.round(v).toLocaleString("en-IN");
}
function shortDate(iso: string) {
  if (!iso) return "—";
  // The DB returns 'YYYY-MM-DD' for date-bucketed series
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AnalyticsPanel() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [bookingDaily, setBookingDaily] = useState<DailyBookingPoint[]>([]);
  const [bookingStatus, setBookingStatus] = useState<StatusSlice[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: number; count: number }[]>([]);
  const [revenueDaily, setRevenueDaily] = useState<DailyRevenuePoint[]>([]);
  const [topCities, setTopCities] = useState<CityRow[]>([]);
  const [signups, setSignups] = useState<SignupPoint[]>([]);
  const [topChefs, setTopChefs] = useState<TopChef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const loadAll = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      const errs: string[] = [];
      const params = { range };

      const safe = async <T,>(label: string, p: Promise<{ data: any }>): Promise<T | null> => {
        try {
          const res = await p;
          return (res.data?.data ?? res.data) as T;
        } catch (err) {
          console.warn(`[analytics] ${label} failed`, err);
          errs.push(label);
          return null;
        }
      };

      const [ov, bk, rv, ch, lo, us] = await Promise.all([
        safe<Overview>("overview", adminApi.getAnalyticsOverview(params)),
        safe<{ daily: DailyBookingPoint[]; by_status: StatusSlice[]; peak_hours: { hour: number; count: number }[] }>(
          "bookings",
          adminApi.getAnalyticsBookings(params),
        ),
        safe<{ daily: DailyRevenuePoint[]; by_city: CityRow[] }>("revenue", adminApi.getAnalyticsRevenue(params)),
        safe<{ top_by_revenue: TopChef[]; top_by_bookings: TopChef[]; top_by_rating: TopChef[] }>(
          "chefs",
          adminApi.getAnalyticsChefs(params),
        ),
        safe<{ by_city: CityRow[] }>("locations", adminApi.getAnalyticsLocations(params)),
        safe<{ signups: SignupPoint[] }>("users", adminApi.getAnalyticsUsers(params)),
      ]);

      if (ov) setOverview(ov);
      if (bk) {
        setBookingDaily(bk.daily ?? []);
        setBookingStatus(bk.by_status ?? []);
        setPeakHours(bk.peak_hours ?? []);
      }
      if (rv) {
        setRevenueDaily(rv.daily ?? []);
        setTopCities(rv.by_city ?? []);
      }
      if (ch) setTopChefs(ch.top_by_revenue ?? []);
      if (lo && (!rv || !rv.by_city?.length)) setTopCities(lo.by_city ?? []);
      if (us) setSignups(us.signups ?? []);

      setErrors(errs);
      setLoading(false);
      setRefreshing(false);
    },
    [range],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleExport = async (metric: "bookings" | "revenue" | "users" | "top_chefs") => {
    try {
      const res = await adminApi.exportAnalyticsCsv(metric, { range });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics-${metric}-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
      alert("CSV export failed. Try again in a moment.");
    }
  };

  // KPI cards data (memoized so we don't recompute on every render)
  const kpis = useMemo(() => {
    if (!overview) return null;
    return [
      {
        label: "Total Users",
        value: fmtNum(overview.users.total),
        icon: <UsersIcon className="w-4 h-4" />,
        sub: `${fmtNum(overview.users.new_in_range)} new in range`,
        color: "from-blue-500/15 to-blue-500/5",
      },
      {
        label: "DAU",
        value: fmtNum(overview.users.dau),
        icon: <TrendingUp className="w-4 h-4" />,
        sub: "Daily active users",
        color: "from-emerald-500/15 to-emerald-500/5",
      },
      {
        label: "Active Chefs",
        value: fmtNum(overview.cooks.active_now),
        icon: <ChefHat className="w-4 h-4" />,
        sub: `of ${fmtNum(overview.cooks.verified)} verified`,
        color: "from-orange-500/15 to-orange-500/5",
      },
      {
        label: "Bookings",
        value: fmtNum(overview.bookings.total),
        icon: <Calendar className="w-4 h-4" />,
        sub: `${overview.bookings.completed} completed`,
        color: "from-purple-500/15 to-purple-500/5",
      },
      {
        label: "GMV",
        value: fmtINR(overview.revenue.gmv),
        icon: <Wallet className="w-4 h-4" />,
        sub: "Gross merchandise value",
        color: "from-amber-500/15 to-amber-500/5",
      },
      {
        label: "Net Revenue",
        value: fmtINR(overview.revenue.platform_commission),
        icon: <TrendingUp className="w-4 h-4" />,
        sub: `${fmtINR(overview.revenue.chef_payouts)} paid to chefs`,
        color: "from-green-500/15 to-green-500/5",
      },
      {
        label: "Avg Order Value",
        value: fmtINR(overview.revenue.avg_order_value),
        icon: <BarChart3 className="w-4 h-4" />,
        sub: "Completed bookings only",
        color: "from-indigo-500/15 to-indigo-500/5",
      },
      {
        label: "Cancel Rate",
        value: `${overview.bookings.cancel_rate_percent.toFixed(1)}%`,
        icon: <AlertCircle className="w-4 h-4" />,
        sub: `${overview.bookings.cancelled} cancellations`,
        color: "from-red-500/15 to-red-500/5",
      },
    ];
  }, [overview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[rgba(255,255,255,0.6)]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-[1.15rem] text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--orange-500)]" /> Platform Analytics
          </h2>
          <p className="text-[0.82rem] text-[rgba(255,255,255,0.45)] mt-0.5">
            {overview ? (
              <>Showing {overview.range.from} → {overview.range.to} ({overview.range.days} days)</>
            ) : (
              "Live business metrics across users, bookings, and revenue"
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-[rgba(255,255,255,0.04)] rounded-[10px] p-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-[8px] text-[0.8rem] font-semibold transition-colors ${
                  range === r.value
                    ? "bg-[var(--orange-500)] text-white"
                    : "text-[rgba(255,255,255,0.6)] hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-[8px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.7)] hover:text-white text-[0.8rem] font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => handleExport("bookings")}
            className="px-3 py-1.5 rounded-[8px] bg-[var(--orange-500)] text-white text-[0.8rem] font-semibold flex items-center gap-1.5 hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ─── Per-endpoint error notice (non-blocking) ────────── */}
      {errors.length > 0 && (
        <div className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-[0.82rem] text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Some metrics couldn't load: <span className="font-semibold">{errors.join(", ")}</span>.
          Other charts are unaffected.
        </div>
      )}

      {/* ─── KPI cards ─────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-gradient-to-br ${k.color} p-4`}
            >
              <div className="flex items-center justify-between mb-2 text-[rgba(255,255,255,0.55)]">
                <span className="text-[0.72rem] uppercase tracking-wider font-semibold">{k.label}</span>
                {k.icon}
              </div>
              <div className="text-[1.4rem] font-extrabold text-white leading-none">{k.value}</div>
              <div className="text-[0.72rem] text-[rgba(255,255,255,0.45)] mt-1.5">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Charts grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily revenue (area) */}
        <ChartShell title="Daily revenue" subtitle="GMV vs net commission">
          {revenueDaily.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueDaily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tickFormatter={(v) => fmtINR(Number(v))} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={50} />
                <Tooltip
                  contentStyle={{ background: "#1a1209", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                  formatter={(v: number) => fmtINR(Number(v))}
                  labelFormatter={shortDate}
                />
                <Area type="monotone" dataKey="gmv" stroke="#f59e0b" fill="url(#gmv)" strokeWidth={2} />
                <Area type="monotone" dataKey="platform_commission" stroke="#16a34a" fill="url(#net)" strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartShell>

        {/* Daily bookings (bar) */}
        <ChartShell
          title="Daily bookings"
          subtitle="Total vs completed vs cancelled"
          actionLabel="Export CSV"
          onAction={() => handleExport("bookings")}
        >
          {bookingDaily.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bookingDaily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={36} />
                <Tooltip
                  contentStyle={{ background: "#1a1209", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                  labelFormatter={shortDate}
                />
                <Bar dataKey="completed" stackId="b" fill="#16a34a" name="Completed" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cancelled" stackId="b" fill="#ef4444" name="Cancelled" radius={[0, 0, 0, 0]} />
                <Bar
                  dataKey={(d: DailyBookingPoint) => Math.max(0, d.total - d.completed - d.cancelled)}
                  stackId="b"
                  fill="#f59e0b"
                  name="Pending / In progress"
                  radius={[4, 4, 0, 0]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartShell>

        {/* Booking status breakdown (pie) */}
        <ChartShell title="Booking status" subtitle="Mix across the selected window">
          {bookingStatus.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={bookingStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(d: any) => `${d.status} (${d.count})`}
                >
                  {bookingStatus.map((s) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? PIE_FALLBACK} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1a1209", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartShell>

        {/* Peak booking hours */}
        <ChartShell title="Peak booking hours" subtitle="Bookings by hour of scheduled session">
          {peakHours.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakHours} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={36} />
                <Tooltip
                  contentStyle={{ background: "#1a1209", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                  labelFormatter={(h: number) => `${h}:00`}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartShell>

        {/* Daily signups */}
        <ChartShell
          title="Daily signups"
          subtitle="New users by day"
          actionLabel="Export CSV"
          onAction={() => handleExport("users")}
        >
          {signups.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={signups} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={36} />
                <Tooltip
                  contentStyle={{ background: "#1a1209", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                  labelFormatter={shortDate}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartShell>

        {/* Top cities */}
        <ChartShell title="Top cities by revenue" subtitle="Completed-booking GMV">
          {topCities.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={topCities.slice(0, 8)}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tickFormatter={(v) => fmtINR(Number(v))} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis type="category" dataKey="city" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ background: "#1a1209", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                  formatter={(v: number) => fmtINR(Number(v))}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartShell>
      </div>

      {/* ─── Top chefs leaderboard ─────────────────────────── */}
      <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-[0.95rem]">Top chefs by revenue</h3>
            <p className="text-[0.78rem] text-[rgba(255,255,255,0.45)]">Highest-grossing chefs in this window</p>
          </div>
          <button
            onClick={() => handleExport("top_chefs")}
            className="text-[var(--orange-500)] text-[0.78rem] font-semibold hover:underline flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
        {topChefs.length === 0 ? (
          <div className="text-[rgba(255,255,255,0.45)] text-[0.85rem] py-8 text-center">
            No completed bookings in this window yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topChefs.slice(0, 10).map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-[rgba(255,255,255,0.03)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-[var(--orange-500)]/20 text-[var(--orange-500)] font-bold text-[0.78rem] flex items-center justify-center">
                    {i + 1}
                  </div>
                  <span className="text-white text-[0.86rem] font-semibold truncate">{c.name}</span>
                </div>
                <span className="text-[var(--orange-500)] font-bold text-[0.86rem] shrink-0">
                  {fmtINR(Number(c.revenue ?? 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Footer note ───────────────────────────────────── */}
      <div className="rounded-[10px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-[0.75rem] text-[rgba(255,255,255,0.4)]">
        Data is refreshed by a server-side cron every hour. Yesterday is finalised at 00:30 IST.
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────

function ChartShell({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-white text-[0.9rem]">{title}</h3>
          {subtitle && (
            <p className="text-[0.74rem] text-[rgba(255,255,255,0.45)]">{subtitle}</p>
          )}
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-[var(--orange-500)] text-[0.75rem] font-semibold hover:underline flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="h-[260px] flex items-center justify-center text-[rgba(255,255,255,0.4)] text-[0.82rem]">
      <MapPin className="w-4 h-4 mr-1.5" />
      No data in this window
    </div>
  );
}
