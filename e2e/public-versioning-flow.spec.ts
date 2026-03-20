import { test, expect } from "@playwright/test";

test.describe("public docs versioning flow", () => {
  test("versioning selector shows active version and options", async ({ page }) => {
    await page.goto("http://localhost:3100/guides/v1/getting-started");

    await expect(page.getByTestId("version-selector")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("version-active-label")).toContainText("v1");
    await expect(page.getByTestId("version-select")).toHaveValue("v1");
    await expect(page.getByTestId("version-option-v1")).toHaveCount(1);
    await expect(page.getByTestId("version-option-v2")).toHaveCount(1);
  });

  test("versioning switch updates route and dependent public context together", async ({ page }) => {
    await page.goto("http://localhost:3100/guides/v1/getting-started");

    await page.getByTestId("version-select").selectOption("v2");
    await page.waitForURL("**/guides/v2/getting-started", { timeout: 10000 });

    await expect(page.getByTestId("doc-meta")).toContainText(
      "guides / v2 / getting-started",
    );
    await expect(page.getByTestId("breadcrumb-version")).toContainText("v2");
    await expect(page.getByTestId("version-active-label")).toContainText("v2");
    await expect(page.getByTestId("sidebar-item-getting-started")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("toc-entry-quick-start")).toBeVisible();
  });

  test("versioning transition shows loading state without mixed content", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.toString();

        if (requestUrl.includes("/api/docs/guides/v2/getting-started")) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }

        return originalFetch(input, init);
      };
    });

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await page.getByTestId("version-select").selectOption("v2");

    await expect(page.getByTestId("article-transition")).toBeVisible();
    await expect(page.getByTestId("version-active-label")).toContainText("v2");
    await expect(page.getByTestId("doc-meta")).toHaveCount(0);
    await expect(page.getByTestId("toc-entry-installation")).toHaveCount(0);

    await page.waitForURL("**/guides/v2/getting-started", { timeout: 10000 });
    await expect(page.getByTestId("doc-meta")).toContainText(
      "guides / v2 / getting-started",
    );
  });

  test("versioning keeps target context for unavailable docs and fails safely on malformed metadata", async ({ page }) => {
    await page.goto("http://localhost:3100/guides/v1/api-reference");

    await page.getByTestId("version-select").selectOption("v2");
    await page.waitForURL("**/guides/v2/api-reference", { timeout: 10000 });
    await expect(page.getByTestId("document-unavailable")).toBeVisible();
    await expect(page.getByTestId("document-unavailable").getByText(/guides\/v2/)).toBeVisible();
    await expect(page.getByTestId("version-active-label")).toContainText("v2");

    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.toString();

        if (requestUrl.includes("/api/versions/guides")) {
          return new Response(
            JSON.stringify({
              space: "guides",
              versions: [{ broken: true }],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return originalFetch(input, init);
      };
    });

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await expect(page.getByTestId("version-error")).toBeVisible();
    await expect(page.getByTestId("document-content")).toHaveCount(0);
  });
});
