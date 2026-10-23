import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { seedAll } from "@/lib/seed";

async function main(): Promise<void> {
  console.log("› Pushing schema to database…");
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  const prisma = new PrismaClient();
  try {
    console.log("› Seeding Nexus Command…");
    const result = await seedAll(prisma);
    console.log("✔ Seed complete:");
    console.log(`   • ${result.contacts.length} contacts`);
    console.log(`   • ${result.deals.length} deals`);
    console.log(`   • ${result.comms.length} communications`);
    console.log(`   • ${result.transactions} financial transactions`);
    console.log(`   • ${result.events} domain events`);
    console.log("   • 6 AI agents · 8 social platforms · 40 knowledge nodes · 3 workflows");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("✘ Seed failed:", err);
  process.exit(1);
});