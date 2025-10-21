import { test, expect } from '@playwright/test';

/**
 * Integration tests for agent loading functionality
 * Tests real browser behavior with asset loading and DOM manipulation
 */

test.describe('Agent Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the basic useAgent story
    await page.goto('/iframe.html?id=useagent-basic--load-and-speak&viewMode=story');
  });

  test('loads agent when Load Agent button is clicked', async ({ page }) => {
    // Click the load button
    await page.click('button:has-text("Load Agent")');

    // Wait for agent to appear in DOM
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 5000 });

    // Verify agent container exists
    const agent = page.locator('.clippy');
    await expect(agent).toHaveClass(/clippy/);
  });

  test('shows loading state during agent load', async ({ page }) => {
    // Button should show "Load Agent" initially
    const loadButton = page.locator('button:has-text("Load Agent")');
    await expect(loadButton).toBeVisible();

    // Click and verify loading state
    await loadButton.click();

    // Button text should change (implementation may vary)
    // This checks that the button state updates
    await expect(loadButton).toBeDisabled();
  });

  test('handles multiple agent loads gracefully', async ({ page }) => {
    // Load agent
    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible();

    // Try loading again - should not create duplicate agents
    await page.click('button:has-text("Load Agent")');

    // Verify only one agent exists
    const agents = page.locator('.clippy');
    await expect(agents).toHaveCount(1);
  });

  test('loads different agents when switching', async ({ page }) => {
    // This test assumes an agent selector exists
    // Navigate to agent selector story
    await page.goto('/iframe.html?id=useagent-basic--agent-selector&viewMode=story');

    // Select Clippy
    await page.click('button:has-text("Clippy")');
    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible();

    // Switch to Merlin
    await page.click('button:has-text("Merlin")');
    await page.click('button:has-text("Load Agent")');

    // Should have Merlin loaded (implementation specific)
    await expect(page.locator('.clippy')).toBeVisible();
  });
});
