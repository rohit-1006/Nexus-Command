import { Wallet, Flame, Landmark, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat";
import { TrendArea } from "@/components/charts/area";
import { Donut } from "@/components/charts/donut";
import { financeRepository } from "@/lib/repositories";
import { fmtMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EXPENSE_COLORS = ["#f472b6", "#fbbf24", "#a78bfa", "#22d3ee", "#34d399", "#f87171", "#8b93ff"];

export default async function FinancesPage() {
  const [runway, monthly, streams, expenses, aging, invoices, txs, tax] = await Promise.all([
    financeRepository.runway(),
    financeRepository.monthlySeries(12),
    financeRepository.incomeByStream(8),
    financeRepository.expenseBreakdown(),
    financeRepository.invoiceAging(),
    financeRepository.invoices(),
    financeRepository.findTransactions({ limit: 16 }),
    financeRepository.taxEstimate(),
  ]);

  const streamSeries = [
    { key: "INCOME_SERVICE", name: "Services", color: "var(--chart1)" },
    { key: "INCOME_SUBSCRIPTION", name: "Subscriptions", color: "var(--chart2)" },
    { key: "INCOME_PRODUCT", name: "Products", color: "var(--chart3)" },
    { key: "INCOME_AFFILIATE", name: "Affiliate", color: "var(--chart4)" },
  ];

  const expenseChart = expenses.map((e, i) => ({
    name: e.category.replace("EXPENSE_", "").toLowerCase(),
    value: e.total,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  }));

  const invoiceBadge = (s: string) => (s === "PAID" ? "ok" : s === "OVERDUE" ? "crit" : s === "SENT" ? "warn" : "muted");

  return (
    <div>
      <PageHeader
        title="Finances"
        desc="Cash position, runway, statements, invoices and a US self-employment tax estimate — reconciled by the Ledger."
        badge={<span className="font-mono text-[10px] text-mut2">ledger: reconciled</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cash on hand" value={fmtMoney(runway.cash, { compact: true })} delta={`${fmtMoney(runway.netBurn, { compact: true })}/mo net`} deltaTone={runway.netBurn > 0 ? "ok" : "crit"} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Monthly income" value={fmtMoney(runway.monthlyIncome, { compact: true })} delta="3-month average" deltaTone="neutral" icon={<Landmark className="h-4 w-4" />} />
        <StatCard label="Monthly burn" value={fmtMoney(runway.monthlyBurn, { compact: true })} delta={`runway ${runway.neutralMonths === Infinity ? "∞" : `${runway.neutralMonths}mo`}`} deltaTone="warn" icon={<Flame className="h-4 w-4" />} />
        <StatCard label="Est. tax reserve" value={fmtMoney(tax.quarterlyReserve, { compact: true })} delta="per quarter" deltaTone="neutral" icon={<ReceiptText className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Profit & loss — 12 months</CardTitle>
            <CardDescription>Income, expense, and net, from the transaction ledger</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={monthly}
              series={[
                { key: "income", name: "Income", color: "var(--chart2)" },
                { key: "expense", name: "Expense", color: "var(--chart4)" },
                { key: "net", name: "Net", color: "var(--chart1)" },
              ]}
              money
              height={250}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Expense mix</CardTitle>
            <CardDescription>Where the money goes</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut data={expenseChart} money height={250} />
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>{invoices.filter((i) => i.status !== "PAID").length} outstanding · A/R aging below</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mb-3 grid grid-cols-4 gap-2">
              {Object.entries(aging).map(([bucket, value]) => (
                <div key={bucket} className="rounded-lg border border-line bg-panel2 p-2.5 text-center">
                  <div className="font-data text-sm font-bold">{fmtMoney(value, { compact: true })}</div>
                  <div className="text-[9px] uppercase tracking-wider text-mut2">{bucket}</div>
                </div>
              ))}
            </div>
            <div className="scrollbar-none max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2">
                  <span className="font-mono text-[11px] font-semibold text-ink">{inv.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] text-mut">{inv.contact?.name ?? "—"} · {inv.contact?.company ?? "—"}</div>
                    <div className="text-[9px] text-mut2">{new Date(inv.issueDate).toLocaleDateString()}</div>
                  </div>
                  <span className="font-data text-xs font-semibold">{fmtMoney(inv.amount)}</span>
                  <Badge tone={invoiceBadge(inv.status) as never}>{inv.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Income streams</CardTitle>
            <CardDescription>8 months by revenue category</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea data={streams} series={streamSeries} money height={260} xKey="month" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Last 16 ledger entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-widest text-mut2">
                  <th className="pb-2 pr-3 font-semibold">Date</th>
                  <th className="pb-2 pr-3 font-semibold">Description</th>
                  <th className="pb-2 pr-3 font-semibold">Category</th>
                  <th className="pb-2 pr-3 font-semibold">Type</th>
                  <th className="pb-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0 hover:bg-panel2/60">
                    <td className="py-2 pr-3 font-data text-mut">{t.date.toISOString().slice(0, 10)}</td>
                    <td className="py-2 pr-3 font-medium text-ink">{t.description}</td>
                    <td className="py-2 pr-3 text-mut">{t.category.replace("_", " ").toLowerCase()}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={t.type === "INCOME" ? "ok" : "muted"}>{t.type}</Badge>
                    </td>
                    <td className={`py-2 text-right font-data font-semibold ${t.type === "INCOME" ? "text-ok" : "text-crit"}`}>
                      {t.type === "INCOME" ? "+" : "−"}{fmtMoney(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}