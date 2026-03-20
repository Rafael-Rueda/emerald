import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const evidenceDir = 'C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\public-docs-surface\\group-1';
const baseUrl = 'http://localhost:3100';

test.describe('Public Docs Surface - Group 1', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test('VAL-CROSS-001', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    const networkRequests: { url: string, status: number }[] = [];
    page.on('response', response => {
      networkRequests.push({ url: response.url(), status: response.status() });
    });

    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: path.join(evidenceDir, 'VAL-CROSS-001-public-entry.png') });
    
    const url = page.url();
    expect(url).not.toBe(`${baseUrl}/`); 
    
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-CROSS-001-resolved-default-route.png') });

    fs.writeFileSync(path.join(evidenceDir, 'VAL-CROSS-001-network.json'), JSON.stringify(networkRequests));
    fs.writeFileSync(path.join(evidenceDir, 'VAL-CROSS-001-errors.json'), JSON.stringify(consoleErrors));
    fs.writeFileSync(path.join(evidenceDir, 'VAL-CROSS-001-url.txt'), url);
  });

  test('VAL-PUBLIC-001', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const networkRequests: { url: string, status: number }[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        networkRequests.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    const content = await page.locator('body').textContent();
    expect(content).not.toBeNull();
    
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-PUBLIC-001-public-doc-page.png') });

    fs.writeFileSync(path.join(evidenceDir, 'VAL-PUBLIC-001-network.json'), JSON.stringify(networkRequests));
    fs.writeFileSync(path.join(evidenceDir, 'VAL-PUBLIC-001-errors.json'), JSON.stringify(consoleErrors));
  });

  test('VAL-PUBLIC-002', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: path.join(evidenceDir, 'VAL-PUBLIC-002-public-shell.png') });
    
    fs.writeFileSync(path.join(evidenceDir, 'VAL-PUBLIC-002-errors.json'), JSON.stringify(consoleErrors));
  });

  test('VAL-PUBLIC-003', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const networkRequests: { url: string, status: number }[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        networkRequests.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-PUBLIC-003-before-navigation.png') });

    const links = page.locator('nav a, aside a, [class*="sidebar"] a, [class*="nav"] a');
    const count = await links.count();
    
    let clicked = false;
    if (count > 0) {
      const currentUrl = page.url();
      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        if (href && !currentUrl.endsWith(href) && !href.startsWith('http')) {
          await link.click();
          await page.waitForLoadState('networkidle');
          clicked = true;
          break;
        }
      }
    }
    
    await page.screenshot({ path: path.join(evidenceDir, 'VAL-PUBLIC-003-after-navigation.png') });

    fs.writeFileSync(path.join(evidenceDir, 'VAL-PUBLIC-003-network.json'), JSON.stringify(networkRequests));
    fs.writeFileSync(path.join(evidenceDir, 'VAL-PUBLIC-003-errors.json'), JSON.stringify(consoleErrors));
  });
});
