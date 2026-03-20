import { expect, test } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const EVIDENCE_DIR = "C:/Users/rafae/.factory/missions/90873c85-f376-4669-b8a5-a7ed7eec901e/evidence/mocked-workspace-surface/group3";

// Ensure evidence directory exists
test.beforeAll(() => {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
});

function getScreenshotPath(filename: string) {
  return path.join(EVIDENCE_DIR, filename);
}

function withAiScenario(scenario: string): string {
  return `http://localhost:3101/admin/ai-context?aiScenario=${scenario}`;
}

test.describe("AI Context Validation", () => {
  test("VAL-AI-001 & VAL-AI-002", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const aiRequests: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/workspace/ai-context/")) {
        aiRequests.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
      }
    });

    await page.goto("http://localhost:3101/admin/ai-context");

    await expect(page.getByText("Workspace Admin · AI Context")).toBeVisible();
    await expect(page.getByTestId("ai-context-scope")).toHaveText("document/doc-getting-started");
    
    // Give time for chunks to load
    await expect(page.getByTestId("ai-context-chunks")).toBeVisible();
    
    // VAL-AI-001: screenshot(ai context for entity A)
    await page.screenshot({ path: getScreenshotPath("VAL-AI-001-entity-A.png") });
    
    // VAL-AI-002: AI context shows chunks and source references
    await page.screenshot({ path: getScreenshotPath("VAL-AI-002-ai-chunks.png") });
    
    // Check specific references (using selectors from existing test)
    await expect(page.getByTestId("ai-context-source-document-chunk-installation")).toBeVisible();
    await page.screenshot({ path: getScreenshotPath("VAL-AI-002-ai-references.png") });

    // Switch entity
    await page.getByRole("button", { name: /API Reference/i }).click();
    await expect(page.getByTestId("ai-context-scope")).toHaveText("document/doc-api-reference");
    await expect(page).toHaveURL(/entityId=doc-api-reference/);
    await page.waitForTimeout(1000);

    // VAL-AI-001: screenshot(ai context for entity B)
    await page.screenshot({ path: getScreenshotPath("VAL-AI-001-entity-B.png") });

    // Dump console errors to a file so we can include in report
    fs.writeFileSync(path.join(EVIDENCE_DIR, "VAL-AI-001-002-console.json"), JSON.stringify(consoleErrors));
    fs.writeFileSync(path.join(EVIDENCE_DIR, "VAL-AI-001-002-network.json"), JSON.stringify(aiRequests));
  });

  test("VAL-AI-003", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const networkRequests: string[] = [];
    page.on("response", (response) => {
        if (response.url().includes("/api/workspace/ai-context/")) {
            networkRequests.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
        }
    });

    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
        const url = new URL(requestUrl, window.location.origin);
        const scenario = new URL(window.location.href).searchParams.get("aiScenario");
        const isAiContextRequest = url.pathname.startsWith("/api/workspace/ai-context/");

        if (isAiContextRequest) {
          if (scenario === "loading") {
            return new Promise<Response>(() => {});
          }
          const [, , , , entityType, entityId] = url.pathname.split("/");
          if (scenario === "empty") {
            return new Response(JSON.stringify({ entityType, entityId, chunks: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
          if (scenario === "error") {
            return new Response(JSON.stringify({ error: "forced ai error" }), { status: 500, headers: { "Content-Type": "application/json" } });
          }
          if (scenario === "malformed") {
            return new Response(JSON.stringify({ entityType: 999, entityId, chunks: "not-an-array" }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
        }
        return originalFetch(input, init);
      };
    });

    // Loading state
    await page.goto(withAiScenario("loading"));
    await expect(page.getByTestId("ai-context-loading")).toBeVisible();
    await page.screenshot({ path: getScreenshotPath("VAL-AI-003-loading.png") });

    // Empty state
    await page.goto(withAiScenario("empty"));
    await expect(page.getByTestId("ai-context-empty")).toBeVisible();
    await page.screenshot({ path: getScreenshotPath("VAL-AI-003-empty.png") });

    // Error state
    await page.goto(withAiScenario("error"));
    await expect(page.getByTestId("ai-context-error")).toBeVisible();
    await page.screenshot({ path: getScreenshotPath("VAL-AI-003-error.png") });

    // Malformed payload state
    await page.goto(withAiScenario("malformed"));
    await expect(page.getByTestId("ai-context-validation-error")).toBeVisible();
    await page.screenshot({ path: getScreenshotPath("VAL-AI-003-malformed.png") });

    fs.writeFileSync(path.join(EVIDENCE_DIR, "VAL-AI-003-console.json"), JSON.stringify(consoleErrors));
    fs.writeFileSync(path.join(EVIDENCE_DIR, "VAL-AI-003-network.json"), JSON.stringify(networkRequests));
  });
});
