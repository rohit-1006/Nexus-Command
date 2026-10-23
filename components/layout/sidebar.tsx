"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { Activity, Brain, BarChart3, Bot, CheckSquare, Mail, Plug, Share2, Settings, Target, TrendingUp, Users, Wallet, Workflow, ChevronsLeft, ChevronsRight, Zap } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useUI } from "@/stores/ui";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Activity, Mail, TrendingUp, Share2, Users, Brain, Bot, BarChart3, Target,
  Wallet, CheckSquare, Workflow, Plug, Settings, Zap,
};

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggle = useUI((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-line bg-bg-soft transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-line px-4", collapsed && "justify-center px-0")}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-acc/40 bg-acc/10">
            <Zap className="h-4 w-4 text-acc" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ok animate-pulse-dot" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-[13px] font-bold leading-none tracking-tight">
                NEXUS<span className="text-acc">·</span>COMMAND
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-mut">solo ops OS</div>
            </div>
          )}
        </div>
      </div>

      <nav className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="px-2 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-mut2">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Activity;
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                      collapsed && "justify-center px-0 py-2",
                      active
                        ? "bg-acc/10 text-ink ring-1 ring-acc/25"
                        : "text-mut hover:bg-panel2 hover:text-ink",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-acc" : "text-mut group-hover:text-ink")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.href === "/" && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ok animate-pulse-dot" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-mut hover:bg-panel2 hover:text-ink",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}