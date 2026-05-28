import { create } from "zustand";

export type HomeOccasion = "birthday" | "daily" | "weekend" | "party" | null;

interface UIState {
  sidebarOpen: boolean;
  activePanel: string;
  activeModal: string | null;
  homeOccasion: HomeOccasion;

  toggleSidebar: () => void;
  closeSidebar: () => void;
  setPanel: (panel: string) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setHomeOccasion: (occasion: HomeOccasion) => void;
}

/** Read the ?panel= query param from the current URL (client-side only). */
export function getPanelFromUrl(): string {
  if (typeof window === "undefined") return "home";
  const p = new URLSearchParams(window.location.search).get("panel");
  return p || "home";
}

/** Write the ?panel= query param to the URL without a page reload. */
export function setPanelInUrl(panel: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (panel === "home") {
    url.searchParams.delete("panel");
  } else {
    url.searchParams.set("panel", panel);
  }
  window.history.replaceState({}, "", url.toString());
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activePanel: getPanelFromUrl(), // initialise from URL on first load
  activeModal: null,
  homeOccasion: null,

  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  closeSidebar: () =>
    set({ sidebarOpen: false }),

  setPanel: (panel) => {
    setPanelInUrl(panel);
    set({ activePanel: panel, sidebarOpen: false });
  },

  openModal: (modal) =>
    set({ activeModal: modal }),

  closeModal: () =>
    set({ activeModal: null }),

  setHomeOccasion: (occasion) =>
    set({ homeOccasion: occasion }),
}));
