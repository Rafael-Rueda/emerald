import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";

/* eslint-disable @typescript-eslint/no-require-imports */
const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");

const config: StorybookConfig = {
  stories: [
    "../packages/ui/src/**/*.mdx",
    "../packages/ui/src/**/*.stories.@(ts|tsx)",
  ],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
  },
  staticDirs: [],
  docs: {},
  viteFinal: async (config) => {
    // Resolve workspace package imports for pnpm monorepo
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@emerald/ui/providers": path.resolve(
        __dirname,
        "../packages/ui/src/providers/index.ts"
      ),
      "@emerald/ui/theme": path.resolve(
        __dirname,
        "../packages/ui/src/theme/index.ts"
      ),
      "@emerald/ui/shells": path.resolve(
        __dirname,
        "../packages/ui/src/shells/index.ts"
      ),
      "@emerald/ui/primitives": path.resolve(
        __dirname,
        "../packages/ui/src/primitives/index.ts"
      ),
      "@emerald/ui/lib/cn": path.resolve(
        __dirname,
        "../packages/ui/src/lib/cn.ts"
      ),
      "@emerald/ui/styles": path.resolve(
        __dirname,
        "../packages/ui/src/styles"
      ),
      "@emerald/ui": path.resolve(__dirname, "../packages/ui/src/index.ts"),
      "@emerald/contracts": path.resolve(
        __dirname,
        "../packages/contracts/src/index.ts"
      ),
      "@emerald/data-access": path.resolve(
        __dirname,
        "../packages/data-access/src/index.ts"
      ),
    };

    // Configure PostCSS with Tailwind for the Storybook Vite build
    // We inline the Tailwind config here to avoid pnpm resolution issues
    // with the shared preset import in apps/docs/tailwind.config.ts
    const preset = require(path.resolve(
      __dirname,
      "../packages/configs/tailwind/preset.js"
    ));

    config.css = config.css || {};
    config.css.postcss = {
      plugins: [
        tailwindcss({
          presets: [preset],
          content: [
            path.resolve(__dirname, "../packages/ui/src/**/*.{ts,tsx,mdx}"),
          ],
          darkMode: "class",
        }),
        autoprefixer(),
      ],
    };

    return config;
  },
};

export default config;
