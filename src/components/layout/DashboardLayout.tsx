"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { cn, getInitials } from "@/lib/utils";
import { LogOut, Menu } from "lucide-react";

export interface SidebarLink {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

export interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

interface DashboardLayoutProps {
  children: ReactNode;
  sections: SidebarSection[];
  roleLabel: string;
  headerRight?: ReactNode;
  titles: Record<string, string>;
}

export default function DashboardLayout({
  children,
  sections,
  roleLabel,
  headerRight,
  titles,
}: DashboardLayoutProps) {
  const { sidebarOpen, toggleSidebar, closeSidebar, activePanel, setPanel } =
    useUIStore();
  const { user, logout } = useAuthStore();

  const initials = user
    ? getInitials(user.name)
    : "G";
  const fullName = user
    ? [user.name, user.lastName].filter(Boolean).join(" ") || "Guest"
    : "Guest";

  return (
    <div className="flex min-h-screen bg-[var(--cream-100)]">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[99] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-[260px] fixed top-0 left-0 bottom-0 bg-[var(--brown-900)] text-white z-[100] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="px-[22px] pt-6 pb-5 border-b border-[rgba(255,255,255,0.06)]">
          <Link
            href="/"
            className="font-display text-2xl font-[900] text-white no-underline block"
          >
            COOK<span className="text-[var(--orange-500)]">ONCALL</span>
          </Link>
          <div className="flex items-center gap-3 mt-[18px]">
            <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-bold text-[0.9rem] text-white shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-semibold text-[0.9rem] leading-tight">
                {fullName}
              </div>
              <div className="text-[0.72rem] text-[rgba(255,255,255,0.4)] mt-0.5">
                {roleLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="text-[0.65rem] font-bold tracking-[1.5px] uppercase text-[rgba(255,255,255,0.2)] px-[22px] py-1.5">
                {section.title}
              </div>
              {section.links.map((link) => {
                const isActive = activePanel === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => setPanel(link.id)}
                    className={cn(
                      "flex items-center gap-3 px-[22px] py-[11px] text-[0.88rem] font-medium w-full text-left border-none bg-transparent cursor-pointer transition-all duration-200 relative",
                      isActive
                        ? "bg-[rgba(212,114,26,0.12)] text-[var(--orange-400)]"
                        : "text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[rgba(255,255,255,0.85)]"
                    )}
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-[3px] bg-[var(--orange-500)]" />
                    )}
                    <span className={cn("w-5 h-5 shrink-0", isActive ? "opacity-100" : "opacity-70")}>
                      {link.icon}
                    </span>
                    {link.label}
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="ml-auto bg-[var(--red-err)] text-white text-[0.65rem] font-bold px-[7px] py-0.5 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-[22px] py-4 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-[rgba(212,50,37,0.08)] rounded-[10px] text-[rgba(255,255,255,0.6)] text-[0.85rem] font-medium border-none cursor-pointer transition-all hover:bg-[rgba(212,50,37,0.15)] hover:text-white"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <LogOut className="w-[18px] h-[18px]" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[rgba(212,114,26,0.06)] px-5 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={toggleSidebar}
              className="lg:hidden bg-transparent border-none cursor-pointer p-1"
            >
              <Menu className="w-6 h-6 text-[var(--brown-800)]" />
            </button>
            <div className="font-bold text-[1.05rem] text-[var(--brown-800)]">
              {titles[activePanel] || "Dashboard"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {headerRight}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center font-bold text-[0.75rem] text-white">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-5 md:p-7">{children}</div>
      </div>
    </div>
  );
}
