"use client";

import { THEME_NAMES, type ThemeId } from "@/stores/ui";
import { useTheme } from "@/hooks/use-theme";
import { Palette } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const THEME_SWATCHES: Array<{ id: ThemeId; bg: string; acc: string }> = [
  { id: "obsidian", bg: "#0a0a0f", acc: "#8b93ff" },
  { id: "arctic", bg: "#eef2f8", acc: "#2563eb" },
  { id: "ember", bg: "#120d08", acc: "#f59e0b" },
  { id: "forest", bg: "#08100b", acc: "#34d399" },
  { id: "ultraviolet", bg: "#0b0814", acc: "#a78bfa" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Popover
      trigger={
        <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel text-mut transition-colors hover:border-line-strong hover:text-ink">
          <Palette className="h-4 w-4" />
        </button>
      }
      className="w-56"
    >
      <div className="p-2">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-mut2">Theme</div>
        {THEME_SWATCHES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-panel2",
              theme === t.id && "bg-acc/10",
            )}
          >
            <span
              className="h-6 w-6 rounded-md border border-line-strong"
              style={{ background: t.bg, boxShadow: `inset 0 0 0 2px ${t.acc}33` }}
            />
            <span className={theme === t.id ? "text-ink" : "text-mut"}>{THEME_NAMES[t.id]}</span>
            {theme === t.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-acc" />}
          </button>
        ))}
      </div>
    </Popover>
  );
}