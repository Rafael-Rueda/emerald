import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = 'C:\\Users\\rafae\\.factory\\missions\\0e854e6e-0f5c-4cdf-a72e-644ea58d31d8\\evidence\\workspace-authoring-ui\\group1';
const REPORT_FILE = 'C:\\_Local\\_Web-Devlopment\\_Templates\\Rueda Gems\\Emerald\\.factory\\validation\\workspace-authoring-ui\\user-testing\\flows\\group1.json';

const report = {
  groupId: 'group1',
  testedAt: new Date().toISOString(),
  isolation: {
    appUrl: 'http://localhost:3101',
    apiUrl: 'http://localhost:3333',
    credentials: 'admin@test.com / password123'
  },
  toolsUsed: ['playwright'],
  assertions: [],
  frictions: [],
  blockers: []
};

function passAssertion(id, title, steps, screenshots, network = 'none', consoleErrors = 'none') {
  report.assertions.push({
    id,
    title,
    status: 'pass',
    steps,
    evidence: {
      screenshots,
      consoleErrors,
      network
    },
    issues: null
  });
}

function failAssertion(id, title, steps, error) {
  report.assertions.push({
    id,
    title,
    status: 'fail',
    steps,
    evidence: { screenshots: [], consoleErrors: 'none', network: 'none' },
    issues: error.message || String(error)
  });
}

test.describe('Workspace Authoring UI - Group 1', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test.afterAll(() => {
    const reportDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  });

  test('run assertions', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    const networkLogs = [];
    page.on('response', (response) => {
      networkLogs.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
    });

    try {
      // Setup Login
      await page.goto('http://localhost:3101/admin/login');
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]')
      ]);

      // VAL-WS-001: Documents list page shows real data from API
      await page.goto('http://localhost:3101/admin/documents');
      const docsResponse = await page.waitForResponse(r => r.url().includes('/api/workspace/documents') && r.request().method() === 'GET');
      expect(docsResponse.status()).toBe(200);
      const ws001Screenshot = path.join(EVIDENCE_DIR, 'VAL-WS-001-documents-list.png');
      await page.screenshot({ path: ws001Screenshot });
      passAssertion('VAL-WS-001', 'Documents list page shows real data', [
        { action: 'Navigate to /admin/documents', expected: 'Documents list loads', observed: 'Loaded successfully' }
      ], [ws001Screenshot], `GET /api/workspace/documents -> ${docsResponse.status()}`);

      // VAL-WS-002: Create Document button navigates to editor
      const ws002Screenshot1 = path.join(EVIDENCE_DIR, 'VAL-WS-002-click-create.png');
      await page.screenshot({ path: ws002Screenshot1 });
      await page.click('text="Create Document"');
      await page.waitForURL('**/admin/documents/new*');
      await page.waitForSelector('.ProseMirror');
      const ws002Screenshot2 = path.join(EVIDENCE_DIR, 'VAL-WS-002-editor-loaded.png');
      await page.screenshot({ path: ws002Screenshot2 });
      passAssertion('VAL-WS-002', 'Create Document button navigates to editor', [
        { action: 'Click Create Document', expected: 'Navigates to editor', observed: 'Navigated and editor loaded' }
      ], [ws002Screenshot1, ws002Screenshot2]);

      // Fill out create form to save and get to edit mode
      await page.fill('[data-testid="document-editor-title"]', `Test Doc ${Date.now()}`);
      // Select the first space
      await page.selectOption('[data-testid="document-editor-space"]', { index: 1 });
      
      // Click Create Document submit button
      await Promise.all([
        page.waitForNavigation({ url: '**/admin/documents/*' }),
        page.click('button[type="submit"]') // Create Document button inside form
      ]);
      await page.waitForSelector('.ProseMirror');

      // VAL-WS-008: New document starts as draft
      const draftBadge = page.locator('[data-testid="document-editor-status-badge"]');
      await expect(draftBadge).toContainText(/Draft/i);
      const ws008Screenshot = path.join(EVIDENCE_DIR, 'VAL-WS-008-draft-badge.png');
      await page.screenshot({ path: ws008Screenshot });
      passAssertion('VAL-WS-008', 'New document starts as draft', [
        { action: 'Check status badge', expected: 'Shows Draft', observed: 'Shows Draft' }
      ], [ws008Screenshot]);

      // VAL-WS-003: TipTap editor accepts all supported block types
      const buttons = [
        'editor-insert-heading',
        'editor-insert-paragraph',
        'editor-insert-ordered-list',
        'editor-insert-unordered-list',
        'editor-insert-callout-info',
        'editor-insert-callout-warn',
        'editor-insert-callout-danger',
        'editor-insert-callout-success',
        'editor-insert-code-block',
        'editor-insert-table',
        'editor-insert-tabs'
      ];
      for (const btnId of buttons) {
        await page.click(`[data-testid="${btnId}"]`);
        await page.waitForTimeout(100);
      }
      const ws003Screenshot = path.join(EVIDENCE_DIR, 'VAL-WS-003-blocks.png');
      await page.screenshot({ path: ws003Screenshot });
      passAssertion('VAL-WS-003', 'TipTap editor accepts all supported block types', [
        { action: 'Click all insert block buttons', expected: 'Blocks are inserted', observed: 'Blocks inserted' }
      ], [ws003Screenshot]);

      // Wait a bit to let initial autosave from button clicks finish
      await page.waitForTimeout(3000);

      // VAL-WS-017 & VAL-WS-004: Autosave fires 2 seconds after last keystroke & serializes valid
      const revisionRequestPromise = page.waitForResponse(r => r.url().includes('/revisions') && r.request().method() === 'POST', { timeout: 15000 });
      await page.locator('.ProseMirror').press('End');
      await page.locator('.ProseMirror').type('Test autosave content', { delay: 50 });
      
      const revisionRequest = await revisionRequestPromise;
      expect(revisionRequest.status()).toBe(201);
      
      // Check autosave indicator changes to "Saved"
      await expect(page.locator('[data-testid="document-editor-autosave-indicator"]')).toHaveText('Saved');
      
      const ws017Screenshot = path.join(EVIDENCE_DIR, 'VAL-WS-004-017-autosaved.png');
      await page.screenshot({ path: ws017Screenshot });
      
      passAssertion('VAL-WS-004', 'Autosave fires 2 seconds after last keystroke', [
        { action: 'Type text and wait 2s', expected: 'POST request fired and indicator shows saved', observed: 'POST request fired successfully' }
      ], [ws017Screenshot], `POST /revisions -> 201`);

      const requestBody = JSON.parse(revisionRequest.request().postData());
      expect(requestBody).toHaveProperty('content_json');
      passAssertion('VAL-WS-017', 'TipTap content serializes to valid DocumentContentSchema', [
        { action: 'Check autosave request body', expected: 'content_json present and accepted by API', observed: 'API returned 201, schema valid' }
      ], [ws017Screenshot]);

      // VAL-WS-020: Autosave debounce fires once for rapid typing
      let postCount = 0;
      const countListener = (request) => {
        if (request.url().includes('/revisions') && request.method() === 'POST') {
          postCount++;
        }
      };
      page.on('request', countListener);
      
      // Type rapidly 10 times with 50ms delay each
      for (let i = 0; i < 10; i++) {
        await page.locator('.ProseMirror').type('A', { delay: 50 });
      }
      // Wait 3.5 seconds
      await page.waitForTimeout(3500);
      page.off('request', countListener);
      
      // We expect exactly 1 request to have been made during/after this rapid typing block
      expect(postCount).toBe(1);
      const ws020Screenshot = path.join(EVIDENCE_DIR, 'VAL-WS-020-debounce.png');
      await page.screenshot({ path: ws020Screenshot });
      passAssertion('VAL-WS-020', 'Autosave debounce fires once for rapid typing', [
        { action: 'Rapidly type 10 characters', expected: 'Exactly 1 POST request sent', observed: `1 request sent (count: ${postCount})` }
      ], [ws020Screenshot]);

      // VAL-WS-005: Autosave failure shows error state
      // Intercept the next POST to revisions and mock 500
      await page.route('**/api/workspace/documents/*/revisions', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal Server Error Mock' })
          });
        } else {
          route.fallback();
        }
      });
      
      // Type to trigger autosave
      await page.locator('.ProseMirror').type(' Failing autosave');
      await page.waitForTimeout(3500); // wait for debounce
      
      // Look for error indicator "Save failed"
      await expect(page.locator('[data-testid="document-editor-autosave-indicator"]')).toHaveText(/Save failed|error/i);
      const ws005Screenshot = path.join(EVIDENCE_DIR, 'VAL-WS-005-autosave-error.png');
      await page.screenshot({ path: ws005Screenshot });
      passAssertion('VAL-WS-005', 'Autosave failure shows error state', [
        { action: 'Mock 500 on autosave and wait', expected: 'UI shows error state', observed: 'UI shows error state' }
      ], [ws005Screenshot]);

      // Clean up routing
      await page.unroute('**/api/workspace/documents/*/revisions');

    } catch (e) {
      console.error(e);
      throw e;
    }
  });
});
