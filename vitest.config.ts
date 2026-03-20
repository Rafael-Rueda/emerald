import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "foundation",
          include: ["packages/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/dist/**"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["./packages/configs/vitest/setup.ts"],
        },
      },
      {
        test: {
          name: "docs",
          include: ["apps/docs/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/.next/**", "**/e2e/**"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["./packages/configs/vitest/setup.ts"],
        },
      },
      {
        test: {
          name: "workspace-admin",
          include: ["apps/workspace/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/.next/**", "**/e2e/**"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["./packages/configs/vitest/setup.ts"],
        },
      },
    ],
  },
});
