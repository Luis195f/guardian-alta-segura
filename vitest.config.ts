import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.mjs"],
    exclude: ["src/**/*.integration.test.ts"],
    mockReset: true,
    restoreMocks: true,
  },
});
