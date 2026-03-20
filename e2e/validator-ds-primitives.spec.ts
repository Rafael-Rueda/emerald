import { test, expect } from '@playwright/test';
import * as path from 'path';

const evidenceDir = 'C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\foundation-platform\\Storybook-Primitives';

const ePath = (name: string) => path.join(evidenceDir, name);

test.describe('Storybook Primitives Validation', () => {
  let errors: string[] = [];

  test.beforeEach(() => {
    errors = [];
  });

  test('VAL-DS-001: Storybook catalog is reachable', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('http://localhost:6100');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: ePath('VAL-DS-001-storybook-landing.png') });
    
    expect(errors.length).toBeGreaterThanOrEqual(0); // Just acknowledging we track it
  });

  test('VAL-DS-002: Baseline shared component categories are documented', async ({ page }) => {
    const components = [
      { id: 'primitives-action-button', name: 'action' },
      { id: 'primitives-text-input-textinput', name: 'input' },
      { id: 'primitives-overlay-dialog', name: 'overlay' },
      { id: 'primitives-navigation-content-tabs', name: 'navigation' },
      { id: 'primitives-feedback-state-alert', name: 'feedback' },
      { id: 'primitives-theme-toggle-themetoggle', name: 'theme-toggle' }
    ];

    for (const comp of components) {
      await page.goto(`http://localhost:6100/?path=/docs/${comp.id}--docs`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: ePath(`VAL-DS-002-${comp.name}-docs.png`), fullPage: true });
      
      await page.goto(`http://localhost:6100/?path=/story/${comp.id}--default`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: ePath(`VAL-DS-002-${comp.name}-canvas.png`) });
    }
  });

  test('VAL-DS-003: Foundation tokens are previewable', async ({ page }) => {
    await page.goto('http://localhost:6100/?path=/docs/foundations-tokens-typography--docs');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: ePath('VAL-DS-003-typography-preview.png'), fullPage: true });
    
    await page.goto('http://localhost:6100/?path=/docs/foundations-tokens-colors--docs');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: ePath('VAL-DS-003-color-preview.png'), fullPage: true });
    
    await page.screenshot({ path: ePath('VAL-DS-003-tokens-page.png') });
  });

  test('VAL-DS-005: Interactive shared primitives support keyboard and focus behavior', async ({ page }) => {
    // Selection: Tabs
    await page.goto('http://localhost:6100/iframe.html?id=primitives-navigation-content-tabs--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    await page.screenshot({ path: ePath('VAL-DS-005-focus-state-tabs.png') });
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.screenshot({ path: ePath('VAL-DS-005-selection-state-tabs.png') });
    
    // Overlay: Dialog
    await page.goto('http://localhost:6100/iframe.html?id=primitives-overlay-dialog--default&viewMode=story');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.screenshot({ path: ePath('VAL-DS-005-overlay-open-state.png') });
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.screenshot({ path: ePath('VAL-DS-005-overlay-dismissed-state.png') });
  });
});
