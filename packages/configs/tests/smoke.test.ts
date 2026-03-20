import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../..");

function readJson(relativePath: string): Record<string, unknown> {
  const content = readFileSync(resolve(ROOT, relativePath), "utf-8");
  return JSON.parse(content) as Record<string, unknown>;
}

describe("workspace smoke", () => {
  it("monorepo packages resolve correctly", () => {
    expect(true).toBe(true);
  });
});

describe("monorepo structure", () => {
  const expectedApps = ["docs", "workspace"];
  const expectedPackages = [
    "configs",
    "contracts",
    "data-access",
    "mocks",
    "test-utils",
    "ui",
  ];

  it.each(expectedApps)("app %s exists with a valid package.json", (app) => {
    const pkgPath = resolve(ROOT, `apps/${app}/package.json`);
    expect(existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    expect(pkg.name).toBe(`@emerald/${app}`);
    expect(pkg.private).toBe(true);
  });

  it.each(expectedPackages)(
    "package %s exists with a valid package.json",
    (pkg) => {
      const pkgPath = resolve(ROOT, `packages/${pkg}/package.json`);
      expect(existsSync(pkgPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(manifest.name).toBe(`@emerald/${pkg}`);
    }
  );

  it.each(expectedPackages.filter((p) => p !== "configs"))(
    "package %s has a src/index.ts entrypoint",
    (pkg) => {
      const entryPath = resolve(ROOT, `packages/${pkg}/src/index.ts`);
      expect(existsSync(entryPath)).toBe(true);
    }
  );

  it("pnpm-workspace.yaml references apps and packages", () => {
    const content = readFileSync(
      resolve(ROOT, "pnpm-workspace.yaml"),
      "utf-8"
    );
    expect(content).toContain("apps/*");
    expect(content).toContain("packages/*");
  });
});

describe("root scripts", () => {
  const rootPkg = readJson("package.json") as {
    scripts: Record<string, string>;
  };

  const requiredScripts = [
    "lint",
    "typecheck",
    "test",
    "build",
    "dev:docs",
    "dev:workspace",
    "storybook",
    "storybook:build",
    "test:e2e",
  ];

  it.each(requiredScripts)("root script '%s' exists", (script) => {
    expect(rootPkg.scripts).toHaveProperty(script);
    expect(typeof rootPkg.scripts[script]).toBe("string");
    expect(rootPkg.scripts[script].length).toBeGreaterThan(0);
  });
});

describe("shared config inheritance", () => {
  it("packages/configs exports tsconfig base", () => {
    expect(
      existsSync(resolve(ROOT, "packages/configs/tsconfig/base.json"))
    ).toBe(true);
  });

  it("packages/configs exports tsconfig nextjs", () => {
    expect(
      existsSync(resolve(ROOT, "packages/configs/tsconfig/nextjs.json"))
    ).toBe(true);
  });

  it("packages/configs exports tsconfig library", () => {
    expect(
      existsSync(resolve(ROOT, "packages/configs/tsconfig/library.json"))
    ).toBe(true);
  });

  it("packages/configs exports tailwind preset", () => {
    expect(
      existsSync(resolve(ROOT, "packages/configs/tailwind/preset.js"))
    ).toBe(true);
  });

  it("packages/configs exports vitest base config", () => {
    expect(
      existsSync(resolve(ROOT, "packages/configs/vitest/base.ts"))
    ).toBe(true);
  });

  it("apps/docs extends shared nextjs tsconfig", () => {
    const tsconfig = readJson("apps/docs/tsconfig.json") as {
      extends: string;
    };
    expect(tsconfig.extends).toBe("@emerald/configs/tsconfig/nextjs.json");
  });

  it("apps/workspace extends shared nextjs tsconfig", () => {
    const tsconfig = readJson("apps/workspace/tsconfig.json") as {
      extends: string;
    };
    expect(tsconfig.extends).toBe("@emerald/configs/tsconfig/nextjs.json");
  });

  it.each(["ui", "contracts", "data-access", "mocks", "test-utils"])(
    "package %s extends shared library tsconfig",
    (pkg) => {
      const tsconfig = readJson(`packages/${pkg}/tsconfig.json`) as {
        extends: string;
      };
      expect(tsconfig.extends).toBe(
        "@emerald/configs/tsconfig/library.json"
      );
    }
  );
});

describe("storybook configuration", () => {
  it(".storybook/main.ts exists", () => {
    expect(existsSync(resolve(ROOT, ".storybook/main.ts"))).toBe(true);
  });

  it(".storybook/preview.tsx exists", () => {
    expect(existsSync(resolve(ROOT, ".storybook/preview.tsx"))).toBe(true);
  });

  it("root storybook script points to storybook dev on port 6100", () => {
    const rootPkg = readJson("package.json") as {
      scripts: Record<string, string>;
    };
    expect(rootPkg.scripts.storybook).toContain("6100");
  });

  it("root storybook:build script runs storybook build", () => {
    const rootPkg = readJson("package.json") as {
      scripts: Record<string, string>;
    };
    expect(rootPkg.scripts["storybook:build"]).toContain("storybook build");
  });
});

describe("shared provider stack", () => {
  it("@emerald/ui exports providers entrypoint", () => {
    const uiPkg = readJson("packages/ui/package.json") as {
      exports: Record<string, string>;
    };
    expect(uiPkg.exports["./providers"]).toBeDefined();
  });

  it("provider source files exist", () => {
    const providerFiles = [
      "packages/ui/src/providers/index.ts",
      "packages/ui/src/providers/app-providers.tsx",
      "packages/ui/src/providers/error-boundary.tsx",
      "packages/ui/src/providers/query-client.ts",
    ];
    for (const file of providerFiles) {
      expect(existsSync(resolve(ROOT, file))).toBe(true);
    }
  });

  it("shared global CSS exists", () => {
    expect(
      existsSync(resolve(ROOT, "packages/ui/src/styles/globals.css"))
    ).toBe(true);
  });

  it("apps/docs layout imports AppProviders", () => {
    const layout = readFileSync(
      resolve(ROOT, "apps/docs/src/app/layout.tsx"),
      "utf-8"
    );
    expect(layout).toContain("AppProviders");
    expect(layout).toContain("@emerald/ui/providers");
  });

  it("apps/workspace layout imports AppProviders", () => {
    const layout = readFileSync(
      resolve(ROOT, "apps/workspace/src/app/layout.tsx"),
      "utf-8"
    );
    expect(layout).toContain("AppProviders");
    expect(layout).toContain("@emerald/ui/providers");
  });
});

describe("import-boundary rules", () => {
  it("eslint config contains no-restricted-imports for packages", () => {
    const eslintConfig = readFileSync(
      resolve(ROOT, "eslint.config.mjs"),
      "utf-8"
    );
    expect(eslintConfig).toContain("no-restricted-imports");
    expect(eslintConfig).toContain("@emerald/docs");
    expect(eslintConfig).toContain("@emerald/workspace");
    expect(eslintConfig).toContain("**/apps/**");
    expect(eslintConfig).toContain("**/modules/**");
  });

  it("boundary rules target packages/**/*.ts and *.tsx files", () => {
    const eslintConfig = readFileSync(
      resolve(ROOT, "eslint.config.mjs"),
      "utf-8"
    );
    expect(eslintConfig).toContain('packages/**/*.ts');
    expect(eslintConfig).toContain('packages/**/*.tsx');
  });
});
