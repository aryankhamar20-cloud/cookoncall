"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/stores/authStore";
import { usersApi } from "@/lib/api";
import type { UserRole } from "@/types";

interface UseAuthOptions {
  /** Required role to access the page */
  requiredRole?: UserRole;
  /** Redirect URL if not authenticated */
  redirectTo?: string;
}

/**
 * Auth guard hook — checks JWT, loads user, redirects if unauthorized.
 * Returns `authorized` — false until auth + role check both pass.
 * Dashboard pages MUST gate all content behind `authorized` to prevent
 * wrong-role users from ever seeing the page.
 *
 * Round A Fix #2: Admin users are allowed to access customer dashboard.
 * They are NOT auto-redirected to /dashboard/admin. Admin goes there manually.
 *
 * Usage:
 *   const { user, isLoading, authorized } = useAuth({ requiredRole: "cook" });
 *   if (isLoading || !authorized) return <LoadingSpinner />;
 */
export function useAuth(options: UseAuthOptions = {}) {
  const { requiredRole, redirectTo = "/login" } = options;
  const router = useRouter();
  const { user, isLoading, isAuthenticated, login, setLoading, logout } =
    useAuthStore();

  useEffect(() => {
    async function checkAuth() {
      const token = Cookies.get("coc_token");

      if (!token) {
        setLoading(false);
        router.push(redirectTo);
        return;
      }

      // Already loaded
      if (user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await usersApi.getMe();
        login(data.data, token);
      } catch {
        // Token invalid — clear and redirect
        logout();
        Cookies.remove("coc_token");
        Cookies.remove("coc_refresh_token");
        router.push(redirectTo);
      }
    }

    checkAuth();
  }, [user, router, redirectTo, login, setLoading, logout]);

  // Role check — redirect to correct dashboard if role doesn't match
  // Round A Fix #2: Admin is allowed everywhere — do NOT redirect admin to /dashboard/admin
  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRole && user?.role !== requiredRole) {
      // Admin can access any dashboard — don't redirect them
      if (user?.role === "admin") {
        // Admin is allowed on customer and cook pages — do nothing
        return;
      }

      // Non-admin role mismatch — redirect to correct dashboard
      if (user?.role === "cook") {
        router.replace("/dashboard/cook");
      } else {
        router.replace("/dashboard/customer");
      }
    }
  }, [isLoading, isAuthenticated, requiredRole, user, router]);

  // Compute whether the page is authorized to render content
  // Round A Fix #2: Admin is always authorized (can access any page)
  const authorized =
    !isLoading &&
    isAuthenticated &&
    (!requiredRole || user?.role === requiredRole || user?.role === "admin");

  return { user, isLoading, isAuthenticated, authorized };
}
