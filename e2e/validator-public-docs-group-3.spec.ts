import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const evidenceDir = "C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\public-docs-surface\\group-3";

test.beforeAll(() => {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
});

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
  const activeSidebarTestId = await activeSidebarItem.count() > 0 ? ((await activeSidebarItem.getAttribute("data-testid")) ?? "") : "";

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

test.describe("Group 3 Assertions", () => {
  test("VAL-CROSS-002: Resolved default docs state is internally consistent", async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') logs.push(msg.text()) });

    await page.goto("http://localhost:3100/");
    await page.waitForURL("**/guides/v1/getting-started", { timeout: 15000 });

    await expect(page.getByTestId("doc-title")).toHaveText("Getting Started");
    await expect(page.getByTestId("breadcrumb-space")).toHaveText("guides");
    await expect(page.getByTestId("breadcrumb-version")).toHaveText("v1");
    await expect(page.getByTestId("breadcrumb-current")).toHaveText("Getting Started");
    await expect(page.getByTestId("sidebar-item-getting-started")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("version-active-label")).toHaveText("v1");
    await expect(page.getByTestId("version-select")).toHaveValue("v1");
    await expect(page.getByTestId("toc-entry-installation")).toBeVisible();
    await expect(page.getByTestId("toc-empty")).toHaveCount(0);

    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-002-default-public-state.png") });
    // Expecting 0 console errors unless MSW complains about unhandled requests
  });

  test("VAL-CROSS-003: Direct deep links match in-app navigation state", async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') logs.push(msg.text()) });

    await page.goto("http://localhost:3100/guides/v1/api-reference");
    await expect(page.getByTestId("doc-title")).toHaveText("API Reference");
    
    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-003-direct-deep-link.png") });
    const directSnapshot = await captureReadingContext(page);

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await expect(page.getByTestId("sidebar-item-api-reference")).toBeVisible();
    await page.getByTestId("sidebar-item-api-reference").click();
    await page.waitForURL("**/guides/v1/api-reference", { timeout: 10000 });
    await expect(page.getByTestId("doc-title")).toHaveText("API Reference");

    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-003-navigated-deep-link.png") });
    const navigatedSnapshot = await captureReadingContext(page);
    expect(navigatedSnapshot).toEqual(directSnapshot);
  });

  test("VAL-PUBLIC-008: Public document request failure shows safe non-success state", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
        if (requestUrl.includes("/api/docs/guides/v1/getting-started")) {
          return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    });

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await expect(page.getByTestId("document-error")).toBeVisible();
    await expect(page.getByTestId("document-content")).toHaveCount(0);
    
    await page.screenshot({ path: path.join(evidenceDir, "VAL-PUBLIC-008-public-document-request-failure.png") });
  });

  test("VAL-PUBLIC-009: Malformed document payload fails safely", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
        if (requestUrl.includes("/api/docs/guides/v1/getting-started")) {
          return new Response(JSON.stringify({ document: { id: 123 } }), { // malformed
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
    
    await page.screenshot({ path: path.join(evidenceDir, "VAL-PUBLIC-009-public-document-schema-failure.png") });
  });

  test("VAL-PUBLIC-009: Malformed navigation payload fails safely", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
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
    await expect(page.getByTestId("reading-shell-article").getByTestId("navigation-error")).toBeVisible();
    await expect(page.getByTestId("document-content")).toHaveCount(0);
    
    await page.screenshot({ path: path.join(evidenceDir, "VAL-PUBLIC-009-public-navigation-failure.png") });
  });

  test("VAL-PUBLIC-009: Malformed version payload fails safely", async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
        if (requestUrl.includes("/api/versions/guides")) {
          return new Response(
            JSON.stringify({ space: "guides", versions: [{ broken: true }] }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(input, init);
      };
    });

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await expect(page.getByTestId("version-error")).toBeVisible();
    await expect(page.getByTestId("document-content")).toHaveCount(0);
    
    await page.screenshot({ path: path.join(evidenceDir, "VAL-PUBLIC-009-public-version-metadata-failure.png") });
  });
});
