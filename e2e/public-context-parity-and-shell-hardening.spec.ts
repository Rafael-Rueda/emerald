import { test, expect, type Page } from "@playwright/test";

interface ReadingContextSnapshot {
  path: string;
  title: string;
  breadcrumbCurrent: string;
  activeSidebarTestId: string;
  versionLabel: string;
  tocMode: "populated" | "empty";
}

async function captureReadingContext(page: Page): Promise<ReadingContextSnapshot> {
  const path = new URL(page.url()).pathname;
  const title = (await page.getByTestId("doc-title").textContent())?.trim() ?? "";
  const breadcrumbCurrent =
    (await page.getByTestId("breadcrumb-current").textContent())?.trim() ?? "";

  const activeSidebarItem = page.locator('[data-testid^="sidebar-item-"][aria-current="page"]').first();
  const activeSidebarTestId = (await activeSidebarItem.getAttribute("data-testid")) ?? "";

  const versionLabel =
    (await page.getByTestId("version-active-label").textContent())?.trim() ?? "";

  const tocMode = (await page.getByTestId("toc-empty").count()) > 0 ? "empty" : "populated";

  return {
    path,
    title,
    breadcrumbCurrent,
    activeSidebarTestId,
    versionLabel,
    tocMode,
  };
}

test.describe("public context parity and shell hardening", () => {
  test("resolved default docs state is internally consistent", async ({ page }) => {
    await page.goto("http://localhost:3100/");
    await page.waitForURL("**/guides/v1/getting-started", { timeout: 15000 });

    await expect(page.getByTestId("doc-title")).toHaveText("Getting Started");
    await expect(page.getByTestId("breadcrumb-space")).toHaveText("guides");
    await expect(page.getByTestId("breadcrumb-version")).toHaveText("v1");
    await expect(page.getByTestId("breadcrumb-current")).toHaveText("Getting Started");
    await expect(page.getByTestId("sidebar-item-getting-started")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("version-active-label")).toHaveText("v1");
    await expect(page.getByTestId("version-select")).toHaveValue("v1");
    await expect(page.getByTestId("toc-entry-installation")).toBeVisible();
    await expect(page.getByTestId("toc-empty")).toHaveCount(0);
  });

  test("direct deep links match in-app navigation state", async ({ page }) => {
    await page.goto("http://localhost:3100/guides/v1/api-reference");
    await expect(page.getByTestId("doc-title")).toHaveText("API Reference");
    const directSnapshot = await captureReadingContext(page);

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await expect(page.getByTestId("sidebar-item-api-reference")).toBeVisible();
    await page.getByTestId("sidebar-item-api-reference").click();
    await page.waitForURL("**/guides/v1/api-reference", { timeout: 10000 });
    await expect(page.getByTestId("doc-title")).toHaveText("API Reference");

    const navigatedSnapshot = await captureReadingContext(page);
    expect(navigatedSnapshot).toEqual(directSnapshot);
  });

  test("malformed document payload fails safely", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.toString();

        if (requestUrl.includes("/api/docs/guides/v1/getting-started")) {
          return new Response(JSON.stringify({ document: { id: 123 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return originalFetch(input, init);
      };
    });

    await page.goto("http://localhost:3100/guides/v1/getting-started");

    await expect(page.getByTestId("document-error")).toBeVisible();
    await expect(page.getByTestId("document-content")).toHaveCount(0);
  });

  test("failing navigation shell data fails safely", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.toString();

        if (requestUrl.includes("/api/navigation/guides/v1")) {
          return new Response(JSON.stringify({ error: "boom" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return originalFetch(input, init);
      };
    });

    await page.goto("http://localhost:3100/guides/v1/getting-started");

    await expect(
      page.getByTestId("reading-shell-article").getByTestId("navigation-error"),
    ).toBeVisible();
    await expect(page.getByTestId("document-content")).toHaveCount(0);
  });

  test("malformed navigation shell data fails safely", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.toString();

        if (requestUrl.includes("/api/navigation/guides/v1")) {
          return new Response(JSON.stringify({ navigation: "broken" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return originalFetch(input, init);
      };
    });

    await page.goto("http://localhost:3100/guides/v1/getting-started");

    await expect(
      page.getByTestId("reading-shell-article").getByTestId("navigation-error"),
    ).toBeVisible();
    await expect(page.getByTestId("document-content")).toHaveCount(0);
  });

  test("malformed version shell data fails safely", async ({ page }) => {
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
