"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function fetchNotifications() {
    try {
      const res = await notificationsApi.getAll({ limit: 10 });
      const data = res.data?.data || res.data;
      const items = data?.notifications || (Array.isArray(data) ? data : []);
      setNotifications(items);
      setUnreadCount(data?.unread_count || items.filter((n: any) => !n.is_read).length);
    } catch {
      // Silently fail — notifications aren't critical
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-transparent border-none cursor-pointer relative p-1.5"
      >
        <Bell className="w-[22px] h-[22px] text-[var(--brown-800)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[0.6rem] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[420px] bg-white rounded-[16px] border border-[rgba(212,114,26,0.08)] shadow-[0_8px_32px_rgba(26,15,10,0.12)] z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(212,114,26,0.06)]">
            <div className="font-bold text-[0.92rem]">Notifications</div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[0.78rem] text-[var(--orange-500)] font-semibold bg-transparent border-none cursor-pointer"
                style={{ fontFamily: "var(--font-body)" }}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[350px]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-[0.85rem] text-[var(--text-muted)]">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={cn(
                    "px-4 py-3 border-b border-[rgba(212,114,26,0.04)] cursor-pointer transition-colors hover:bg-[rgba(212,114,26,0.02)]",
                    !n.is_read && "bg-[rgba(212,114,26,0.03)]"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[var(--orange-500)] mt-1.5 shrink-0" />
                    )}
                    <div className={cn("flex-1", n.is_read && "ml-[18px]")}>
                      <div className="font-semibold text-[0.85rem] text-[var(--brown-800)]">{n.title}</div>
                      <div className="text-[0.78rem] text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[0.7rem] text-[var(--text-muted)] mt-1 opacity-60">{formatTime(n.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
