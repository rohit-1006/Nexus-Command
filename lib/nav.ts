export type NavItem = {
  href: string;
  label: string;
  icon: string;
  desc?: string;
};

export const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Command",
    items: [{ href: "/", label: "Nerve Center", icon: "Activity", desc: "Live tactical overview" }],
  },
  {
    title: "Operations",
    items: [
      { href: "/comms", label: "Communications", icon: "Mail" },
      { href: "/revenue", label: "Revenue", icon: "TrendingUp", desc: "Deals, pipeline, forecast" },
      { href: "/social", label: "Social Presence", icon: "Share2", desc: "Content + audience" },
      { href: "/clients", label: "Clients & Contacts", icon: "Users" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/knowledge", label: "Knowledge", icon: "Brain", desc: "Graph + dumps" },
      { href: "/agents", label: "Agents", icon: "Bot", desc: "Crew status & runs" },
      { href: "/analytics", label: "Analytics", icon: "BarChart3" },
      { href: "/strategy", label: "Strategy", icon: "Target", desc: "OKRs, decisions, moon" },
    ],
  },
  {
    title: "Systems",
    items: [
      { href: "/finances", label: "Finances", icon: "Wallet", desc: "Cash, statements, tax" },
      { href: "/tasks", label: "Tasks", icon: "CheckSquare" },
      { href: "/workflows", label: "Workflows", icon: "Workflow", desc: "Automation runs" },
      { href: "/integrations", label: "Integrations", icon: "Plug", desc: "Connector honesty" },
      { href: "/settings", label: "Settings", icon: "Settings" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);