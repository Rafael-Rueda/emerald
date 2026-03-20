import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Resolve aliases for workspace packages so Vite can resolve
 * cross-package imports in the monorepo test context.
 */
const workspaceAliases = {
  "@emerald/contracts": path.resolve(__dirname, "packages/contracts/src/index.ts"),
  "@emerald/mocks/browser": path.resolve(__dirname, "packages/mocks/src/browser.ts"),
  "@emerald/mocks/node": path.resolve(__dirname, "packages/mocks/src/node.ts"),
  "@emerald/mocks/storybook": path.resolve(__dirname, "packages/mocks/src/storybook.tsx"),
  "@emerald/mocks/fixtures": path.resolve(__dirname, "packages/mocks/src/fixtures/index.ts"),
  "@emerald/mocks/handlers": path.resolve(__dirname, "packages/mocks/src/handlers/index.ts"),
  "@emerald/mocks/scenarios": path.resolve(__dirname, "packages/mocks/src/scenarios.ts"),
  "@emerald/mocks": path.resolve(__dirname, "packages/mocks/src/index.ts"),
  "@emerald/test-utils/msw-server": path.resolve(__dirname, "packages/test-utils/src/msw-server.ts"),
  "@emerald/test-utils/render": path.resolve(__dirname, "packages/test-utils/src/render.tsx"),
  "@emerald/test-utils": path.resolve(__dirname, "packages/test-utils/src/index.ts"),
  "@emerald/data-access": path.resolve(__dirname, "packages/data-access/src/index.ts"),
  "@emerald/ui/providers": path.resolve(__dirname, "packages/ui/src/providers/index.ts"),
  "@emerald/ui/theme": path.resolve(__dirname, "packages/ui/src/theme/index.ts"),
  "@emerald/ui/shells": path.resolve(__dirname, "packages/ui/src/shells/index.ts"),
  "@emerald/ui/primitives": path.resolve(__dirname, "packages/ui/src/primitives/index.ts"),
  "@emerald/ui/lib/cn": path.resolve(__dirname, "packages/ui/src/lib/cn.ts"),
  "@emerald/ui": path.resolve(__dirname, "packages/ui/src/index.ts"),
};

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    projects: [
      {
        resolve: {
          alias: workspaceAliases,
        },
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
        resolve: {
          alias: {
            ...workspaceAliases,
            "@": path.resolve(__dirname, "apps/docs/src"),
          },
        },
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
        resolve: {
          alias: workspaceAliases,
        },
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
