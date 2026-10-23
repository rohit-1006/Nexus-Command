"use client";

import { useEffect, useState } from "react";
import { getStoredTheme, useUI } from "@/stores/ui";

export function useTheme() {
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored && stored !== theme) setTheme(stored);
    else document.documentElement.dataset.theme = theme;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { theme, setTheme };
}

export function useThemeColors(): Record<string, string> {
  const [, force] = useState(0);
  useEffect(() => {
    const apply = () => force((x) => x + 1);
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const cs = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  return {
    bg: cs?.getPropertyValue("--bg").trim() || "#0a0a0f",
    panel: cs?.getPropertyValue("--panel").trim() || "#12121b",
    panel2: cs?.getPropertyValue("--panel-2").trim() || "#181824",
    ink: cs?.getPropertyValue("--ink").trim() || "#f2f2f6",
    mut: cs?.getPropertyValue("--mut").trim() || "#8d8da0",
    acc: cs?.getPropertyValue("--acc").trim() || "#8b93ff",
    ok: cs?.getPropertyValue("--ok").trim() || "#34d399",
    warn: cs?.getPropertyValue("--warn").trim() || "#fbbf24",
    crit: cs?.getPropertyValue("--crit").trim() || "#f87171",
    info: cs?.getPropertyValue("--info").trim() || "#22d3ee",
    line: cs?.getPropertyValue("--line").trim() || "rgba(255,255,255,0.07)",
    chart1: cs?.getPropertyValue("--chart-1").trim() || "#8b93ff",
    chart2: cs?.getPropertyValue("--chart-2").trim() || "#34d399",
    chart3: cs?.getPropertyValue("--chart-3").trim() || "#22d3ee",
    chart4: cs?.getPropertyValue("--chart-4").trim() || "#fbbf24",
    chart5: cs?.getPropertyValue("--chart-5").trim() || "#f472b6",
    chart6: cs?.getPropertyValue("--chart-6").trim() || "#a78bfa",
  } as Record<string, string>;
}

export function useClock(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}