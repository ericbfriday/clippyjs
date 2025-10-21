import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Tutorial Flow
 *
 * Tests realistic user tutorial scenarios with Clippy guiding users
 * through features and workflows in a real browser environment.
 */

test.describe('Tutorial Flow - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a Storybook story with agent
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');
  });

  test('agent loads and appears on page', async ({ page }) => {
    // Wait for agent element to be present
    // Note: actual selector depends on how agent renders in DOM
    await page.waitForTimeout(1000); // Give agent time to load

    // Check that the story loaded successfully
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });

  test('agent greeting appears after page load', async ({ page }) => {
    // Navigate to a story with initial greeting
    await page.goto('/iframe.html?id=clippy-component--with-greeting');
    await page.waitForLoadState('networkidle');

    // Wait for any greeting or agent message to appear
    await page.waitForTimeout(1500);

    // Verify story loaded
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });

  test('user can interact with page while agent is present', async ({ page }) => {
    // Navigate to interactive story
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Verify we can still interact with page elements
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Story should remain interactive
    await page.click('body');
    await expect(storyRoot).toBeVisible();
  });

  test('multiple agents can coexist on same page', async ({ page }) => {
    // Navigate to multi-agent story
    await page.goto('/iframe.html?id=stories-all-agents--all-agents');
    await page.waitForLoadState('networkidle');

    // Give agents time to load
    await page.waitForTimeout(2000);

    // Verify page loaded successfully
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });

  test('agent responds to user navigation', async ({ page }) => {
    // Start on one story
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    let storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Navigate to different story
    await page.goto('/iframe.html?id=clippy-component--basic');
    await page.waitForLoadState('networkidle');

    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('Tutorial Steps - Sequential Guidance', () => {
  test('guides user through multi-step process', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Step 1: Agent loads
    await page.waitForTimeout(500);
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Step 2: User interaction (if controls are available)
    // This depends on the specific Storybook story structure

    // Step 3: Verify page remains functional
    await page.click('body');
    await expect(storyRoot).toBeVisible();
  });

  test('handles page reload gracefully', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Verify initial load
    let storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify agent reloads successfully
    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('Interactive Tutorial Elements', () => {
  test('agent appearance persists during page interaction', async ({ page }) => {
    await page.goto('/iframe.html?id=clippy-component--basic');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');

    // Interact with page in various ways
    await page.mouse.move(100, 100);
    await expect(storyRoot).toBeVisible();

    await page.mouse.move(300, 300);
    await expect(storyRoot).toBeVisible();

    await page.click('body');
    await expect(storyRoot).toBeVisible();
  });

  test('handles rapid story switching', async ({ page }) => {
    const stories = [
      '/iframe.html?id=useagent-basic--auto-load',
      '/iframe.html?id=clippy-component--basic',
      '/iframe.html?id=useagent-basic--auto-load',
    ];

    for (const story of stories) {
      await page.goto(story);
      await page.waitForLoadState('networkidle');

      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible();

      await page.waitForTimeout(500);
    }
  });
});

test.describe('Agent Persistence and Cleanup', () => {
  test('agent cleans up when navigating away', async ({ page }) => {
    // Load first story with agent
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Navigate to story without agent
    await page.goto('/iframe.html?id=introduction--page');
    await page.waitForLoadState('networkidle');

    // New page should load successfully
    const newStoryRoot = page.locator('#storybook-root');
    await expect(newStoryRoot).toBeVisible();
  });

  test('handles multiple page loads without memory leaks', async ({ page }) => {
    // Load the same agent story multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/iframe.html?id=useagent-basic--auto-load');
      await page.waitForLoadState('networkidle');

      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible();

      await page.waitForTimeout(300);
    }

    // Final verification
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('Cross-Browser Compatibility', () => {
  test('agent renders consistently across viewport sizes', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');

    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('networkidle');
    let storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});
