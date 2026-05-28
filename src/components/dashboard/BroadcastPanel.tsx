"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChefHat,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { adminApi, areasApi, type ServiceAreaDto } from "@/lib/api";

/**
 * Admin → Broadcast Push (Round 3)
 *
 * Two columns:
 *   • Composer (title, body, audience, optional area + deep link)
 *   • History (last 50 broadcasts with delivery counters)
 *
 * The composer mirrors the backend DTO 1:1: title ≤ 65 chars,
 * body ≤ 240 chars, audience ∈ {all, customers, cooks, area}. When
 * audience='area' we surface the active areas list as a dropdown so
 * admins can't fat-finger a slug.
 */

type Audience = "all" | "customers" | "cooks" | "area";

type BroadcastRow = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  area_slug: string | null;
  deep_link: string | null;
  sent_by_admin_name: string | null;
  recipients_targeted: number;
  recipients_with_token: number;
  fcm_dispatched: boolean;
  inapp_created: number;
  created_at: string;
};

const TITLE_MAX = 65;
const BODY_MAX = 240;
const HISTORY_LIMIT = 50;

const AUDIENCE_OPTIONS: {
  id: Audience;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "all",
    label: "All users",
    description: "Customers + chefs (active accounts only).",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    id: "customers",
    label: "Customers",
    description: "Only role=user — typical for promo / discount alerts.",
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: "cooks",
    label: "Chefs",
    description: "Only role=cook — operational announcements, policy updates.",
    icon: <ChefHat className="w-4 h-4" />,
  },
  {
    id: "area",
    label: "By area",
    description: "Customers whose default address is in a specific area.",
    icon: <MapPin className="w-4 h-4" />,
  },
];

export default function BroadcastPanel() {
  // ─── Composer state ────────────────────────────────────
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [areaSlug, setAreaSlug] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─── Areas (for the dropdown when audience='area') ────
  const [areas, setAreas] = useState<ServiceAreaDto[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);

  // ─── History state ─────────────────────────────────────
  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);

  // Fetch active areas — only needed when audience='area' but we
  // pre-fetch on mount because the list is small (<= ~50 areas).
  const fetchAreas = useCallback(async () => {
    setAreasLoading(true);
    try {
      const res = await areasApi.list();
      const body = (res.data as any)?.data ?? res.data;
      const items: ServiceAreaDto[] = Array.isArray(body) ? body : body?.data ?? [];
      setAreas(items);
    } catch (err) {
      console.error("[broadcast] areas fetch failed", err);
      setAreas([]);
    } finally {
      setAreasLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(
    async (silent = false) => {
      if (silent) setHistoryRefreshing(true);
      else setHistoryLoading(true);
      try {
        const res = await adminApi.getBroadcasts({ page: 1, limit: HISTORY_LIMIT });
        const body = (res.data as any)?.data ?? res.data;
        const items: BroadcastRow[] = body?.broadcasts ?? body ?? [];
        setHistory(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error("[broadcast] history fetch failed", err);
        setHistory([]);
      } finally {
        setHistoryLoading(false);
        setHistoryRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchAreas();
    fetchHistory();
  }, [fetchAreas, fetchHistory]);

  // Auto-dismiss the success banner so the panel doesn't get cluttered.
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // ─── Validation ────────────────────────────────────────
  // Mirror server-side rules verbatim so the user sees errors
  // before they ever hit the API.
  const validation = useMemo(() => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) return { ok: false, msg: "Title is required." };
    if (trimmedTitle.length > TITLE_MAX)
      return { ok: false, msg: `Title is too long (max ${TITLE_MAX} chars).` };
    if (!trimmedBody) return { ok: false, msg: "Body is required." };
    if (trimmedBody.length > BODY_MAX)
      return { ok: false, msg: `Body is too long (max ${BODY_MAX} chars).` };
    if (audience === "area" && !areaSlug)
      return { ok: false, msg: "Pick an area to broadcast to." };
    if (deepLink && !/^[A-Za-z0-9/_:?&=#.\-]+$/.test(deepLink))
      return {
        ok: false,
        msg: "Deep link contains invalid characters.",
      };
    return { ok: true, msg: "" };
  }, [title, body, audience, areaSlug, deepLink]);

  const handleSend = async () => {
    if (!validation.ok || sending) return;

    // Confirm before fanning out to a wide audience — easy to fat-finger
    // a typo and spam every customer in production.
    const targetLabel =
      audience === "area"
        ? `customers in "${areaSlug}"`
        : audience === "all"
          ? "ALL users"
          : audience;
    const ok = window.confirm(
      `Send this notification to ${targetLabel}?\n\n` +
        `Title: ${title.trim()}\n\n` +
        `Body: ${body.trim()}`,
    );
    if (!ok) return;

    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        audience,
        area_slug: audience === "area" ? areaSlug : undefined,
        deep_link: deepLink.trim() || undefined,
      });
      const created = (res.data as any)?.data ?? res.data;
      setSuccess(
        `Broadcast queued — targeted ${created?.recipients_targeted ?? 0} users, ` +
          `${created?.recipients_with_token ?? 0} with push tokens.`,
      );
      // Reset composer but keep audience choice — admins often send
      // multiple to the same group in a row.
      setTitle("");
      setBody("");
      setDeepLink("");
      // Refresh the history so the new row shows up immediately.
      fetchHistory(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send broadcast. Please try again.";
      setError(Array.isArray(msg) ? msg.join(" · ") : String(msg));
    } finally {
      setSending(false);
    }
  };

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[var(--orange-500)]/15 flex items-center justify-center">
            <Bell className="w-5 h-5 text-[var(--orange-500)]" />
          </div>
          <div>
            <h2 className="font-bold text-[1.05rem]">Broadcast Push Notifications</h2>
            <p className="text-[0.8rem] text-[var(--text-muted,#6b7280)]">
              Send a push + in-app notification to a target audience. Sends
              are recorded in the audit log and analytics.
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchHistory(true)}
          disabled={historyRefreshing}
          className="px-3 py-2 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.85rem] font-semibold flex items-center gap-2 hover:border-[var(--orange-500)] disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${historyRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Composer ──────────────────────────────── */}
        <section className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] p-5 space-y-4">
          <h3 className="font-bold text-[0.95rem] text-[var(--brown-800,#3d2418)]">
            New broadcast
          </h3>

          {/* Title */}
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.78rem] font-semibold text-[var(--brown-800,#3d2418)]">
                Title
              </span>
              <span
                className={`text-[0.72rem] ${
                  title.length > TITLE_MAX
                    ? "text-red-500"
                    : "text-[var(--text-muted,#9ca3af)]"
                }`}
              >
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX + 5} /* let user paste, then we'll error */
              placeholder="e.g. Diwali Special — 20% off all bookings"
              className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-[0.9rem] focus:outline-none focus:border-[var(--orange-500)]"
            />
          </label>

          {/* Body */}
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.78rem] font-semibold text-[var(--brown-800,#3d2418)]">
                Body
              </span>
              <span
                className={`text-[0.72rem] ${
                  body.length > BODY_MAX
                    ? "text-red-500"
                    : "text-[var(--text-muted,#9ca3af)]"
                }`}
              >
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={BODY_MAX + 20}
              placeholder="e.g. Book any chef this Diwali and save 20%. Code: DIWALI20. Limited slots — book now!"
              className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-[0.9rem] focus:outline-none focus:border-[var(--orange-500)] resize-none"
            />
          </label>

          {/* Audience */}
          <div>
            <span className="text-[0.78rem] font-semibold text-[var(--brown-800,#3d2418)] block mb-2">
              Audience
            </span>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map((opt) => {
                const active = audience === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAudience(opt.id)}
                    className={`text-left px-3 py-2.5 rounded-[10px] border transition-all ${
                      active
                        ? "border-[var(--orange-500)] bg-[var(--orange-500)]/8"
                        : "border-[rgba(0,0,0,0.08)] bg-white hover:border-[var(--orange-500)]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {opt.icon}
                      <span className="font-bold text-[0.85rem]">{opt.label}</span>
                    </div>
                    <p className="text-[0.72rem] text-[var(--text-muted,#6b7280)] leading-snug">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Area picker — visible only when audience='area' */}
          {audience === "area" && (
            <label className="block">
              <span className="text-[0.78rem] font-semibold text-[var(--brown-800,#3d2418)] block mb-1.5">
                Area
              </span>
              <select
                value={areaSlug}
                onChange={(e) => setAreaSlug(e.target.value)}
                disabled={areasLoading}
                className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-[0.9rem] bg-white focus:outline-none focus:border-[var(--orange-500)] disabled:opacity-50"
              >
                <option value="">— Pick an area —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name} {a.region ? `(${a.region})` : ""}
                  </option>
                ))}
              </select>
              {!areasLoading && areas.length === 0 && (
                <p className="text-[0.72rem] text-amber-600 mt-1">
                  No active areas found. Approve an area request first.
                </p>
              )}
            </label>
          )}

          {/* Deep link (optional) */}
          <label className="block">
            <span className="text-[0.78rem] font-semibold text-[var(--brown-800,#3d2418)] block mb-1.5">
              Deep link <span className="font-normal text-[var(--text-muted,#9ca3af)]">(optional)</span>
            </span>
            <input
              type="text"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/promos/diwali"
              className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-[0.9rem] font-mono focus:outline-none focus:border-[var(--orange-500)]"
            />
            <p className="text-[0.72rem] text-[var(--text-muted,#6b7280)] mt-1">
              Where the user lands when they tap the notification. Leave empty
              to open the home screen.
            </p>
          </label>

          {/* Validation / status banners */}
          {!validation.ok && validation.msg && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[0.82rem]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{validation.msg}</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-red-50 border border-red-200 text-red-800 text-[0.82rem]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[0.82rem]">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!validation.ok || sending}
            className="w-full px-4 py-3 bg-[var(--orange-500)] hover:bg-[var(--orange-400)] text-white rounded-[10px] font-bold text-[0.9rem] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "Sending…" : "Send broadcast"}
          </button>
        </section>

        {/* ── History ───────────────────────────────── */}
        <section className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[0.95rem] text-[var(--brown-800,#3d2418)]">
              Recent broadcasts
            </h3>
            <span className="text-[0.75rem] text-[var(--text-muted,#9ca3af)]">
              Latest {HISTORY_LIMIT}
            </span>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted,#6b7280)]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading history…
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-[0.88rem] text-[var(--text-muted,#6b7280)]">
              No broadcasts yet. Compose one and hit <em>Send</em>.
            </div>
          ) : (
            <ul className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {history.map((b) => (
                <BroadcastHistoryRow key={b.id} row={b} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── History row ──────────────────────────────────────────
function BroadcastHistoryRow({ row }: { row: BroadcastRow }) {
  const time = new Date(row.created_at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const audienceLabel =
    row.audience === "area" && row.area_slug
      ? `area: ${row.area_slug}`
      : row.audience;

  // Delivery rate = how many tokens we had vs how many users we
  // targeted. A low rate (e.g. 30%) is a signal that lots of users
  // haven't opened the app recently or denied push permission.
  const deliveryRate =
    row.recipients_targeted > 0
      ? Math.round(
          (row.recipients_with_token / row.recipients_targeted) * 100,
        )
      : 0;

  // Round 4 / Analytics Phase 2 — lazy CTR fetch.
  // We don't pull CTR for every row eagerly because it's a separate
  // query per row and most admins only care about the latest few.
  // Click "View CTR" to expand and load on-demand.
  const [ctrOpen, setCtrOpen] = useState(false);
  const [ctrLoading, setCtrLoading] = useState(false);
  const [ctr, setCtr] = useState<BroadcastCtr | null>(null);
  const [ctrError, setCtrError] = useState<string | null>(null);

  const loadCtr = useCallback(async () => {
    if (ctr || ctrLoading) return;
    setCtrLoading(true);
    setCtrError(null);
    try {
      const res = await adminApi.getBroadcastCtr(row.id);
      const body = (res.data as any)?.data ?? res.data;
      setCtr(body as BroadcastCtr);
    } catch (err: any) {
      setCtrError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not load CTR.",
      );
    } finally {
      setCtrLoading(false);
    }
  }, [ctr, ctrLoading, row.id]);

  const toggleCtr = () => {
    setCtrOpen((open) => {
      const next = !open;
      if (next) loadCtr();
      return next;
    });
  };

  return (
    <li className="border border-[rgba(0,0,0,0.06)] rounded-[10px] p-3.5 bg-white">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-[0.9rem] text-[var(--brown-800,#3d2418)]">
              {row.title}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--orange-500)]/12 text-[var(--orange-500)] text-[0.7rem] font-semibold uppercase tracking-wide">
              {audienceLabel}
            </span>
            {row.fcm_dispatched ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[0.7rem] font-semibold uppercase">
                FCM sent
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[0.7rem] font-semibold uppercase">
                In-app only
              </span>
            )}
          </div>
          <p className="text-[0.82rem] text-[var(--text-muted,#4b5563)] leading-snug line-clamp-2">
            {row.body}
          </p>
          {row.deep_link && (
            <p className="text-[0.72rem] text-[var(--orange-500)] mt-1 font-mono break-all">
              → {row.deep_link}
            </p>
          )}
        </div>
        <span className="text-[0.72rem] text-[var(--text-muted,#9ca3af)] whitespace-nowrap">
          {time}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[0.72rem]">
        <Stat
          label="Targeted"
          value={row.recipients_targeted.toLocaleString("en-IN")}
        />
        <Stat
          label="With token"
          value={`${row.recipients_with_token.toLocaleString("en-IN")} (${deliveryRate}%)`}
        />
        <Stat
          label="In-app"
          value={row.inapp_created.toLocaleString("en-IN")}
        />
      </div>

      <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
        {row.sent_by_admin_name && (
          <p className="text-[0.7rem] text-[var(--text-muted,#9ca3af)]">
            by {row.sent_by_admin_name}
          </p>
        )}
        <button
          onClick={toggleCtr}
          className="text-[0.72rem] font-semibold text-[var(--orange-500)] hover:underline"
        >
          {ctrOpen ? "Hide CTR" : "View CTR ›"}
        </button>
      </div>

      {ctrOpen && (
        <CtrPanel
          loading={ctrLoading}
          error={ctrError}
          ctr={ctr}
        />
      )}
    </li>
  );
}

// ─── CTR drill-down ───────────────────────────────────────
type BroadcastCtr = {
  broadcast: {
    id: string;
    title: string;
    audience: string;
    inapp_created: number;
  };
  stats: {
    created: number;
    clicked: number;
    read: number;
    ctr_percent: number;
    read_rate_percent: number;
  };
  clickers: Array<{
    user_id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    clicked_at: string;
  }>;
};

function CtrPanel({
  loading,
  error,
  ctr,
}: {
  loading: boolean;
  error: string | null;
  ctr: BroadcastCtr | null;
}) {
  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] flex items-center gap-2 text-[0.78rem] text-[var(--text-muted,#6b7280)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading CTR…
      </div>
    );
  }
  if (error) {
    return (
      <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] flex items-start gap-2 text-[0.78rem] text-red-700">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
        {error}
      </div>
    );
  }
  if (!ctr) return null;

  const s = ctr.stats;
  // Color the CTR pill so admins get a quick read on whether the
  // broadcast worked. Industry baseline for transactional push is
  // 5–10%; campaign push regularly hits 20%+.
  const ctrTone =
    s.ctr_percent >= 20
      ? "bg-emerald-100 text-emerald-700"
      : s.ctr_percent >= 5
        ? "bg-blue-100 text-blue-700"
        : s.ctr_percent > 0
          ? "bg-amber-100 text-amber-800"
          : "bg-gray-100 text-gray-600";

  return (
    <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className={`px-2 py-0.5 rounded-full text-[0.72rem] font-bold uppercase tracking-wide ${ctrTone}`}
        >
          CTR {s.ctr_percent}%
        </span>
        <span className="text-[0.72rem] text-[var(--text-muted,#6b7280)]">
          {s.clicked.toLocaleString("en-IN")} of {s.created.toLocaleString("en-IN")} opened
          · {s.read.toLocaleString("en-IN")} read ({s.read_rate_percent}%)
        </span>
      </div>

      {ctr.clickers.length === 0 ? (
        <p className="text-[0.72rem] text-[var(--text-muted,#9ca3af)] italic">
          Nobody has tapped this notification yet.
        </p>
      ) : (
        <div>
          <p className="text-[0.7rem] uppercase tracking-wide font-semibold text-[var(--text-muted,#9ca3af)] mb-1.5">
            Latest tappers
          </p>
          <ul className="space-y-1">
            {ctr.clickers.slice(0, 5).map((c) => (
              <li
                key={c.user_id + c.clicked_at}
                className="flex items-center justify-between gap-2 text-[0.75rem]"
              >
                <span className="text-[var(--brown-800,#3d2418)] truncate">
                  {c.name || c.email || c.user_id.slice(0, 8)}
                  {c.role && (
                    <span className="ml-1 text-[var(--text-muted,#9ca3af)] uppercase text-[0.65rem]">
                      · {c.role}
                    </span>
                  )}
                </span>
                <span className="text-[var(--text-muted,#9ca3af)] whitespace-nowrap">
                  {new Date(c.clicked_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
          {ctr.clickers.length > 5 && (
            <p className="text-[0.7rem] text-[var(--text-muted,#9ca3af)] mt-1.5 italic">
              + {ctr.clickers.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--cream-100,#fafafa)] rounded-[8px] px-2.5 py-1.5">
      <div className="text-[var(--text-muted,#9ca3af)] uppercase tracking-wide font-semibold text-[0.65rem]">
        {label}
      </div>
      <div className="font-bold text-[0.85rem] text-[var(--brown-800,#3d2418)] mt-0.5">
        {value}
      </div>
    </div>
  );
}
