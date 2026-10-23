"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  children,
  title,
  subtitle,
  width = "max-w-xl",
  icon,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  width?: string;
  icon?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col border-l border-line-strong bg-bg-soft shadow-2xl animate-fade-up",
          width,
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {icon}
          <div className="min-w-0 flex-1">
            {title ? <div className="truncate text-sm font-semibold">{title}</div> : null}
            {subtitle ? <div className="truncate text-xs text-mut">{subtitle}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-mut hover:bg-panel2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}