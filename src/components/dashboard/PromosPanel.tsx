"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  Hash,
  History,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Ticket,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { adminApi } from "@/lib/api";

/**
 * Admin → Promo Manager (Round 4).
 *
 * Single-screen CRUD:
 *   • Status-filter chips (all / active / inactive / expired / exhausted)
 *     with a search box that matches against `code` and `description`.
 *   • "New promo" button opens a side-drawer composer with a code
 *     generator helper.
 *   • Each row shows a one-glance summary (code chip, type badge,
 *     used / max bar, expiry, status pill) plus row actions
 *     (toggle, edit, view usages, delete).
 *   • Delete is gated server-side: if the promo has been redeemed the
 *     API returns 409 with a friendly message which we surface in
 *     the toast — the UI then suggests deactivation instead.
 */

type PromoType = "percentage" | "flat" | "free_visit";

type Promo = {
  id: string;
  code: string;
  type: PromoType;
  value: string | number;
  max_discount: string | number | null;
  min_order_amount: string | number;
  is_active: boolean;
  single_use: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type StatusFilter = "all" | "active" | "inactive" | "expired" | "exhausted";

const TYPE_LABEL: Record<PromoType, string> = {
  percentage: "Percentage",
  flat: "Flat ₹",
  free_visit: "Free visit",
};

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const num = (v: string | number | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v) || 0;

const fmtINR = (v: string | number | null | undefined) =>
  `₹${num(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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

/** A promo is "live" when it would actually apply at this instant. */
const isLive = (p: Promo): boolean => {
  if (!p.is_active) return false;
  if (p.expires_at && new Date(p.expires_at) <= new Date()) return false;
  if (p.max_uses != null && p.used_count >= p.max_uses) return false;
  return true;
};

/** Mirrors the backend's `?status=` semantics in client-side land. */
const matchesStatus = (p: Promo, status: StatusFilter): boolean => {
  switch (status) {
    case "all":
      return true;
    case "active":
      return isLive(p);
    case "inactive":
      return !p.is_active;
    case "expired":
      return p.expires_at != null && new Date(p.expires_at) <= new Date();
    case "exhausted":
      return p.max_uses != null && p.used_count >= p.max_uses;
  }
};

/**
 * Pick a random alphabetic+digit string for the "Generate code" button.
 * We avoid 0/O and 1/I/L so admins reading codes over the phone
 * don't get tripped up.
 */
function generateCode(prefix = "COC", length = 6): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}${suffix}`;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export default function PromosPanel() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Composer / editor: when `editing` is null we're in create mode.
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);

  // Usage drawer
  const [usagesFor, setUsagesFor] = useState<Promo | null>(null);

  const fetchPromos = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await adminApi.promos.list();
        const body = (res.data as any)?.data ?? res.data;
        setPromos(Array.isArray(body) ? body : body?.data ?? []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load promo codes.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  // Auto-clear success toast.
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // ─── Filtering ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return promos.filter((p) => {
      if (!matchesStatus(p, filter)) return false;
      if (!term) return true;
      return (
        p.code.toLowerCase().includes(term) ||
        (p.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [promos, filter, search]);

  const counts = useMemo(() => {
    const live = promos.filter(isLive).length;
    const inactive = promos.filter((p) => !p.is_active).length;
    const expired = promos.filter(
      (p) => p.expires_at != null && new Date(p.expires_at) <= new Date(),
    ).length;
    const exhausted = promos.filter(
      (p) => p.max_uses != null && p.used_count >= p.max_uses,
    ).length;
    return { live, inactive, expired, exhausted, total: promos.length };
  }, [promos]);

  // ─── Actions ─────────────────────────────────────────────
  const handleToggle = async (p: Promo) => {
    try {
      await adminApi.promos.toggle(p.id);
      setSuccess(
        `Promo "${p.code}" ${p.is_active ? "deactivated" : "activated"}.`,
      );
      fetchPromos(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not toggle promo.",
      );
    }
  };

  const handleDelete = async (p: Promo) => {
    const ok = window.confirm(
      `Permanently delete promo "${p.code}"?\n\n` +
        `This cannot be undone. If the promo has already been used, ` +
        `the server will block the delete and ask you to deactivate ` +
        `instead.`,
    );
    if (!ok) return;
    try {
      await adminApi.promos.remove(p.id);
      setSuccess(`Promo "${p.code}" deleted.`);
      fetchPromos(true);
    } catch (err: any) {
      // 409 conflict surfaces the "has been used N times" message —
      // pass it through verbatim so the admin learns *why* the
      // delete didn't go through.
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not delete promo.";
      setError(Array.isArray(msg) ? msg.join(" · ") : String(msg));
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => setSuccess(`Copied "${code}" to clipboard.`),
      () => undefined,
    );
  };

  const openCreate = () => {
    setEditing(null);
    setComposerOpen(true);
  };
  const openEdit = (p: Promo) => {
    setEditing(p);
    setComposerOpen(true);
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[var(--orange-500)]/15 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-[var(--orange-500)]" />
          </div>
          <div>
            <h2 className="font-bold text-[1.05rem]">Promo Codes</h2>
            <p className="text-[0.8rem] text-[var(--text-muted,#6b7280)]">
              Generate, edit and revoke promo codes. Every action is recorded
              in the audit log.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchPromos(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.85rem] font-semibold flex items-center gap-2 hover:border-[var(--orange-500)] disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-[10px] bg-[var(--orange-500)] hover:bg-[var(--orange-400)] text-white text-[0.85rem] font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New promo
          </button>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-red-50 border border-red-200 text-red-800 text-[0.82rem]">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[0.82rem]">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total" value={counts.total} icon={<Tag className="w-4 h-4" />} />
        <KpiTile
          label="Live"
          value={counts.live}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="emerald"
        />
        <KpiTile
          label="Inactive"
          value={counts.inactive}
          icon={<ToggleLeft className="w-4 h-4" />}
          tone="gray"
        />
        <KpiTile
          label="Expired"
          value={counts.expired}
          icon={<Clock className="w-4 h-4" />}
          tone="amber"
        />
        <KpiTile
          label="Exhausted"
          value={counts.exhausted}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="red"
        />
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "active", "inactive", "expired", "exhausted"] as StatusFilter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-[var(--orange-500)] text-white"
                  : "bg-white border border-[rgba(0,0,0,0.08)] text-[var(--brown-800,#3d2418)] hover:border-[var(--orange-500)]"
              }`}
            >
              {f}
            </button>
          ),
        )}
        <div className="flex-1 min-w-[200px]" />
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#9ca3af)]" />
          <input
            type="text"
            placeholder="Search code or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-[10px] border border-[rgba(0,0,0,0.08)] text-[0.85rem] bg-white focus:outline-none focus:border-[var(--orange-500)] w-[260px]"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-muted,#6b7280)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading promo codes…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[0.88rem] text-[var(--text-muted,#6b7280)]">
            {promos.length === 0
              ? "No promo codes yet. Click New promo to create one."
              : "No promos match the current filter."}
          </div>
        ) : (
          <ul className="divide-y divide-[rgba(0,0,0,0.06)]">
            {filtered.map((p) => (
              <PromoRow
                key={p.id}
                promo={p}
                onCopy={() => handleCopy(p.code)}
                onToggle={() => handleToggle(p)}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p)}
                onUsages={() => setUsagesFor(p)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Composer / editor */}
      {composerOpen && (
        <PromoComposer
          editing={editing}
          existingCodes={promos.map((p) => p.code)}
          onClose={() => setComposerOpen(false)}
          onSaved={(msg) => {
            setSuccess(msg);
            setComposerOpen(false);
            fetchPromos(true);
          }}
        />
      )}

      {/* Usages drawer */}
      {usagesFor && (
        <UsagesDrawer promo={usagesFor} onClose={() => setUsagesFor(null)} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  icon,
  tone = "orange",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "orange" | "emerald" | "gray" | "amber" | "red";
}) {
  const toneClass = {
    orange: "text-[var(--orange-500)] bg-[var(--orange-500)]/12",
    emerald: "text-emerald-600 bg-emerald-100",
    gray: "text-gray-500 bg-gray-100",
    amber: "text-amber-600 bg-amber-100",
    red: "text-red-600 bg-red-100",
  }[tone];

  return (
    <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.06)] p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[0.7rem] uppercase tracking-wide font-semibold text-[var(--text-muted,#9ca3af)]">
          {label}
        </div>
        <div className="font-bold text-[1.1rem] text-[var(--brown-800,#3d2418)]">
          {value.toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

function PromoRow({
  promo: p,
  onCopy,
  onToggle,
  onEdit,
  onDelete,
  onUsages,
}: {
  promo: Promo;
  onCopy: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUsages: () => void;
}) {
  const live = isLive(p);
  const expired =
    p.expires_at != null && new Date(p.expires_at) <= new Date();
  const exhausted =
    p.max_uses != null && p.used_count >= p.max_uses;

  // Status pill style picker — order matters; "expired" beats "live"
  // even when is_active is still true.
  const statusPill = (() => {
    if (expired) return { text: "Expired", cls: "bg-amber-100 text-amber-700" };
    if (exhausted) return { text: "Exhausted", cls: "bg-red-100 text-red-700" };
    if (live) return { text: "Live", cls: "bg-emerald-100 text-emerald-700" };
    return { text: "Inactive", cls: "bg-gray-100 text-gray-600" };
  })();

  const valueLabel =
    p.type === "percentage"
      ? `${num(p.value)}% off${
          p.max_discount ? ` (max ${fmtINR(p.max_discount)})` : ""
        }`
      : p.type === "flat"
        ? `${fmtINR(p.value)} off`
        : "Free visit fee";

  // Simple progress bar for max_uses promos.
  const usagePct =
    p.max_uses != null ? Math.min(100, (p.used_count / p.max_uses) * 100) : 0;

  return (
    <li className="px-4 py-3.5 flex items-start gap-4 hover:bg-[var(--cream-50,#fffaf5)]">
      {/* Left: code chip + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-[0.95rem] text-[var(--brown-800,#3d2418)] tracking-wide">
            {p.code}
          </span>
          <button
            onClick={onCopy}
            className="p-1 rounded hover:bg-[var(--orange-500)]/10 text-[var(--text-muted,#6b7280)] hover:text-[var(--orange-500)]"
            title="Copy code"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-semibold uppercase tracking-wide ${statusPill.cls}`}>
            {statusPill.text}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--orange-500)]/12 text-[var(--orange-500)] text-[0.7rem] font-semibold uppercase tracking-wide">
            {TYPE_LABEL[p.type]}
          </span>
          {p.single_use && (
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[0.7rem] font-semibold uppercase tracking-wide">
              1 / user
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-[var(--text-muted,#4b5563)]">
          <span className="font-semibold text-[var(--brown-800,#3d2418)]">
            {valueLabel}
          </span>
          {num(p.min_order_amount) > 0 && (
            <span>min order {fmtINR(p.min_order_amount)}</span>
          )}
          <span>expires {fmtDate(p.expires_at)}</span>
        </div>

        {p.description && (
          <p className="mt-1 text-[0.78rem] text-[var(--text-muted,#6b7280)] line-clamp-1">
            {p.description}
          </p>
        )}

        {/* Usage progress */}
        <div className="mt-2 flex items-center gap-2 max-w-md">
          <span className="text-[0.72rem] text-[var(--text-muted,#9ca3af)] whitespace-nowrap">
            {p.used_count.toLocaleString("en-IN")}
            {p.max_uses != null
              ? ` / ${p.max_uses.toLocaleString("en-IN")}`
              : " uses"}
          </span>
          {p.max_uses != null && (
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  usagePct >= 100
                    ? "bg-red-500"
                    : usagePct >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <IconBtn title="Usage history" onClick={onUsages}>
          <History className="w-4 h-4" />
        </IconBtn>
        <IconBtn title={p.is_active ? "Deactivate" : "Activate"} onClick={onToggle}>
          {p.is_active ? (
            <ToggleRight className="w-4 h-4 text-emerald-600" />
          ) : (
            <ToggleLeft className="w-4 h-4 text-gray-400" />
          )}
        </IconBtn>
        <IconBtn title="Edit" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </IconBtn>
        <IconBtn title="Delete" onClick={onDelete} danger>
          <Trash2 className="w-4 h-4" />
        </IconBtn>
      </div>
    </li>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-[8px] hover:bg-gray-100 ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-[var(--text-muted,#6b7280)] hover:text-[var(--brown-800,#3d2418)]"
      }`}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────
// Composer (create + edit)
// ────────────────────────────────────────────────────────────────

function PromoComposer({
  editing,
  existingCodes,
  onClose,
  onSaved,
}: {
  editing: Promo | null;
  existingCodes: string[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isEdit = !!editing;
  const [code, setCode] = useState(editing?.code ?? "");
  const [type, setType] = useState<PromoType>(
    (editing?.type as PromoType) ?? "percentage",
  );
  const [value, setValue] = useState<string>(
    editing ? String(num(editing.value)) : "",
  );
  const [maxDiscount, setMaxDiscount] = useState<string>(
    editing?.max_discount != null ? String(num(editing.max_discount)) : "",
  );
  const [minOrder, setMinOrder] = useState<string>(
    editing ? String(num(editing.min_order_amount)) : "",
  );
  const [singleUse, setSingleUse] = useState<boolean>(
    editing?.single_use ?? false,
  );
  const [maxUses, setMaxUses] = useState<string>(
    editing?.max_uses != null ? String(editing.max_uses) : "",
  );
  // Backend wants ISO 8601. <input type="datetime-local"> emits
  // 'YYYY-MM-DDTHH:mm' — we coerce to a UTC ISO on submit.
  const [expiresAt, setExpiresAt] = useState<string>(
    editing?.expires_at
      ? new Date(editing.expires_at).toISOString().slice(0, 16)
      : "",
  );
  const [description, setDescription] = useState<string>(
    editing?.description ?? "",
  );
  const [isActive, setIsActive] = useState<boolean>(editing?.is_active ?? true);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ─── Validation (mirrors server DTO) ─────────────────────
  const validation = useMemo(() => {
    if (!isEdit) {
      const trimmed = code.trim();
      if (!trimmed) return { ok: false, msg: "Code is required." };
      if (!/^[A-Z0-9_-]+$/i.test(trimmed))
        return {
          ok: false,
          msg: "Code can only contain letters, digits, hyphen or underscore.",
        };
      if (trimmed.length < 2 || trimmed.length > 20)
        return { ok: false, msg: "Code must be 2–20 characters." };
      const upper = trimmed.toUpperCase();
      if (existingCodes.some((c) => c.toUpperCase() === upper))
        return { ok: false, msg: `Code "${upper}" already exists.` };
    }
    const v = Number(value);
    if (Number.isNaN(v) || v < 0)
      return { ok: false, msg: "Value must be 0 or higher." };
    if (type === "percentage" && v > 100)
      return { ok: false, msg: "Percentage cannot exceed 100." };
    if (description.length > 500)
      return { ok: false, msg: "Description is too long (max 500)." };
    return { ok: true, msg: "" };
  }, [isEdit, code, value, type, description, existingCodes]);

  const handleGenerate = () => setCode(generateCode());

  const handleSave = async () => {
    if (!validation.ok || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const payloadShared = {
        type,
        value: Number(value),
        max_discount: maxDiscount === "" ? null : Number(maxDiscount),
        min_order_amount: minOrder === "" ? 0 : Number(minOrder),
        single_use: singleUse,
        max_uses: maxUses === "" ? null : Number(maxUses),
        expires_at: expiresAt
          ? new Date(expiresAt).toISOString()
          : null,
        description: description.trim() || undefined,
        is_active: isActive,
      };

      if (isEdit && editing) {
        await adminApi.promos.update(editing.id, payloadShared as any);
        onSaved(`Promo "${editing.code}" updated.`);
      } else {
        await adminApi.promos.create({
          code: code.trim().toUpperCase(),
          ...payloadShared,
          // create() requires non-null fields where allowed
          max_discount: payloadShared.max_discount ?? undefined,
          max_uses: payloadShared.max_uses ?? undefined,
          expires_at: payloadShared.expires_at ?? undefined,
        } as any);
        onSaved(`Promo "${code.trim().toUpperCase()}" created.`);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Save failed.";
      setErr(Array.isArray(msg) ? msg.join(" · ") : String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/40">
      <div className="bg-white w-full sm:w-[480px] h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[rgba(0,0,0,0.06)] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[1rem]">
              {isEdit ? `Edit "${editing!.code}"` : "New promo code"}
            </h3>
            <p className="text-[0.75rem] text-[var(--text-muted,#9ca3af)]">
              {isEdit
                ? "Code is locked once created — change other fields freely."
                : "Generate or type a code, pick a type, set a value."}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Code */}
          <Field
            label="Code"
            hint={isEdit ? "Code cannot be changed after creation." : undefined}
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#9ca3af)]" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={isEdit}
                  maxLength={20}
                  placeholder="WELCOME20"
                  className="w-full pl-9 pr-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] font-mono tracking-wider focus:outline-none focus:border-[var(--orange-500)] disabled:bg-gray-50 disabled:text-[var(--text-muted,#9ca3af)]"
                />
              </div>
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-3 py-2.5 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.82rem] font-semibold hover:border-[var(--orange-500)] whitespace-nowrap"
                >
                  Generate
                </button>
              )}
            </div>
          </Field>

          {/* Type */}
          <Field label="Type">
            <div className="grid grid-cols-3 gap-2">
              {(["percentage", "flat", "free_visit"] as PromoType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-[10px] border text-[0.8rem] font-semibold capitalize ${
                    type === t
                      ? "border-[var(--orange-500)] bg-[var(--orange-500)]/8 text-[var(--orange-500)]"
                      : "border-[rgba(0,0,0,0.08)] bg-white hover:border-[var(--orange-500)]/40"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </Field>

          {/* Value */}
          <Field
            label={
              type === "percentage"
                ? "Discount %"
                : type === "flat"
                  ? "Flat amount (₹)"
                  : "Value (informational)"
            }
            hint={
              type === "free_visit"
                ? "Free-visit promos waive the visit fee — value is unused."
                : undefined
            }
          >
            <div className="relative">
              {type === "percentage" ? (
                <Percent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#9ca3af)]" />
              ) : type === "flat" ? (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#9ca3af)] text-[0.9rem]">
                  ₹
                </span>
              ) : (
                <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#9ca3af)]" />
              )}
              <input
                type="number"
                step="0.01"
                min={0}
                max={type === "percentage" ? 100 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] focus:outline-none focus:border-[var(--orange-500)]"
              />
            </div>
          </Field>

          {/* Max discount + min order */}
          {type === "percentage" && (
            <Field
              label="Max discount cap (₹)"
              hint="Leave empty for no cap. Useful for high-value carts."
            >
              <input
                type="number"
                step="1"
                min={0}
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="200"
                className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] focus:outline-none focus:border-[var(--orange-500)]"
              />
            </Field>
          )}

          <Field label="Minimum order amount (₹)">
            <input
              type="number"
              step="1"
              min={0}
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] focus:outline-none focus:border-[var(--orange-500)]"
            />
          </Field>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total uses cap" hint="Leave empty = unlimited.">
              <input
                type="number"
                step="1"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] focus:outline-none focus:border-[var(--orange-500)]"
              />
            </Field>
            <Field label="Expires at" hint="Local time. Leave empty for none.">
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] focus:outline-none focus:border-[var(--orange-500)]"
              />
            </Field>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4 flex-wrap">
            <Toggle
              checked={singleUse}
              onChange={setSingleUse}
              label="One use per customer"
            />
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              label="Active immediately"
            />
          </div>

          {/* Description */}
          <Field label="Description (internal)" hint={`${description.length}/500`}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={510}
              placeholder="Diwali launch campaign — drives first-time bookings."
              className="w-full px-3 py-2.5 rounded-[10px] border border-[rgba(0,0,0,0.08)] focus:outline-none focus:border-[var(--orange-500)] resize-none text-[0.88rem]"
            />
          </Field>

          {/* Validation / API error */}
          {!validation.ok && validation.msg && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-[0.82rem]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{validation.msg}</span>
            </div>
          )}
          {err && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] bg-red-50 border border-red-200 text-red-800 text-[0.82rem]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[rgba(0,0,0,0.06)] px-5 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.85rem] font-semibold hover:border-[var(--orange-500)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!validation.ok || saving}
            className="px-4 py-2 rounded-[10px] bg-[var(--orange-500)] hover:bg-[var(--orange-400)] text-white text-[0.85rem] font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isEdit ? "Save changes" : "Create promo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[0.78rem] font-semibold text-[var(--brown-800,#3d2418)]">
          {label}
        </span>
        {hint && (
          <span className="text-[0.7rem] text-[var(--text-muted,#9ca3af)]">
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[var(--orange-500)]"
      />
      <span className="text-[0.85rem] text-[var(--brown-800,#3d2418)]">
        {label}
      </span>
    </label>
  );
}

// ────────────────────────────────────────────────────────────────
// Usages drawer
// ────────────────────────────────────────────────────────────────

type UsageRow = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  booking_id: string | null;
  discount_applied: number;
  used_at: string;
};

function UsagesDrawer({ promo, onClose }: { promo: Promo; onClose: () => void }) {
  const [usages, setUsages] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await adminApi.promos.usages(promo.id, {
          page: 1,
          limit: 100,
        });
        const body = (res.data as any)?.data ?? res.data;
        if (active) setUsages(body?.usages ?? []);
      } catch (err: any) {
        if (active)
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load usages.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [promo.id]);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/40">
      <div className="bg-white w-full sm:w-[480px] h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-[rgba(0,0,0,0.06)] px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[1rem] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--orange-500)]" />
              Usage history
            </h3>
            <p className="text-[0.75rem] text-[var(--text-muted,#9ca3af)] font-mono">
              {promo.code}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted,#6b7280)]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : error ? (
            <div className="px-3 py-2 rounded-[8px] bg-red-50 border border-red-200 text-red-800 text-[0.82rem]">
              {error}
            </div>
          ) : usages.length === 0 ? (
            <div className="py-12 text-center text-[0.88rem] text-[var(--text-muted,#6b7280)]">
              This promo hasn’t been redeemed yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {usages.map((u) => (
                <li
                  key={u.id}
                  className="border border-[rgba(0,0,0,0.06)] rounded-[10px] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-[0.88rem] text-[var(--brown-800,#3d2418)] truncate">
                        {u.user_name || u.user_email || u.user_id}
                      </div>
                      {u.user_email && u.user_name && (
                        <div className="text-[0.72rem] text-[var(--text-muted,#9ca3af)] truncate">
                          {u.user_email}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-[0.88rem] text-emerald-600 whitespace-nowrap">
                      −{fmtINR(u.discount_applied)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[0.72rem] text-[var(--text-muted,#9ca3af)]">
                    <span>{fmtDate(u.used_at)}</span>
                    {u.booking_id && (
                      <span className="font-mono">
                        booking · {u.booking_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
