import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const EVIDENCE_DIR = "C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\mocked-workspace-surface\\group2";

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test.describe("VAL-WORKSPACE-003: Documents management supports selection-sensitive list-to-detail inspection", () => {
  test("documents list and details", async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/workspace/documents") && res.request().method() === "GET"
    );
    await page.goto("http://localhost:3101/admin/documents");
    const listResponse = await listResponsePromise;
    expect(listResponse.ok()).toBeTruthy();

    await expect(page.getByTestId("documents-list")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-003-documents-list.png"),
    });

    const items = page.locator('[data-testid^="document-list-item-"] button');
    await expect(items.nth(1)).toBeVisible();

    // Detail A
    await items.nth(0).click();
    await expect(page.getByTestId("document-detail-id")).toBeVisible();
    const idA = await page.getByTestId("document-detail-id").textContent();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-003-document-detail-A.png"),
    });

    // Detail B
    await items.nth(1).click();
    await expect(page.getByTestId("document-detail-id")).not.toHaveText(idA || "");
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-003-document-detail-B.png"),
    });
  });
});

test.describe("VAL-WORKSPACE-004: Navigation management supports selection-sensitive list-to-detail inspection", () => {
  test("navigation list and details", async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/workspace/navigation") && res.request().method() === "GET"
    );
    await page.goto("http://localhost:3101/admin/navigation");
    const listResponse = await listResponsePromise;
    expect(listResponse.ok()).toBeTruthy();

    await expect(page.getByTestId("navigation-list")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-004-navigation-list.png"),
    });

    const items = page.locator('[data-testid^="navigation-list-item-"] button');
    await expect(items.nth(1)).toBeVisible();

    // Detail A
    await items.nth(0).click();
    await expect(page.getByTestId("navigation-detail-id")).toBeVisible();
    const idA = await page.getByTestId("navigation-detail-id").textContent();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-004-navigation-detail-A.png"),
    });

    // Detail B
    await items.nth(1).click();
    await expect(page.getByTestId("navigation-detail-id")).not.toHaveText(idA || "");
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-004-navigation-detail-B.png"),
    });
  });
});

test.describe("VAL-WORKSPACE-005: Versions management supports selection-sensitive list-to-detail inspection", () => {
  test("versions list and details", async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/workspace/versions") && res.request().method() === "GET"
    );
    await page.goto("http://localhost:3101/admin/versions");
    const listResponse = await listResponsePromise;
    expect(listResponse.ok()).toBeTruthy();

    await expect(page.getByTestId("versions-list")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-005-versions-list.png"),
    });

    const items = page.locator('[data-testid^="version-list-item-"] button');
    await expect(items.nth(1)).toBeVisible();

    // Detail A
    await items.nth(0).click();
    await expect(page.getByTestId("version-detail-id")).toBeVisible();
    const idA = await page.getByTestId("version-detail-id").textContent();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-005-version-detail-A.png"),
    });

    // Detail B
    await items.nth(1).click();
    await expect(page.getByTestId("version-detail-id")).not.toHaveText(idA || "");
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-005-version-detail-B.png"),
    });
  });
});

test.describe("VAL-WORKSPACE-006: Workspace exposes at least one representative mocked management action per admin domain", () => {
  test("document publish action", async ({ page }) => {
    await page.goto("http://localhost:3101/admin/documents");
    const items = page.locator('[data-testid^="document-list-item-"] button');
    await expect(items.first()).toBeVisible();
    await items.first().click();

    const publishBtn = page.getByRole("button", { name: "Publish selected document" });
    await expect(publishBtn).toBeVisible();
    // if disabled, click next item
    if (await publishBtn.isDisabled()) {
      await items.nth(1).click();
    }

    // Success
    const publishResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/publish") && res.request().method() === "POST"
    );
    await publishBtn.click();
    const publishResponse = await publishResponsePromise;
    expect(publishResponse.ok()).toBeTruthy();
    await expect(page.getByTestId("document-action-feedback-success")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-006-document-action-success.png"),
    });

    // Failure: intercept using init script to bypass MSW
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.includes("/publish") && init?.method === "POST") {
          return new Response(JSON.stringify({ success: false, message: "Forced failure" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    });

    await page.reload();
    await expect(page.getByTestId("documents-list")).toBeVisible();
    await items.nth(0).click();
    await expect(publishBtn).toBeVisible();
    if (await publishBtn.isDisabled()) {
      await items.nth(1).click();
    }
    await expect(publishBtn).toBeEnabled();
    await publishBtn.click();
    await expect(page.getByTestId("document-action-feedback-error")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-006-document-action-failure.png"),
    });
  });

  test("navigation reorder action", async ({ page }) => {
    await page.goto("http://localhost:3101/admin/navigation");
    const items = page.locator('[data-testid^="navigation-list-item-"] button');
    await expect(items.nth(1)).toBeVisible();
    await items.nth(1).click();

    const reorderBtn = page.getByRole("button", { name: "Move selected item to top" });
    await expect(reorderBtn).toBeVisible();

    // Success
    const reorderResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/reorder") && res.request().method() === "POST"
    );
    await reorderBtn.click();
    const reorderResponse = await reorderResponsePromise;
    expect(reorderResponse.ok()).toBeTruthy();
    await expect(page.getByTestId("navigation-action-feedback-success")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-006-navigation-action-success.png"),
    });

    // Failure: intercept using init script to bypass MSW
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.includes("/reorder") && init?.method === "POST") {
          return new Response(JSON.stringify({ success: false, message: "Forced failure" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    });

    await page.reload();
    await expect(page.getByTestId("navigation-list")).toBeVisible();
    await items.nth(0).click();
    await expect(reorderBtn).toBeVisible();
    if (await reorderBtn.isDisabled()) {
      await items.nth(1).click();
    }
    await expect(reorderBtn).toBeEnabled();
    await reorderBtn.click();
    await expect(page.getByTestId("navigation-action-feedback-error")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-006-navigation-action-failure.png"),
    });
  });

  test("versions publish action", async ({ page }) => {
    await page.goto("http://localhost:3101/admin/versions");
    const items = page.locator('[data-testid^="version-list-item-"] button');
    await expect(items.first()).toBeVisible();
    await items.first().click();

    const publishBtn = page.getByRole("button", { name: "Publish selected version" });
    await expect(publishBtn).toBeVisible();
    if (await publishBtn.isDisabled()) {
      await items.nth(1).click();
    }

    // Success
    const publishResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/publish") && res.request().method() === "POST"
    );
    await publishBtn.click();
    const publishResponse = await publishResponsePromise;
    expect(publishResponse.ok()).toBeTruthy();
    await expect(page.getByTestId("version-action-feedback-success")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-006-version-action-success.png"),
    });

    // Failure: intercept using init script to bypass MSW
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.includes("/publish") && init?.method === "POST") {
          return new Response(JSON.stringify({ success: false, message: "Forced failure" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    });

    await page.reload();
    await expect(page.getByTestId("versions-list")).toBeVisible();
    await items.nth(0).click();
    await expect(publishBtn).toBeVisible();
    if (await publishBtn.isDisabled()) {
      await items.nth(1).click();
    }
    await expect(publishBtn).toBeEnabled();
    await publishBtn.click();
    await expect(page.getByTestId("version-action-feedback-error")).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "VAL-WORKSPACE-006-version-action-failure.png"),
    });
  });
});
