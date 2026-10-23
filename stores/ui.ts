"use client";

import { create } from "zustand";

export type ThemeId = "obsidian" | "arctic" | "ember" | "forest" | "ultraviolet";

const THEME_KEY = "nexus-theme";

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "obsidian";
  const t = window.localStorage.getItem(THEME_KEY);
  return (["obsidian", "arctic", "ember", "forest", "ultraviolet"] as ThemeId[]).includes(t as ThemeId)
    ? (t as ThemeId)
    : "obsidian";
}

interface UIState {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  conductorOpen: boolean;
  setConductorOpen: (v: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (v: boolean) => void;
  lastEventId: string;
  tick: number;
  pulse: (id: string) => void;
}

export const useUI = create<UIState>((set) => ({
  theme: "obsidian",
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  conductorOpen: false,
  setConductorOpen: (conductorOpen) => set({ conductorOpen }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  notificationsOpen: false,
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  lastEventId: "",
  tick: 0,
  pulse: (id) => set((s) => ({ lastEventId: id, tick: s.tick + 1 })),
}));

export const THEME_NAMES: Record<ThemeId, string> = {
  obsidian: "Obsidian",
  arctic: "Arctic",
  ember: "Ember",
  forest: "Forest",
  ultraviolet: "Ultraviolet",
};