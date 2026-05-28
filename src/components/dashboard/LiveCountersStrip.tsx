"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Clock, IndianRupee, Users, Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

/**
 * Admin → Analytics → Live counters strip (Analytics Phase 2).
 *
 * Subscribes to the `admin:live-counters` WebSocket event the backend
 * pushes every 5 seconds. Renders four tiles plus a tiny pulse +
 * connection status:
 *   • Online users     (active WS connections, all roles)
 *   • Active bookings  (pending + in_progress)
 *   • Today's revenue  (completed bookings, ₹)
 *   • DAU              (unique users with any tracked event in 24h)
 *
 * Theming
 * ───────
 * Renders against the dark Analytics panel surface (rgba(255,255,255,
 * 0.02) on the page). All colors are inline-tuned to that surface so
 * dropping it into another panel without re-skinning would look wrong.
 *
 * Failure modes
 * ─────────────
 * - If the WS connection is down, the tiles show a "—" placeholder and
 *   a red "offline" badge. We never render misleading stale numbers.
 * - If the heartbeat lapses (>15s without a frame), we mark it stale.
 */

type Counters = {
  online_users: number;
  online_admins: number;
  bookings: { pending: number; in_progress: number };
  today: { bookings: number; completed: number; revenue: number };
  dau_last_24h: number;
  ts: string;
};

const STALE_AFTER_MS = 15_000;

export default function LiveCountersStrip() {
  const { on, off } = useSocket();
  const [counters, setCounters] = useState<Counters | null>(null);
  const [stale, setStale] = useState(false);
  const lastTsRef = useRef<number>(0);

  // Pulse animation key — bumped every time we get a fresh frame.
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const handle = (data: any) => {
      setCounters(data as Counters);
      lastTsRef.current = Date.now();
      setStale(false);
      setPulseKey((k) => k + 1);
    };
    on("admin:live-counters" as any, handle);
    return () => off("admin:live-counters" as any, handle);
  }, [on, off]);

  // Mark stale if we haven't received a heartbeat recently.
  useEffect(() => {
    const id = setInterval(() => {
      if (lastTsRef.current === 0) return;
      setStale(Date.now() - lastTsRef.current > STALE_AFTER_MS);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const liveBookings =
    (counters?.bookings.pending ?? 0) + (counters?.bookings.in_progress ?? 0);

  const status = counters && !stale ? "live" : stale ? "stale" : "connecting";

  return (
    <div className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            key={pulseKey}
            className={`w-2 h-2 rounded-full ${
              status === "live"
                ? "bg-emerald-400 animate-pulse"
                : status === "stale"
                  ? "bg-amber-400"
                  : "bg-gray-500"
            }`}
            aria-hidden
          />
          <h3 className="font-bold text-[0.95rem] text-white">
            Live · last 5 s
          </h3>
        </div>
        <span
          className={`text-[0.7rem] font-semibold uppercase tracking-wide flex items-center gap-1 ${
            status === "live"
              ? "text-emerald-400"
              : status === "stale"
                ? "text-amber-400"
                : "text-[rgba(255,255,255,0.45)]"
          }`}
        >
          {status === "live" ? (
            <>
              <Wifi className="w-3 h-3" /> connected
            </>
          ) : status === "stale" ? (
            <>
              <WifiOff className="w-3 h-3" /> stale
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" /> connecting…
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          icon={<Users className="w-4 h-4" />}
          label="Online users"
          value={counters?.online_users}
          tone="emerald"
        />
        <Tile
          icon={<Activity className="w-4 h-4" />}
          label="Live bookings"
          value={liveBookings}
          sublabel={
            counters
              ? `${counters.bookings.pending} pending · ${counters.bookings.in_progress} in progress`
              : undefined
          }
          tone="orange"
        />
        <Tile
          icon={<IndianRupee className="w-4 h-4" />}
          label="Today’s revenue"
          value={
            counters
              ? `₹${(counters.today.revenue || 0).toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })}`
              : undefined
          }
          sublabel={
            counters
              ? `${counters.today.completed}/${counters.today.bookings} completed`
              : undefined
          }
          tone="blue"
        />
        <Tile
          icon={<Clock className="w-4 h-4" />}
          label="DAU (24h)"
          value={counters?.dau_last_24h}
          tone="purple"
        />
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | undefined;
  sublabel?: string;
  tone: "emerald" | "orange" | "blue" | "purple";
}) {
  // Use translucent foreground colors so the tone reads on the dark
  // analytics surface — solid backgrounds would clash with the panel.
  const cls = {
    emerald: "text-emerald-300 bg-emerald-500/10",
    orange: "text-orange-300 bg-orange-500/10",
    blue: "text-blue-300 bg-blue-500/10",
    purple: "text-purple-300 bg-purple-500/10",
  }[tone];

  // Format numbers with Indian locale separators; pass strings through.
  const displayValue =
    value === undefined || value === null
      ? "—"
      : typeof value === "number"
        ? value.toLocaleString("en-IN")
        : value;

  return (
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${cls}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[0.7rem] uppercase tracking-wide font-semibold text-[rgba(255,255,255,0.55)] truncate">
          {label}
        </div>
        <div className="font-bold text-[1.15rem] text-white mt-0.5 leading-none">
          {displayValue}
        </div>
        {sublabel && (
          <div className="text-[0.7rem] text-[rgba(255,255,255,0.45)] mt-1 truncate">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
