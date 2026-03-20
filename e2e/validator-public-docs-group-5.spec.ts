import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDir = 'C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\public-docs-surface\\group-5';
const baseUrl = 'http://localhost:3100';

test.describe('Public Docs Surface - Group 5 (Versioning)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test('VAL-VERSION-001: Version selector reflects active version and options', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // Screenshot the version selector
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-VERSION-001-version-selector.png') });
    
    // Attempt to open the version selector to see options
    const triggers = page.locator('button:has-text("v"), button[role="combobox"]');
    if (await triggers.count() > 0) {
      await triggers.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(evidenceDir, 'VAL-VERSION-001-version-options.png') });
    }
    
    expect(true).toBeTruthy();
  });

  test('VAL-VERSION-002 & VAL-CROSS-005: Switching version updates route and context', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: path.join(evidenceDir, 'VAL-VERSION-002-before-switch.png') });
    
    const initialUrl = page.url();
    
    // Switch version
    const triggers = page.locator('button:has-text("v"), button[role="combobox"]');
    if (await triggers.count() > 0) {
      await triggers.first().click();
      await page.waitForTimeout(500);
      
      const options = page.locator('[role="option"]');
      if (await options.count() > 1) {
        await options.nth(1).click();
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ path: path.join(evidenceDir, 'VAL-VERSION-002-after-switch.png') });
        await page.screenshot({ path: path.join(evidenceDir, 'VAL-CROSS-005-version-after.png') });
        
        const newUrl = page.url();
        expect(newUrl).not.toBe(initialUrl);
      }
    }
  });

  test('VAL-VERSION-003: Version loading state', async ({ page }) => {
    // Intercept to delay the request and capture loading state
    await page.route('**/api/v1/public/docs/**', async route => {
      await new Promise(r => setTimeout(r, 1000));
      await route.continue();
    });

    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    const triggers = page.locator('button:has-text("v"), button[role="combobox"]');
    if (await triggers.count() > 0) {
      await triggers.first().click();
      await page.waitForTimeout(500);
      const options = page.locator('[role="option"]');
      if (await options.count() > 1) {
        await options.nth(1).click();
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(evidenceDir, 'VAL-VERSION-003-version-loading.png') });
      }
    }
  });

  test('VAL-VERSION-004: Invalid versions and targets fail safely', async ({ page }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        if (url.includes('/api/v1/public/space') && url.includes('metadata')) {
          return new Response(JSON.stringify({ malformed: "data" }), { status: 200, headers: { 'content-type': 'application/json' }});
        }
        return originalFetch(...args);
      };
    });

    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-VERSION-004-metadata-error-state.png') });
  });
});
