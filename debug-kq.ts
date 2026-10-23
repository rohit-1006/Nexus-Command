import { knowledgeRepository } from "./lib/repositories";
import { prisma } from "./lib/db";

async function main() {
  await prisma.knowledgeNode.deleteMany({});
  const a = await knowledgeRepository.create({
    title: "Pricing philosophy",
    summary: "How we think about pricing",
    content: "We price on outcomes for small teams.",
    category: "DECISION",
    importance: 90,
    tags: ["pricing"],
  });
  const b = await knowledgeRepository.create({
    title: "Pricing tiers",
    summary: "Current tiers",
    content: "Starter, Growth, Scale tiers.",
    category: "PRODUCT",
    links: [a.id],
  });
  const res = await knowledgeRepository.queryInterface({ question: "pricing tiers" });
  console.log(JSON.stringify(res, null, 1));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});