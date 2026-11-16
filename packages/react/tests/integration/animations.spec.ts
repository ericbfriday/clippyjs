import { test, expect } from '@playwright/test';

/**
 * Integration tests for animation playback
 * Tests animation triggering, state management, and sequencing
 */

test.describe('Agent Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=hooks-useagent-all-methods--play-animations&viewMode=story');

    // The PlayAnimations story auto-loads and auto-shows the agent on mount;
    // asset loading is async, so wait generously for it to appear
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });
  });

  test('plays animation when Play Animation button is clicked', async ({ page }) => {
    // The story renders one button per animation name; click "Wave"
    await page.click('button:has-text("Wave")');

    // Verify agent is animating (check for animation-related classes or attributes)
    const agent = page.locator('.clippy');

    // Wait a bit for animation to start
    await page.waitForTimeout(500);

    // Agent should still be visible during animation
    await expect(agent).toBeVisible();
  });

  test('displays speech bubble when agent speaks', async ({ page }) => {
    // Navigate to the LoadAndSpeak story, whose "Say Hello" button loads
    // the agent and speaks the greeting
    await page.goto('/iframe.html?id=hooks-useagent-basic--load-and-speak&viewMode=story');
    await page.click('button:has-text("Say Hello")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

    // The story speaks "Hello! Welcome to ClippyJS!" - wait for the balloon
    const speechBubble = page.locator('.clippy-balloon');
    await expect(speechBubble).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.clippy-content')).toContainText('Welcome to ClippyJS', {
      timeout: 5000,
    });
  });

  test('hides agent when hide is called', async ({ page }) => {
    // Navigate to the ShowAndHide story (auto-loads the agent, hidden until shown)
    await page.goto('/iframe.html?id=hooks-useagent-all-methods--show-and-hide&viewMode=story');

    // Show the agent first (Playwright waits for the button to be enabled
    // once the agent has loaded)
    await page.click('button:has-text("Show")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

    // Click hide
    await page.click('button:has-text("Hide")');

    // Agent should be hidden (display:none after the Hide animation)
    const agent = page.locator('.clippy');
    await expect(agent).toBeHidden({ timeout: 5000 });
  });

  test('shows agent again after hiding', async ({ page }) => {
    await page.goto('/iframe.html?id=hooks-useagent-all-methods--show-and-hide&viewMode=story');

    // The agent auto-loads hidden; show it, hide it, then show it again
    await page.click('button:has-text("Show")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Hide")');
    await expect(page.locator('.clippy')).toBeHidden({ timeout: 5000 });

    await page.click('button:has-text("Show")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 5000 });
  });

  test('moves agent to specified position', async ({ page }) => {
    await page.goto('/iframe.html?id=hooks-useagent-all-methods--move-to&viewMode=story');

    // The MoveTo story auto-loads and auto-shows the agent
    const agent = page.locator('.clippy');
    await expect(agent).toBeVisible({ timeout: 10000 });

    // Get initial position
    const initialBox = await agent.boundingBox();
    expect(initialBox).not.toBeNull();

    // Trigger move via the story's "Top Left" button (moves to 100,100 over 1s)
    await page.click('button:has-text("Top Left")');

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
