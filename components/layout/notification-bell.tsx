"use client";

import { Bell } from "lucide-react";
import { useUI } from "@/stores/ui";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const open = useUI((s) => s.notificationsOpen);
  const setOpen = useUI((s) => s.setNotificationsOpen);
  const tick = useUI((s) => s.tick);

  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
        open
          ? "border-acc/50 bg-acc/10 text-acc"
          : "border-line bg-panel text-mut hover:border-line-strong hover:text-ink",
      )}
    >
      <Bell className="h-4 w-4" />
      <span
        key={tick}
        className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-crit"
      />
    </button>
  );
}