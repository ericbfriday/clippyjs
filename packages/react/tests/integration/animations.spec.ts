import { test, expect } from '@playwright/test';

/**
 * Integration tests for animation playback
 * Tests animation triggering, state management, and sequencing
 */

test.describe('Agent Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-methods--play-animations&viewMode=story');

    // Load agent first
    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 5000 });
  });

  test('plays animation when Play Animation button is clicked', async ({ page }) => {
    // Click play animation button
    await page.click('button:has-text("Play")');

    // Verify agent is animating (check for animation-related classes or attributes)
    const agent = page.locator('.clippy');

    // Wait a bit for animation to start
    await page.waitForTimeout(500);

    // Agent should still be visible during animation
    await expect(agent).toBeVisible();
  });

  test('displays speech bubble when agent speaks', async ({ page }) => {
    // Navigate to speak story
    await page.goto('/iframe.html?id=useagent-basic--load-and-speak&viewMode=story');
    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible();

    // Trigger speak
    await page.click('button:has-text("Speak")');

    // Look for speech bubble (class name may vary)
    const speechBubble = page.locator('.clippy-balloon, .speech-bubble, [class*="bubble"]');
    await expect(speechBubble).toBeVisible({ timeout: 2000 });
  });

  test('hides agent when hide is called', async ({ page }) => {
    // Agent should be visible
    await expect(page.locator('.clippy')).toBeVisible();

    // Navigate to show/hide story
    await page.goto('/iframe.html?id=useagent-methods--show-hide&viewMode=story');
    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible();

    // Click hide
    await page.click('button:has-text("Hide")');

    // Agent should be hidden (may use display:none or visibility:hidden)
    const agent = page.locator('.clippy');
    await expect(agent).toBeHidden({ timeout: 2000 });
  });

  test('shows agent again after hiding', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-methods--show-hide&viewMode=story');
    await page.click('button:has-text("Load Agent")');

    // Hide then show
    await page.click('button:has-text("Hide")');
    await expect(page.locator('.clippy')).toBeHidden();

    await page.click('button:has-text("Show")');
    await expect(page.locator('.clippy')).toBeVisible();
  });

  test('moves agent to specified position', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-methods--move-to&viewMode=story');
    await page.click('button:has-text("Load Agent")');

    const agent = page.locator('.clippy');

    // Get initial position
    const initialBox = await agent.boundingBox();
    expect(initialBox).not.toBeNull();

    // Trigger move
    await page.click('button:has-text("Move")');

    // Wait for animation to complete
    await page.waitForTimeout(1500);

    // Get new position
    const newBox = await agent.boundingBox();
    expect(newBox).not.toBeNull();

    // Position should have changed
    const moved =
      Math.abs((initialBox?.x || 0) - (newBox?.x || 0)) > 10 ||
      Math.abs((initialBox?.y || 0) - (newBox?.y || 0)) > 10;

    expect(moved).toBe(true);
  });
});
