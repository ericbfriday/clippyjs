import { test, expect } from '@playwright/test';

/**
 * Minimal Click Tests
 *
 * These tests verify that basic button clicks work in the E2E environment.
 * This helps isolate whether the issue is with the test environment or our components.
 */

test.describe('Click Test - Minimal', () => {
  test('basic button click increments counter', async ({ page }) => {
    await page.goto('/iframe.html?id=debug-clicktest--minimal-click');
    await page.waitForLoadState('networkidle');

    // Verify initial state
    await expect(page.locator('text="Clicks: 0"')).toBeVisible();

    // Click the button
    const button = page.locator('button:has-text("Click Me")');
    await expect(button).toBeVisible();
    await button.click();

    // Verify counter incremented
    await expect(page.locator('text="Clicks: 1"')).toBeVisible({ timeout: 1000 });

    // Click again
    await button.click();
    await expect(page.locator('text="Clicks: 2"')).toBeVisible({ timeout: 1000 });
  });

  test('async button click works', async ({ page }) => {
    await page.goto('/iframe.html?id=debug-clicktest--async-click');
    await page.waitForLoadState('networkidle');

    // Verify initial state
    await expect(page.locator('text="Clicks: 0"')).toBeVisible();
    await expect(page.locator('text="Status: Ready"')).toBeVisible();

    // Click the button
    const button = page.locator('button:has-text("Click Me (Async)")');
    await expect(button).toBeVisible();
    await button.click();

    // Wait for status to change
    await expect(page.locator('text="Status: Complete"')).toBeVisible({ timeout: 2000 });

    // Verify counter incremented
    await expect(page.locator('text="Clicks: 1"')).toBeVisible();
  });

  test('context-wrapped button click works', async ({ page }) => {
    await page.goto('/iframe.html?id=debug-clicktest--context-wrapped-click');
    await page.waitForLoadState('networkidle');

    // Verify initial state
    await expect(page.locator('text="Clicks: 0"')).toBeVisible();
    await expect(page.locator('text="ProactiveBehavior loaded: Yes"')).toBeVisible();

    // Click the button
    const button = page.locator('button:has-text("Click Me (Context Wrapped)")');
    await expect(button).toBeVisible();
    await button.click();

    // Verify counter incremented
    await expect(page.locator('text="Clicks: 1"')).toBeVisible({ timeout: 1000 });

    // Click again
    await button.click();
    await expect(page.locator('text="Clicks: 2"')).toBeVisible({ timeout: 1000 });
  });
});
