import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = 'C:\\Users\\rafae\\.factory\\missions\\0e854e6e-0f5c-4cdf-a72e-644ea58d31d8\\evidence\\workspace-authoring-ui\\group2';

test.describe('Workspace Authoring UI - Group 2 Assertions', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test.setTimeout(120000); // 2 minutes

  test('VAL-WS-006 to 019', async ({ page }) => {
    // 1. Log in
    await page.goto('http://localhost:3101/admin/login');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('login')) {
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/documents**', { timeout: 15000 });
    }

    // 2. Go to new document page
    await page.goto('http://localhost:3101/admin/documents/new');
    
    // Fill title
    await page.getByTestId('document-editor-title').fill(`Test Doc ${Date.now()}`);
    
    // Select space if not selected
    const spaceSelect = page.getByTestId('document-editor-space');
    await spaceSelect.selectOption({ index: 1 });

    // Type in editor
    await page.locator('.ProseMirror').click();
    await page.keyboard.type('Initial content.');
    
    // Click Create Document
    await page.getByRole('button', { name: /Create Document/i }).click();
    
    // Wait for navigation to edit mode
    await page.waitForURL('**/admin/documents/*');
    
    // Verify we are in edit mode by checking the publish button is visible
    const publishBtn = page.getByRole('button', { name: /^Publish/i });
    await expect(publishBtn).toBeVisible();

    // Trigger an autosave by typing more
    await page.locator('.ProseMirror').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Second revision.');
    
    // Wait for autosave
    const saveIndicator = page.getByTestId('document-editor-autosave-indicator');
    await expect(saveIndicator).toHaveText('Saved', { timeout: 15000 });

    // One more edit for a third revision
    await page.locator('.ProseMirror').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Third revision.');
    await expect(saveIndicator).toHaveText('Saved', { timeout: 15000 });

    // VAL-WS-006: Revision history panel
    const revisionBtn = page.getByRole('button', { name: /Revision History/i });
    await revisionBtn.click();
    
    const revisionPanel = page.getByTestId('document-editor-revision-history-panel');
    await expect(revisionPanel).toBeVisible();
    
    // Wait for revisions to load
    await expect(page.getByTestId('document-editor-revision-list').locator('button').first()).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WS-006-revision-history.png') });

    // VAL-WS-007: Restore revision
    const revisionItems = page.getByTestId('document-editor-revision-list').locator('button');
    await revisionItems.last().click();
    
    const restoreBtn = page.getByRole('button', { name: /Restore this revision/i });
    await restoreBtn.click();
    
    // confirm restore
    const confirmRestoreBtn = page.getByTestId('document-editor-restore-confirmation').getByRole('button', { name: /Confirm restore/i });
    await confirmRestoreBtn.click();
    
    // verify content restored
    await expect(page.locator('.ProseMirror')).toContainText('Initial content');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WS-007-restored-content.png') });

    // Close revision panel if needed
    const closeRevisionBtn = page.getByRole('button', { name: /Close Revision History/i });
    if (await closeRevisionBtn.isVisible()) {
        await closeRevisionBtn.click();
    }

    // Wait for autosave after restore
    await expect(saveIndicator).toHaveText('Saved', { timeout: 15000 });

    // VAL-WS-018: Publish requires confirmation dialog
    let publishApiCalled = false;
    await page.route('**/api/workspace/documents/*/publish', route => {
        publishApiCalled = true;
        route.continue();
    });

    await publishBtn.click();
    
    const confirmDialog = page.getByTestId('document-editor-publish-confirmation');
    await expect(confirmDialog).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WS-018-publish-confirmation.png') });
    
    const cancelBtn = confirmDialog.getByRole('button', { name: /Cancel/i });
    await cancelBtn.click();
    
    expect(publishApiCalled).toBe(false);
    const statusBadge = page.getByTestId('document-editor-status-badge');
    await expect(statusBadge).toContainText(/Draft/i);

    // VAL-WS-019: Publish failure rolls back optimistic status
    await page.route('**/api/workspace/documents/*/publish', async route => {
        await new Promise(r => setTimeout(r, 500));
        await route.fulfill({ status: 500, body: JSON.stringify({ message: 'Internal Server Error' }) });
    });

    await publishBtn.click();
    await confirmDialog.getByRole('button', { name: /Confirm/i }).click();
    
    const errorFeedback = page.getByTestId('document-editor-publish-feedback-error');
    await expect(errorFeedback).toBeVisible({ timeout: 5000 });
    await expect(statusBadge).toContainText(/Draft/i);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WS-019-publish-failure.png') });

    // VAL-WS-009: Publish button changes document status
    await page.unroute('**/api/workspace/documents/*/publish');
    
    await publishBtn.click();
    await confirmDialog.getByRole('button', { name: /Confirm/i }).click();
    
    const successFeedback = page.getByTestId('document-editor-publish-feedback-success');
    await expect(successFeedback).toBeVisible({ timeout: 5000 });
    await expect(statusBadge).toContainText(/Published/i);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WS-009-publish-success.png') });

    // VAL-WS-010: Publish button disabled
    await expect(publishBtn).toBeDisabled();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'VAL-WS-010-publish-disabled.png') });
  });
});
