import type { AgentDefinition } from "@/lib/agents/types";
import { financeRepository } from "@/lib/repositories";
import { fmtMoney } from "@/lib/utils";

export const ledger: AgentDefinition = {
  slug: "ledger",
  name: "Ledger",
  department: "FINANCE",
  role: "CFO Agent — categorization, runway, tax reserve, statements",
  personality:
    "Meticulous, conservative, and allergic to surprises. Ledger rounds down, reserves early, and would rather flag a false alarm than miss a leak.",
  capabilities: [
    "Automatic transaction categorization",
    "Anomaly & unusual-spend detection",
    "Cash flow & runway modeling",
    "Quarterly tax reserve estimation",
    "P&L / balance sheet / cash flow statements",
  ],
  avatarColor: "#fbbf24",
  avatarIcon: "Calculator",
  memoryContext:
    "Ledger watches every dollar. Income streams: services, subscriptions, products, affiliate. Spend categories: software, marketing, contractors, infrastructure, education, travel, legal. Tax jurisdiction: US self-employed.",
  config: { model: "gpt-4o", temperature: 0.1, runwayBufferMonths: 3 },

  async run() {
    const log: string[] = [];
    const txs = await financeRepository.findTransactions({ limit: 300 });
    log.push(`[ledger] ${txs.length} transactions reviewed`);

    const monthAgo = new Date(Date.now() - 30 * 86_400_000);
    const recent = txs.filter((t) => t.date >= monthAgo);
    const income = recent.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
    const expense = recent.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);

    const byVendor = new Map<string, number>();
    for (const t of recent.filter((t) => t.type === "EXPENSE")) {
      const key = t.vendor ?? t.category;
      byVendor.set(key, (byVendor.get(key) ?? 0) + t.amount);
    }
    const topVendor = Array.from(byVendor.entries()).sort((a, b) => b[1] - a[1])[0];

    const runway = await financeRepository.runway();
    const tax = await financeRepository.taxEstimate();
    log.push(`[runway] ${runway.neutralMonths === Infinity ? "cash-flow positive" : `${runway.neutralMonths} months neutral runway`}`);
    log.push(`[tax] quarterly reserve: ${fmtMoney(tax.quarterlyReserve)}`);

    const anomalies = recent
      .filter((t) => t.type === "EXPENSE" && t.amount > 500 && !t.recurring)
      .slice(0, 3)
      .map((t) => ({ description: t.description, amount: t.amount, date: t.date }));

    const output = {
      monthIncome: Math.round(income),
      monthExpense: Math.round(expense),
      margin: income ? Math.round(((income - expense) / income) * 100) : 0,
      topVendor: topVendor ? { name: topVendor[0], total: Math.round(topVendor[1]) } : null,
      anomalies,
      runway,
      tax,
      generated: new Date().toISOString(),
    };

    const notifications: Array<{ title: string; body: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; category: string; link?: string }> = [];
    if (topVendor && topVendor[1] > expense * 0.35) {
      notifications.push({
        title: `${topVendor[0]} is ${Math.round((topVendor[1] / Math.max(1, expense)) * 100)}% of monthly spend`,
        body: `Ledger flag: ${fmtMoney(topVendor[1], { compact: true })} last 30 days. Worth an annual plan or renegotiation review.`,
        priority: "MEDIUM",
        category: "finances",
        link: "/finances",
      });
    }
    if (anomalies.length) {
      notifications.push({
        title: `${anomalies.length} unusual expense${anomalies.length > 1 ? "s" : ""} detected`,
        body: anomalies.map((a) => `${a.description} — ${fmtMoney(a.amount)}`).join("; "),
        priority: "MEDIUM",
        category: "finances",
        link: "/finances",
      });
    }

    const tasks = topVendor && topVendor[1] > expense * 0.35
      ? [{
          title: `Review ${topVendor[0]} spend`,
          description: `Largest cost center at ${fmtMoney(topVendor[1], { compact: true })}/mo. Evaluate annual pricing or alternatives.`,
          priority: "P2" as const,
          department: "FINANCE" as const,
          dueInDays: 7,
          delegationNote: `Ledger cost-optimization: concentration risk in a single vendor.`,
        }]
      : [];

    return {
      summary: `Reconciled ${txs.length} transactions. ${fmtMoney(income, { compact: true })} in, ${fmtMoney(expense, { compact: true })} out this month. ${tax.quarterlyReserve > 0 ? `Tax reserve ${fmtMoney(tax.quarterlyReserve, { compact: true })}/quarter.` : ""}`,
      log,
      output,
      notifications,
      tasks,
      recommendations: [
        `Monthly net: ${fmtMoney(income - expense, { compact: true })} — ${income >= expense ? "positive" : "negative"} margin.`,
        topVendor ? `Biggest cost center: ${topVendor[0]} at ${fmtMoney(topVendor[1], { compact: true })}/mo — review it.` : "Spend is well diversified.",
        `Quarterly tax reserve: ${fmtMoney(tax.quarterlyReserve, { compact: true })} — keep it in a separate account.`,
      ],
    };
  },

  async respond(message: string) {
    const lower = message.toLowerCase();
    if (lower.includes("runway") || lower.includes("cash") || lower.includes("burn")) {
      const r = await financeRepository.runway();
      const positive = r.netBurn >= 0;
      return `Cash on hand: ${fmtMoney(r.cash, { compact: true })}. Monthly in ${fmtMoney(r.monthlyIncome, { compact: true })} / out ${fmtMoney(r.monthlyBurn, { compact: true })}. You're ${positive ? "cash-flow positive — runway is effectively infinite" : `${r.neutralMonths} months of neutral runway`}. Optimistic ${r.optimisticMonths === Infinity ? "∞" : `${r.optimisticMonths}mo`}, pessimistic ${r.pessimisticMonths === Infinity ? "∞" : `${r.pessimisticMonths}mo`}.`;
    }
    if (lower.includes("tax")) {
      const t = await financeRepository.taxEstimate();
      return `Tax position (${t.jurisdiction}): YTD net ${fmtMoney(t.ytdNet, { compact: true })}. Estimated annual obligation ${fmtMoney(t.estimatedAnnual, { compact: true })} — that's ${fmtMoney(t.quarterlyReserve, { compact: true })} per quarter. Breakdown: SE tax ${fmtMoney(t.breakdown.selfEmployment, { compact: true })}, federal ${fmtMoney(t.breakdown.federal, { compact: true })}, state ${fmtMoney(t.breakdown.state, { compact: true })}.`;
    }
    if (lower.includes("statement") || lower.includes("pnl") || lower.includes("report")) {
      const stmt = await financeRepository.statements({ kind: "pnl", months: 3 });
      if (stmt.kind === "pnl") {
        const last = stmt.months[stmt.months.length - 1];
        return `Last 3 months: income ${fmtMoney(stmt.totalIncome, { compact: true })}, expenses ${fmtMoney(stmt.totalExpense, { compact: true })}, net ${fmtMoney(stmt.netIncome, { compact: true })}. Latest month margin: ${last ? Math.round(((last.income - last.expense) / Math.max(1, last.income)) * 100) : 0}%. Full P&L is in the Finances module — one click to export.`;
      }
      return "Statement generation hit a snag — the Finances module can retry it.";
    }
    if (lower.includes("invoice") || lower.includes("outstanding") || lower.includes("owed")) {
      const invoices = await financeRepository.invoices();
      const outstanding = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE");
      const overdue = invoices.filter((i) => i.status === "OVERDUE");
      return `${outstanding.length} outstanding invoices worth ${fmtMoney(outstanding.reduce((a, i) => a + i.amount, 0), { compact: true })}. ${overdue.length} overdue. ${overdue[0] ? `Most urgent: ${overdue[0].number} to ${overdue[0].contact?.name ?? "client"} (${fmtMoney(overdue[0].amount, { compact: true })}).` : "No overdue invoices — clean book."}`;
    }
    return `I watch the money: categorization, runway, tax reserves, statements, invoices, and anomalies. Ask me about runway, taxes, statements, or what's outstanding.`;
  },
};