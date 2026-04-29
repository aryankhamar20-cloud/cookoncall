import { create } from "zustand";
import Cookies from "js-cookie";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => set({ token }),

  setLoading: (isLoading) => set({ isLoading }),

  login: (user, token) =>
    set({ user, token, isAuthenticated: true, isLoading: false }),

  logout: () => {
    // Clear cookies
    Cookies.remove("coc_token");
    Cookies.remove("coc_refresh_token");
    // Clear store
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
}));
