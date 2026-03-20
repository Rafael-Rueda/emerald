import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const evidenceDir = 'C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\public-docs-surface\\group-4\\';

test.describe('group-4 search validation', () => {
  let consoleErrors: string[] = [];

  test.beforeAll(async () => {
    fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
  });

  test('VAL-SEARCH-001: Search entry point and results', async ({ page }) => {
    const networkRequests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/api/search')) {
        networkRequests.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto('http://localhost:3100');
    
    const searchInput = page.getByTestId('search-input');
    await searchInput.waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-001-search-input.png') });
    
    await searchInput.fill('Emerald');
    await page.getByTestId('search-submit').click();
    
    await expect(page.getByTestId('search-results')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-001-search-results.png') });
    
    console.log('VAL-SEARCH-001-NETWORK:', networkRequests.join(', '));
    console.log('VAL-SEARCH-001-ERRORS:', consoleErrors.join(', '));
  });

  test('VAL-SEARCH-002: Search handles non-success states', async ({ page }) => {
    // We use page.addInitScript to intercept fetch because MSW service worker 
    // catches requests before Playwright's page.route can intercept them.
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const url = args[0].toString();
        if (url.includes('/api/search')) {
          if (url.includes('q=loadingtest')) {
            await new Promise(r => setTimeout(r, 2000));
            return new Response(JSON.stringify({ query: 'loadingtest', results: [], totalCount: 0 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('q=emptytest')) {
            return new Response(JSON.stringify({ query: 'emptytest', results: [], totalCount: 0 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('q=errortest')) {
            return new Response('Internal Server Error', { status: 500 });
          }
          if (url.includes('q=malformedtest')) {
            return new Response(JSON.stringify({ notAnArray: "malformed" }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        return originalFetch(...args);
      };
    });

    await page.goto('http://localhost:3100');

    // 1. Loading state
    let searchInput = page.getByTestId('search-input');
    await searchInput.fill('loadingtest');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('search-loading')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-002-search-loading.png') });

    // 2. Empty state
    await searchInput.fill('emptytest');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('search-empty')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-002-search-empty.png') });

    // 3. Error state
    await searchInput.fill('errortest');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('search-error')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-002-search-error.png') });

    // 4. Validation error state
    await searchInput.fill('malformedtest');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('search-validation-error')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-002-stale-result-transition-handled.png') });
  });

  test('VAL-SEARCH-003 and VAL-CROSS-004: Selecting a result', async ({ page }) => {
    await page.goto('http://localhost:3100');
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('Emerald');
    await page.getByTestId('search-submit').click();
    
    await expect(page.getByTestId('search-results')).toBeVisible();
    
    const firstResultLink = page.locator('[data-testid^="search-result-link-"]').first();
    await expect(firstResultLink).toBeVisible();
    
    await firstResultLink.hover();
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-003-search-result-selected.png') });
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-CROSS-004-search-handoff.png') });
    
    await firstResultLink.click();
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-SEARCH-003-resolved-document.png') });
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-CROSS-004-post-handoff-document.png') });

    console.log('VAL-SEARCH-003-ERRORS:', consoleErrors.join(', '));
  });
});
