import type { PrismaClient } from "@prisma/client";
import type { Contact } from "@prisma/client";
import { mulberry32, pick } from "@/lib/utils";
import { CLIENT_INVOICES, EXPENSE_VENDORS } from "@/lib/seed/constants2";

const rng = mulberry32(4242);

export async function seedTransactionsAndInvoices(
  prisma: PrismaClient,
  now: number,
  contacts: Contact[],
): Promise<{ transactions: number }> {
  let txCount = 0;

  const invoices = [];
  for (let i = 0; i < 12; i++) {
    const [company, amount] = pick(rng, CLIENT_INVOICES);
    const contact = contacts.find((c) => c.company === company) ?? contacts[Math.floor(rng() * contacts.length)];
    const issued = new Date(now - (20 + Math.floor(rng() * 90)) * 86_400_000);
    const due = new Date(issued.getTime() + 30 * 86_400_000);
    const statuses = ["PAID", "PAID", "PAID", "PAID", "SENT", "SENT", "OVERDUE"] as const;
    const status = pick(rng, statuses);
    const invoice = await prisma.invoice.create({
      data: {
        number: `INV-2026-${String(i + 1).padStart(4, "0")}`,
        contactId: contact.id,
        status,
        issueDate: issued,
        dueDate: due,
        paidAt: status === "PAID" ? new Date(issued.getTime() + (5 + Math.floor(rng() * 20)) * 86_400_000) : null,
        amount,
        description: `${company} - platform + advisory`,
      },
    });
    invoices.push(invoice);
    if (status === "PAID") {
      await prisma.transaction.create({
        data: {
          date: invoice.paidAt ?? issued,
          description: invoice.description,
          amount,
          type: "INCOME",
          category: "INCOME_SERVICE",
          vendor: company,
          recurring: true,
          invoiceId: invoice.id,
        },
      });
      txCount++;
    }
  }

  const t = new Date(now - 190 * 86_400_000);
  const end = new Date(now - 86_400_000);
  while (t.getTime() <= end.getTime() && txCount < 190) {
    const day = t.getDate();
    const monthKey = t.toISOString().slice(0, 7);

    if (day === 15) {
      const [company, amt] = pick(rng, CLIENT_INVOICES);
      await prisma.transaction.create({
        data: {
          date: new Date(t),
          description: `${company} - advisory retainer`,
          amount: amt,
          type: "INCOME",
          category: "INCOME_SERVICE",
          vendor: company,
          recurring: true,
        },
      });
      txCount++;
    }
    if (day === 1) {
      await prisma.transaction.create({
        data: {
          date: new Date(t),
          description: "Platform subscriptions (MRR)",
          amount: 19000 + Math.floor(rng() * 4000),
          type: "INCOME",
          category: "INCOME_SUBSCRIPTION",
          vendor: "Northstar Platform",
          recurring: true,
        },
      });
      txCount++;
    }
    if (day === 6 || day === 20) {
      await prisma.transaction.create({
        data: {
          date: new Date(t),
          description: "Digital product sales",
          amount: 1200 + Math.floor(rng() * 2800),
          type: "INCOME",
          category: "INCOME_PRODUCT",
          vendor: "Metrics Pro",
        },
      });
      txCount++;
    }
    if (day % 7 === 3) {
      await prisma.transaction.create({
        data: {
          date: new Date(t),
          description: "Affiliate commissions",
          amount: 300 + Math.floor(rng() * 1500),
          type: "INCOME",
          category: "INCOME_AFFILIATE",
          vendor: "Partners",
        },
      });
      txCount++;
    }

    const isRecurringDay = [1, 5, 10, 15, 20, 25].includes(day);
    if (isRecurringDay) {
      for (let e = 0; e < 2; e++) {
        const [vendor, category, min, max] = EXPENSE_VENDORS[Math.floor(rng() * EXPENSE_VENDORS.length)];
        const monthly = ["Vercel", "AWS", "OpenAI", "Google Workspace", "Notion", "Calendly"].includes(vendor);
        if (monthly && day !== 1) continue;
        await prisma.transaction.create({
          data: {
            date: new Date(t),
            description: `${vendor} - ${monthly ? "monthly" : "period"}`,
            amount: Math.round((min + rng() * (max - min)) * 100) / 100,
            type: "EXPENSE",
            category: category as never,
            vendor,
            recurring: monthly,
            note: null,
          },
        });
        txCount++;
      }
    }

    if (day % 13 === 0) {
      const [vendor, category, min, max] = EXPENSE_VENDORS[Math.floor(rng() * EXPENSE_VENDORS.length)];
      if (category === "MARKETING") {
        await prisma.transaction.create({
          data: {
            date: new Date(t),
            description: `${vendor} campaign`,
            amount: Math.round((min + rng() * (max - min)) * 100) / 100,
            type: "EXPENSE",
            category: "MARKETING",
            vendor,
          },
        });
        txCount++;
      }
    }

    void monthKey;
    t.setDate(t.getDate() + 1);
  }

  void invoices;
  return { transactions: txCount };
}