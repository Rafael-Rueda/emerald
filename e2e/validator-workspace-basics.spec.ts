import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const EVIDENCE_DIR = 'C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\mocked-workspace-surface\\group1';
const WORKSPACE_URL = 'http://localhost:3101/admin';

test.describe('Workspace Basics Validation (VAL-WORKSPACE-001, 002, 009, 007, 008)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('VAL-WORKSPACE-001 & VAL-WORKSPACE-002: Admin shell and discoverable core admin sections', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    // Entry
    await page.goto(WORKSPACE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WORKSPACE-001-workspace-shell-at-entry.png') });
    
    // Check nav
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WORKSPACE-002-workspace-nav.png') });

    // Navigate to versions
    const versionsLink = page.locator('a[href="/admin/versions"], a:has-text("Versions")').first();
    await versionsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // give it a moment to render

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WORKSPACE-001-workspace-shell-after-section-change.png') });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WORKSPACE-002-active-admin-section.png') });

    // Expect no errors
    expect(errors.filter(e => !e.includes('favicon'))).toEqual([]);
  });

  test('VAL-WORKSPACE-009: Direct workspace sub-route loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    const routes = [
      { path: '/admin/documents', file: 'VAL-WORKSPACE-009-workspace-documents-deep-link.png' },
      { path: '/admin/navigation', file: 'VAL-WORKSPACE-009-workspace-navigation-deep-link.png' },
      { path: '/admin/versions', file: 'VAL-WORKSPACE-009-workspace-versions-deep-link.png' },
      { path: '/admin/ai-context', file: 'VAL-WORKSPACE-009-workspace-ai-deep-link.png' }
    ];

    for (const route of routes) {
      await page.goto(`http://localhost:3101${route.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // give it a moment to render
      await page.screenshot({ path: path.join(EVIDENCE_DIR, route.file) });
    }
  });

  test('VAL-WORKSPACE-007: Management views stay stable during non-success states', async ({ context, page }) => {
     const sections = ['documents', 'navigation', 'versions'];
     const scenarios = ['loading', 'empty', 'error'];

     for (const section of sections) {
        for (const scenario of scenarios) {
            await context.addCookies([{ name: 'SCENARIO', value: scenario, url: 'http://localhost:3101' }]);
            await page.goto(`http://localhost:3101/admin/${section}`);
            
            if (scenario === 'loading') {
                await page.waitForTimeout(1000);
            } else {
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(500);
            }
            
            await page.screenshot({ path: path.join(EVIDENCE_DIR, `VAL-WORKSPACE-007-${section}-list-detail-${scenario}.png`) });
        }
     }
  });

  test('VAL-WORKSPACE-008: Invalid workspace payloads fail safely', async ({ context, page }) => {
     const sections = ['documents', 'navigation', 'versions'];
     
     await context.addCookies([{ name: 'SCENARIO', value: 'malformed', url: 'http://localhost:3101' }]);
     
     for (const section of sections) {
         await page.goto(`http://localhost:3101/admin/${section}`);
         await page.waitForLoadState('networkidle');
         await page.waitForTimeout(500);
         await page.screenshot({ path: path.join(EVIDENCE_DIR, `VAL-WORKSPACE-008-${section}-list-detail-schema-failure.png`) });
     }
  });
});
