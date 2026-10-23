import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    globalSetup: [resolve(__dirname, "tests/global-setup.ts")],
    env: {
      // Prisma resolves `file:` URLs relative to the schema file (prisma/)
      DATABASE_URL: "file:./test.db",
      NODE_ENV: "test",
    },
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});