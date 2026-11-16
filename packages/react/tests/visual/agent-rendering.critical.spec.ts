import { test, expect, type Page } from '@playwright/test';

/**
 * Visual regression tests for critical agent rendering scenarios
 * These tests capture screenshots and compare against baselines
 *
 * Note: .critical.spec.ts tests run on all browsers in CI
 *
 * Determinism notes:
 * - Agents animate sprite frames via requestAnimationFrame in an endless
 *   idle loop, so pages never reach Playwright's "two consecutive stable
 *   screenshots" state while the sprites are visible. The `.clippy` sprite
 *   regions are therefore masked in screenshots; agent presence, count and
 *   position are asserted separately below.
 * - Balloon text is typed via setTimeout; tests wait for the full text (or
 *   for the balloon to hide) before capturing so content is settled.
 */

test.describe('Visual: Agent Rendering', () => {
  test('clippy renders correctly at idle', async ({ page }) => {
    await page.goto('/iframe.html?id=hooks-useagent-basic--load-and-speak&viewMode=story');

    // Load agent - the story's "Say Hello" button loads the agent and speaks
    await page.click('button:has-text("Say Hello")');
    const agent = page.locator('.clippy');
    await expect(agent).toBeVisible({ timeout: 10000 });

    // Wait for the greeting balloon to finish and hide so the agent is idle
    await expect(page.locator('.clippy-balloon')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.clippy-balloon')).toBeHidden({ timeout: 10000 });

    // Mask the animated sprite; layout/balloon/page chrome are compared
    await expect(page).toHaveScreenshot('clippy-idle.png', {
      mask: [agent],
      maxDiffPixels: 100,
    });
  });

  test('speech bubble renders correctly', async ({ page }) => {
    await page.goto('/iframe.html?id=hooks-useagent-basic--load-and-speak&viewMode=story');

    // Load agent and trigger speak - the "Say Hello" button does both
    await page.click('button:has-text("Say Hello")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

    // Wait for the full greeting text to be typed into the balloon
    await expect(page.locator('.clippy-content')).toContainText('Welcome to ClippyJS', {
      timeout: 10000,
    });

    // Capture during the balloon's hold window (settled text, agent masked)
    await expect(page).toHaveScreenshot('clippy-speaking.png', {
      mask: [page.locator('.clippy')],
      maxDiffPixels: 100,
    });
  });

  test('multiple agents render without overlap', async ({ page }) => {
    await page.goto('/iframe.html?id=components-clippy--multiple-components&viewMode=story');

    // Wait for all agents to load
    const agents = page.locator('.clippy');
    await expect(agents.first()).toBeVisible({ timeout: 10000 });

    // The story renders Clippy, Rover, and Merlin
    await expect(agents).toHaveCount(3);

    // Mask the animated sprites; the layout is what this test validates
    await expect(page).toHaveScreenshot('multiple-agents.png', {
      fullPage: true,
      mask: [agents],
      maxDiffPixels: 100,
    });
  });

  test('agent positioning is consistent across page sizes', async ({ page }) => {
    await page.goto('/iframe.html?id=hooks-useagent-all-methods--move-to&viewMode=story');

    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });

    // The MoveTo story auto-loads and auto-shows the agent
    const agent = page.locator('.clippy');
    await expect(agent).toBeVisible({ timeout: 10000 });

    // Move to specific position via the story's "Center" button
    await page.click('button:has-text("Center")');

    // Wait for the move to finish (the story speaks "Moved to x, y!" when done)
    await expect(page.locator('.clippy-content')).toContainText('Moved to', {
      timeout: 10000,
    });
    await page.waitForTimeout(500);

    // Desktop capture (sprite masked; agent position itself asserted below)
    await expect(page).toHaveScreenshot('agent-positioned-desktop.png', {
      mask: [agent],
      maxDiffPixels: 100,
    });

    // The agent's top-left must have moved to the viewport center (the story
    // moves to (innerWidth/2, innerHeight/2))
    const desktopBox = await agent.boundingBox();
    expect(desktopBox).not.toBeNull();
    expect(Math.abs((desktopBox!.x ?? 0) - 960)).toBeLessThan(50);
    expect(Math.abs((desktopBox!.y ?? 0) - 540)).toBeLessThan(50);

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('agent-positioned-mobile.png', {
      mask: [agent],
      maxDiffPixels: 100,
    });
  });
});
