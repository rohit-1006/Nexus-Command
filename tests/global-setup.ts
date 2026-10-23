import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default function setup() {
  const root = resolve(__dirname, "..");
  const dbPath = resolve(root, "prisma/test.db");
  rmSync(dbPath, { force: true });
  rmSync(`${dbPath}-journal`, { force: true });
  execSync("npx prisma db push --skip-generate", {
    cwd: root,
    // Prisma resolves `file:` URLs relative to the schema file (prisma/)
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}