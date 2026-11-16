import { test, expect } from '@playwright/test';

/**
 * Integration tests for agent loading functionality
 * Tests real browser behavior with asset loading and DOM manipulation
 */

test.describe('Agent Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the LoadingStates story, which has a "Load Agent" button
    await page.goto('/iframe.html?id=hooks-useagent-basic--loading-states&viewMode=story');
  });

  test('loads agent when Load Agent button is clicked', async ({ page }) => {
    // Click the load button
    await page.click('button:has-text("Load Agent")');

    // Wait for agent to appear in DOM (agent asset loading is async)
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

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

    // The story disables the button while the agent is loading
    // (its label changes to "Loading...")
    await expect(loadButton).toBeDisabled();
  });

  test('handles multiple agent loads gracefully', async ({ page }) => {
    // Load agent
    await page.click('button:has-text("Load Agent")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

    // Try loading again - should not create duplicate agents
    await page.click('button:has-text("Load Agent")');

    // Verify only one agent exists
    const agents = page.locator('.clippy');
    await expect(agents).toHaveCount(1);
  });

  test('loads different agents when switching', async ({ page }) => {
    // The AgentSelector story renders a <select> of agent names plus a
    // "Load {agentName}" button
    await page.goto('/iframe.html?id=hooks-useagent-basic--agent-selector&viewMode=story');

    // Select Clippy and load it
    await page.selectOption('select', 'Clippy');
    await page.click('button:has-text("Load Clippy")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

    // Switch to Merlin - the story unloads the current agent
    await page.selectOption('select', 'Merlin');

    // Load Merlin
    await page.click('button:has-text("Load Merlin")');
    await expect(page.locator('.clippy')).toBeVisible({ timeout: 10000 });

    // Should have Merlin loaded - the story speaks "Hello! I'm Merlin!".
    // Wait for the balloon itself first: the previous agent's balloon is torn
    // down on switch and the new one only exists once speak() starts.
    await expect(page.locator('.clippy-balloon').last()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.clippy-content').last()).toContainText('Merlin', { timeout: 10000 });
  });
});
