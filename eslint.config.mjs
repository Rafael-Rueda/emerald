import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/coverage/**",
      "**/storybook-static/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/*.config.mjs",
      "**/*.config.ts",
      "**/*.config.js",
      "**/postcss.config.*",
      "**/next.config.*",
      "**/tailwind.config.*",
      "**/vitest.workspace.*",
      // Generated files — must not produce false-positive lint noise
      "**/next-env.d.ts",
      "**/public/mockServiceWorker.js",
      "apps/api/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },
  // Next.js plugin — scoped to app directories so shared packages
  // are not subject to Next-specific rules (e.g. no-html-link-for-pages).
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx", "apps/**/*.js", "apps/**/*.jsx"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
    settings: {
      next: {
        rootDir: "apps/*/",
      },
    },
  },
  // Import-boundary rules for shared packages
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@emerald/docs", "@emerald/docs/*"],
              message:
                "Shared packages must not import from app internals (docs).",
            },
            {
              group: ["@emerald/workspace", "@emerald/workspace/*"],
              message:
                "Shared packages must not import from app internals (workspace).",
            },
            {
              group: ["**/apps/**"],
              message: "Shared packages must not import from apps directory.",
            },
            {
              group: ["**/modules/**"],
              message:
                "Shared packages must not import module internals directly.",
            },
          ],
        },
      ],
    },
  }
);
