import type { Invoice, Transaction, TransactionCategory, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/repositories/base";
import { invoiceCreateSchema, statementRequestSchema, transactionCreateSchema } from "@/lib/schemas";
import { startOfMonth } from "@/lib/utils";

export const financeRepository = {
  async findTransactions(opts?: { from?: Date; to?: Date; type?: TransactionType; limit?: number }): Promise<Transaction[]> {
    const where: { date?: { gte?: Date; lte?: Date }; type?: TransactionType } = {};
    if (opts?.from || opts?.to) {
      where.date = {};
      if (opts?.from) where.date.gte = opts.from;
      if (opts?.to) where.date.lte = opts.to;
    }
    if (opts?.type) where.type = opts.type;
    return prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: opts?.limit ?? 500,
    });
  },

  async create(input: unknown): Promise<Transaction> {
    const data = safe(transactionCreateSchema, input);
    if (!data.ok) throw new Error(`transaction.create invalid: ${data.error}`);
    return prisma.transaction.create({
      data: {
        date: data.data.date,
        description: data.data.description,
        amount: data.data.amount,
        type: data.data.type,
        category: data.data.category,
        vendor: data.data.vendor ?? null,
        recurring: data.data.recurring,
        invoiceId: data.data.invoiceId ?? null,
        note: data.data.note ?? null,
      },
    });
  },

  async monthlySeries(months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    const txs = await prisma.transaction.findMany({ where: { date: { gte: since } }, orderBy: { date: "asc" } });
    const rows: Array<{ month: string; income: number; expense: number; net: number }> = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const inMonth = txs.filter((t) => t.date.toISOString().slice(0, 7) === key);
      const income = inMonth.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
      const expense = inMonth.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);
      rows.push({
        month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        income: Math.round(income),
        expense: Math.round(expense),
        net: Math.round(income - expense),
      });
    }
    return rows;
  },

  async incomeByStream(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    const txs = await prisma.transaction.findMany({
      where: { type: "INCOME", date: { gte: since } },
      orderBy: { date: "asc" },
    });
    const categories: TransactionCategory[] = [
      "INCOME_SERVICE", "INCOME_SUBSCRIPTION", "INCOME_PRODUCT", "INCOME_AFFILIATE", "INCOME_OTHER",
    ];
    const rows: Array<{ month: string; [k: string]: string | number }> = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const row: { month: string; [k: string]: string | number } = {
        month: d.toLocaleDateString("en-US", { month: "short" }),
      };
      for (const c of categories) {
        row[c] = txs.filter((t) => t.category === c && t.date.toISOString().slice(0, 7) === key).reduce((a, t) => a + t.amount, 0);
      }
      rows.push(row);
    }
    return rows;
  },

  async expenseBreakdown(opts?: { from?: Date }) {
    const where: Record<string, unknown> = { type: "EXPENSE" };
    if (opts?.from) where.date = { gte: opts.from };
    const txs = await prisma.transaction.findMany({ where });
    const categories = new Map<TransactionCategory, { total: number; count: number }>();
    for (const t of txs) {
      const c = categories.get(t.category) ?? { total: 0, count: 0 };
      c.total += t.amount;
      c.count += 1;
      categories.set(t.category, c);
    }
    const filtered = new Map(
      Array.from(categories.entries()).filter(([cat]) =>
        ["SOFTWARE", "MARKETING", "CONTRACTORS", "INFRASTRUCTURE", "EDUCATION", "TRAVEL", "LEGAL", "OTHER"].includes(cat),
      ),
    );
    return Array.from(filtered.entries())
      .map(([category, v]) => ({ category, total: Math.round(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total);
  },

  async transactionsByCategory(category: TransactionCategory, opts?: { from?: Date }) {
    const where: Record<string, unknown> = { type: "EXPENSE", category };
    if (opts?.from) where.date = { gte: opts.from };
    return prisma.transaction.findMany({ where, orderBy: { date: "desc" } });
  },

  async cashFlow(months = 3) {
    const rows = await this.monthlySeries(months);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const txsBefore = await prisma.transaction.findMany({ where: { date: { lt: start } } });
    const startingBalance = txsBefore.reduce((a, t) => a + (t.type === "INCOME" ? t.amount : -t.amount), 0);
    const monthsArr = rows.map((r, i) => ({
      label: r.month,
      income: r.income,
      expense: r.expense,
      cumulative: Math.round(startingBalance + rows.slice(0, i + 1).reduce((a, r2) => a + r2.net, 0)),
    }));
    const ending = monthsArr.length ? monthsArr[monthsArr.length - 1].cumulative : startingBalance;
    return { startingBalance: Math.round(startingBalance), ending, months: monthsArr };
  },

  async runway() {
    const three = new Date();
    three.setMonth(three.getMonth() - 3);
    const txs = await prisma.transaction.findMany({ where: { date: { gte: three } } });
    const monthlyIncome = txs.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0) / 3;
    const monthlyBurn = txs.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0) / 3;
    const cash = await this.currentCash();
    const net = monthlyIncome - monthlyBurn;
    const optimistic = net * 1.15;
    const neutral = net;
    const pessimistic = net * 0.6;
    return {
      cash: Math.round(cash),
      monthlyIncome: Math.round(monthlyIncome),
      monthlyBurn: Math.round(monthlyBurn),
      netBurn: Math.round(net),
      optimisticMonths: optimistic > 0 ? Math.round(cash / optimistic * 10) / 10 : Infinity,
      neutralMonths: neutral > 0 ? Math.round(cash / neutral * 10) / 10 : Infinity,
      pessimisticMonths: pessimistic > 0 ? Math.round(cash / pessimistic * 10) / 10 : Infinity,
    };
  },

  async currentCash(): Promise<number> {
    const txs = await prisma.transaction.findMany();
    return txs.reduce((a, t) => a + (t.type === "INCOME" ? t.amount : -t.amount), 0);
  },

  async invoices() {
    return prisma.invoice.findMany({
      orderBy: { issueDate: "desc" },
      include: { contact: { select: { name: true, company: true } } },
    });
  },

  async invoiceAging() {
    const invoices = await prisma.invoice.findMany();
    const now = new Date();
    const buckets = { current: 0, "1-30": 0, "31-60": 0, "61+": 0 };
    for (const inv of invoices) {
      if (inv.status === "PAID") continue;
      const days = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000);
      if (days <= 0) buckets.current += inv.amount;
      else if (days <= 30) buckets["1-30"] += inv.amount;
      else if (days <= 60) buckets["31-60"] += inv.amount;
      else buckets["61+"] += inv.amount;
    }
    return buckets;
  },

  async createInvoice(input: unknown): Promise<Invoice> {
    const data = safe(invoiceCreateSchema, input);
    if (!data.ok) throw new Error(`invoice.create invalid: ${data.error}`);
    const count = await prisma.invoice.count();
    return prisma.invoice.create({
      data: {
        number: `INV-${String(2026 + count).padStart(4, "0")}`,
        contactId: data.data.contactId ?? null,
        status: data.data.status,
        issueDate: data.data.issueDate,
        dueDate: data.data.dueDate,
        amount: data.data.amount,
        description: data.data.description,
      },
    });
  },

  async markInvoicePaid(id: string): Promise<Invoice> {
    return prisma.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  },

  async statements(input: unknown): Promise<StatementResult> {
    const data = safe(statementRequestSchema, input);
    if (!data.ok) throw new Error(`statement invalid: ${data.error}`);
    const rows = await this.monthlySeries(data.data.months);
    const totalIncome = rows.reduce((a, r) => a + r.income, 0);
    const totalExpense = rows.reduce((a, r) => a + r.expense, 0);
    const cash = await this.currentCash();
    if (data.data.kind === "pnl") {
      return {
        kind: "pnl",
        generated: new Date().toISOString(),
        months: rows,
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        margins: rows.map((r) => ({
          month: r.month,
          margin: r.income ? Math.round(((r.income - r.expense) / r.income) * 100) : 0,
        })),
      };
    }
    if (data.data.kind === "balance") {
      return {
        kind: "balance",
        generated: new Date().toISOString(),
        cash,
        accountsReceivable: (await prisma.invoice.findMany({ where: { status: { in: ["SENT", "OVERDUE"] } } })).reduce((a, i) => a + i.amount, 0),
        liabilities: 0,
        equity: cash,
        summary: "Solo operator balance sheet - no debt, no payroll, pure equity.",
      };
    }
    return {
      kind: "cashflow",
      generated: new Date().toISOString(),
      ...(await this.cashFlow(data.data.months)),
    };
  },

  async taxEstimate() {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const txs = await prisma.transaction.findMany({ where: { date: { gte: yearStart } } });
    const income = txs.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
    const expense = txs.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);
    const net = income - expense;
    const selfEmployment = net * 0.153; // SE tax approximation (US)
    const federal = Math.max(0, (net - selfEmployment * 0.5) * 0.24); // rough effective bracket
    const state = net * 0.06;
    const total = selfEmployment + federal + state;
    return {
      jurisdiction: "United States (self-employed, sole prop)",
      ytdIncome: Math.round(income),
      ytdExpenses: Math.round(expense),
      ytdNet: Math.round(net),
      estimatedAnnual: Math.round(total * (12 / Math.max(1, new Date().getMonth() + 1))),
      quarterlyReserve: Math.round(total / 4),
      breakdown: {
        selfEmployment: Math.round(selfEmployment),
        federal: Math.round(federal),
        state: Math.round(state),
      },
    };
  },
};

export type StatementResult =
  | {
      kind: "pnl";
      generated: string;
      months: Array<{ month: string; income: number; expense: number; net: number }>;
      totalIncome: number;
      totalExpense: number;
      netIncome: number;
      margins: Array<{ month: string; margin: number }>;
    }
  | {
      kind: "balance";
      generated: string;
      cash: number;
      accountsReceivable: number;
      liabilities: number;
      equity: number;
      summary: string;
    }
  | {
      kind: "cashflow";
      generated: string;
      startingBalance: number;
      ending: number;
      months: Array<{ label: string; income: number; expense: number; cumulative: number }>;
    };

export function parseStatementRequest(input: unknown): { kind: "pnl" | "balance" | "cashflow"; months: number } | { error: string } {
  const parsed = safe(statementRequestSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  return parsed.data;
}

export function currentMonthTotal() {
  const start = startOfMonth(new Date());
  return prisma.transaction.aggregate({
    where: { date: { gte: start }, type: "INCOME" },
    _sum: { amount: true },
  });
}