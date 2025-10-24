import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for critical agent rendering scenarios
 * These tests capture screenshots and compare against baselines
 *
 * Note: .critical.spec.ts tests run on all browsers in CI
 */

test.describe('Visual: Agent Rendering', () => {
  test('clippy renders correctly at idle', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--load-and-speak&viewMode=story');

    // Load agent
    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 5000 });

    // Wait for idle state
    await page.waitForTimeout(1000);

    // Capture screenshot of agent area
    const agent = page.locator('.clippy');
    await expect(agent).toHaveScreenshot('clippy-idle.png', {
      maxDiffPixels: 100, // Allow minor rendering differences
    });
  });

  test('speech bubble renders correctly', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--load-and-speak&viewMode=story');

    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible();

    // Trigger speak
    await page.click('button:has-text("Speak")');

    // Wait for speech bubble
    await page.waitForTimeout(500);

    // Screenshot the agent with speech bubble
    const container = page.locator('body');
    await expect(container).toHaveScreenshot('clippy-speaking.png', {
      maxDiffPixels: 100,
    });
  });

  test('multiple agents render without overlap', async ({ page }) => {
    await page.goto('/iframe.html?id=clippy-component--multiple-components&viewMode=story');

    // Wait for all agents to load
    await page.waitForTimeout(2000);

    // Should have multiple agents visible
    const agents = page.locator('.clippy');
    await expect(agents.first()).toBeVisible();

    // Capture full page screenshot
    await expect(page).toHaveScreenshot('multiple-agents.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });

  test('agent positioning is consistent across page sizes', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-methods--move-to&viewMode=story');

    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible();

    // Move to specific position
    await page.click('button:has-text("Move to Center")');
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot('agent-positioned-desktop.png', {
      maxDiffPixels: 100,
    });

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('agent-positioned-mobile.png', {
      maxDiffPixels: 100,
    });
  });
});
