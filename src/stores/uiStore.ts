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

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activePanel: "home",
  activeModal: null,
  homeOccasion: null,

  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  closeSidebar: () =>
    set({ sidebarOpen: false }),

  setPanel: (panel) =>
    set({ activePanel: panel, sidebarOpen: false }),

  openModal: (modal) =>
    set({ activeModal: modal }),

  closeModal: () =>
    set({ activeModal: null }),

  setHomeOccasion: (occasion) =>
    set({ homeOccasion: occasion }),
}));