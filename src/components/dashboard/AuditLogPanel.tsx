"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, Filter } from "lucide-react";
import { adminApi } from "@/lib/api";

/**
 * Admin → Audit Log
 *
 * Reads the existing backend endpoint (GET /admin/audit-log) which logs
 * every privileged action: user toggle, cook verify/reject, booking
 * status overrides, area approvals, etc.
 *
 * Filters:
 *   • action — verify_cook | toggle_user_active | …
 *   • target_type — user | cook | booking | area_request
 *   • pagination — page / limit
 */

type AuditEntry = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: { id: string; name: string; email: string } | null;
};

type Pagination = { page: number; limit: number; total: number; total_pages: number };

const PAGE_LIMIT = 25;

export default function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pag, setPag] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [targetFilter, setTargetFilter] = useState<string>("");

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await adminApi.getAuditLog({
          page,
          limit: PAGE_LIMIT,
          action: actionFilter || undefined,
          target_type: targetFilter || undefined,
        });
        const body = res.data?.data ?? res.data;
        const items = (body?.data ?? body?.items ?? body) as AuditEntry[];
        const meta = (body?.pagination ?? body?.meta ?? null) as Pagination | null;
        setLogs(Array.isArray(items) ? items : []);
        setPag(meta);
      } catch (err) {
        console.error("[audit-log] fetch failed", err);
        setLogs([]);
        setPag(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, actionFilter, targetFilter],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[var(--orange-500)]/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[var(--orange-500)]" />
          </div>
          <div>
            <h2 className="font-bold text-[1.05rem]">Admin Activity Log</h2>
            <p className="text-[0.8rem] text-[var(--text-muted,#6b7280)]">
              Every privileged action by every admin, in chronological order.
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="px-3 py-2 rounded-[10px] bg-white border border-[rgba(0,0,0,0.08)] text-[0.85rem] font-semibold flex items-center gap-2 hover:border-[var(--orange-500)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />
        <select
          value={actionFilter}
          onChange={(e) => {
            setPage(1);
            setActionFilter(e.target.value);
          }}
          className="px-3 py-2 rounded-[8px] border border-[rgba(0,0,0,0.08)] text-[0.85rem] bg-white"
        >
          <option value="">All actions</option>
          <option value="verify_cook">verify_cook</option>
          <option value="reject_cook">reject_cook</option>
          <option value="toggle_user_active">toggle_user_active</option>
          <option value="update_booking_status">update_booking_status</option>
          <option value="approve_area_request">approve_area_request</option>
          <option value="reject_area_request">reject_area_request</option>
        </select>
        <select
          value={targetFilter}
          onChange={(e) => {
            setPage(1);
            setTargetFilter(e.target.value);
          }}
          className="px-3 py-2 rounded-[8px] border border-[rgba(0,0,0,0.08)] text-[0.85rem] bg-white"
        >
          <option value="">All targets</option>
          <option value="user">user</option>
          <option value="cook">cook</option>
          <option value="booking">booking</option>
          <option value="area_request">area_request</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--text-muted,#6b7280)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading audit log…
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 text-center border border-[rgba(0,0,0,0.06)]">
          <p className="text-[0.95rem] text-[var(--text-muted,#6b7280)]">
            No audit entries match the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pag && pag.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[0.82rem] text-[var(--text-muted,#6b7280)]">
            Page {pag.page} of {pag.total_pages} · {pag.total} total entries
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-[8px] border border-[rgba(0,0,0,0.08)] text-[0.85rem] bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pag.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-[8px] border border-[rgba(0,0,0,0.08)] text-[0.85rem] bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({ log }: { log: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(log.created_at).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-[12px] p-4 border border-[rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[0.88rem] text-[var(--brown-800,#3d2418)]">
              {log.action}
            </span>
            {log.target_type && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--orange-500)]/12 text-[var(--orange-500)] text-[0.72rem] font-semibold uppercase tracking-wide">
                {log.target_type}
              </span>
            )}
          </div>
          <div className="text-[0.8rem] text-[var(--text-muted,#6b7280)] mt-1">
            {log.admin?.email ?? "unknown admin"}
            {log.ip_address ? ` · ${log.ip_address}` : ""}
          </div>
          {log.target_id && (
            <div className="text-[0.75rem] text-[var(--text-muted,#9ca3af)] mt-0.5 font-mono">
              target: {log.target_id}
            </div>
          )}
        </div>
        <span className="text-[0.75rem] text-[var(--text-muted,#9ca3af)] whitespace-nowrap">
          {time}
        </span>
      </div>

      {log.details && Object.keys(log.details).length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[0.75rem] text-[var(--orange-500)] font-semibold hover:underline"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
          {expanded && (
            <pre className="mt-2 text-[0.72rem] bg-[var(--cream-100,#fafafa)] p-2.5 rounded-[8px] overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
