"use client";

import { useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { MapPin, Bell, User, ArrowRight, Lock } from "lucide-react";
import NotificationSettingsPanel from "./NotificationSettingsPanel";
import PrivacySecurityPanel from "./PrivacySecurityPanel";

/**
 * Settings index — drives the customer "Settings" tab.
 *
 * Round 4: the Notifications row no longer shows a "SOON" tag — it
 * opens an inline sub-screen wired to /users/me/notification-preferences.
 * Privacy & security likewise opens an inline sub-screen (change
 * password + delete account).
 */
type SettingsView = "index" | "notifications" | "privacy";

export default function SettingsPanel() {
  const { setPanel } = useUIStore();
  const { user } = useAuthStore();
  const [view, setView] = useState<SettingsView>("index");

  if (view === "notifications") {
    return <NotificationSettingsPanel onBack={() => setView("index")} />;
  }

  if (view === "privacy") {
    return <PrivacySecurityPanel onBack={() => setView("index")} />;
  }

  const items = [
    {
      icon: <User className="w-5 h-5" />,
      title: "Profile details",
      desc: "Name, phone, profile photo",
      action: () => setPanel("profile"),
      available: true,
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: "Delivery address",
      desc: user?.address ? user.address : "No address saved yet",
      action: () => setPanel("profile"),
      available: true,
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: "Notifications",
      desc: "Push, email and SMS preferences",
      action: () => setView("notifications"),
      available: true,
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Privacy & security",
      desc: "Password and account deletion",
      action: () => setView("privacy"),
      available: true,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-[20px] p-6 md:p-8 border border-[rgba(212,114,26,0.06)]">
        <div className="font-display text-[1.4rem] font-[900] text-[var(--brown-800)]">
          Settings
        </div>
        <p className="text-[0.85rem] text-[var(--text-muted)] mt-1 mb-5">
          Manage your account preferences
        </p>

        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.title}
              onClick={item.action}
              disabled={!item.available}
              className={`w-full flex items-center gap-3 p-3.5 rounded-[12px] border text-left transition-all ${
                item.available
                  ? "bg-white border-[rgba(212,114,26,0.08)] hover:bg-[var(--cream-100)] cursor-pointer"
                  : "bg-[var(--cream-100)]/50 border-transparent opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,114,26,0.08)] flex items-center justify-center text-[var(--orange-500)] shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[0.9rem] text-[var(--brown-800)]">
                  {item.title}
                  {!item.available && (
                    <span className="ml-2 text-[0.65rem] font-bold text-[var(--text-muted)] bg-[var(--cream-100)] px-1.5 py-0.5 rounded">
                      SOON
                    </span>
                  )}
                </div>
                <div className="text-[0.78rem] text-[var(--text-muted)] truncate">
                  {item.desc}
                </div>
              </div>
              {item.available && (
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
