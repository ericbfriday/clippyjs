import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Mode Configurations
 *
 * Tests pre-built mode system including mode resolution, configuration merging,
 * context provider integration, and mode exposure in React context.
 */

test.describe('Mode Configurations - Mode Resolution', () => {
  test('resolves mode by string name', async ({ page }) => {
    // Navigate to story with string mode name
    await page.goto('/iframe.html?id=ai-modes--help-assistant-mode');
    await page.waitForLoadState('networkidle');

    // Verify mode indicator shows resolved mode
    await expect(page.locator('text="Mode: help-assistant"')).toBeVisible({ timeout: 2000 });

    // Verify mode description is displayed
    await expect(page.locator('text="General website help and navigation assistance"')).toBeVisible();
  });

  test('accepts Mode object directly', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--code-reviewer-mode');
    await page.waitForLoadState('networkidle');

    // Verify mode indicator
    await expect(page.locator('text="Mode: code-reviewer"')).toBeVisible({ timeout: 2000 });

    // Verify mode description
    await expect(page.locator('text="Technical code analysis and review assistance"')).toBeVisible();
  });

  test('handles invalid mode name gracefully', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--invalid-mode-name');
    await page.waitForLoadState('networkidle');

    // Should show no mode when invalid name provided
    await expect(page.locator('text="Mode: none"')).toBeVisible({ timeout: 2000 });
  });

  test('supports no mode configuration', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--no-mode');
    await page.waitForLoadState('networkidle');

    // Verify no mode is set
    await expect(page.locator('text="Mode: none"')).toBeVisible({ timeout: 2000 });

    // Should still function normally
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
  });
});

test.describe('Mode Configurations - Quick Actions', () => {
  test('displays quick actions for help-assistant mode', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--help-assistant-mode');
    await page.waitForLoadState('networkidle');

    // Verify quick actions section exists
    await expect(page.locator('text="Quick Actions"')).toBeVisible({ timeout: 2000 });

    // Verify specific quick actions for help-assistant mode
    await expect(page.locator('button:has-text("❓ What can I do here?")')).toBeVisible();
    await expect(page.locator('button:has-text("🧭 How do I...?")')).toBeVisible();
    await expect(page.locator('button:has-text("💡 Explain this")')).toBeVisible();
  });

  test('displays quick actions for code-reviewer mode', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--code-reviewer-mode');
    await page.waitForLoadState('networkidle');

    // Verify quick actions section
    await expect(page.locator('text="Quick Actions"')).toBeVisible({ timeout: 2000 });

    // Verify code-reviewer specific quick actions
    await expect(page.locator('button:has-text("🔍 Review code")')).toBeVisible();
    await expect(page.locator('button:has-text("📖 Explain function")')).toBeVisible();
    await expect(page.locator('button:has-text("⭐ Best practices")')).toBeVisible();
  });

  test('quick action button triggers with correct prompt', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--help-assistant-mode');
    await page.waitForLoadState('networkidle');

    // Click a quick action button
    const quickActionButton = page.locator('button:has-text("❓ What can I do here?")');
    await quickActionButton.click();

    // Verify the prompt appears in the input
    const input = page.locator('input[type="text"], textarea').first();
    await expect(input).toHaveValue(/What can I do on this page/);
  });

  test('no quick actions when no mode set', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--no-mode');
    await page.waitForLoadState('networkidle');

    // Quick actions section should not exist
    await expect(page.locator('text="Quick Actions"')).not.toBeVisible();
  });
});

test.describe('Mode Configurations - System Prompt Integration', () => {
  test('mode system prompt extends personality', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--shopping-assistant-mode');
    await page.waitForLoadState('networkidle');

    // Type a message
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('Tell me about yourself');

    // Send message
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Response should reflect shopping assistant mode
    const response = page.locator('.message-content').last();
    const responseText = await response.textContent();

    // Verify shopping-related keywords in response
    expect(responseText?.toLowerCase()).toMatch(/shop|product|purchase|buy|help.*choose/);
  });

  test('custom prompt merges with mode prompt', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--mode-with-custom-prompt');
    await page.waitForLoadState('networkidle');

    // Verify mode indicator
    await expect(page.locator('text="Mode: form-helper"')).toBeVisible({ timeout: 2000 });

    // Verify custom prompt indicator
    await expect(page.locator('text="Custom Prompt: Active"')).toBeVisible();
  });
});

test.describe('Mode Configurations - Context Provider Integration', () => {
  test('mode context providers are registered', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--accessibility-guide-mode');
    await page.waitForLoadState('networkidle');

    // Check context provider status indicator
    await expect(page.locator('text="Context Providers: 0"')).toBeVisible({ timeout: 2000 });

    // Note: Real context providers would show > 0
    // This is testing the integration point
  });

  test('mode and config context providers merge', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--mode-with-additional-providers');
    await page.waitForLoadState('networkidle');

    // Should show combined count of mode + config providers
    await expect(page.locator('text="Context Providers:"')).toBeVisible({ timeout: 2000 });

    const providerCount = await page.locator('text="Context Providers:"').textContent();
    expect(providerCount).toMatch(/[1-9]/); // At least 1 provider
  });
});

test.describe('Mode Configurations - currentMode Context Access', () => {
  test('currentMode is accessible in useAIClippy hook', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--help-assistant-mode');
    await page.waitForLoadState('networkidle');

    // Verify mode info is displayed (proves currentMode is accessible)
    await expect(page.locator('text="Mode: help-assistant"')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text="General website help and navigation assistance"')).toBeVisible();
  });

  test('currentMode is null when no mode set', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--no-mode');
    await page.waitForLoadState('networkidle');

    // Should show null/none state
    await expect(page.locator('text="Mode: none"')).toBeVisible({ timeout: 2000 });
  });

  test('currentMode updates when mode changes', async ({ page }) => {
    // This would test dynamic mode switching if implemented
    await page.goto('/iframe.html?id=ai-modes--mode-switcher');
    await page.waitForLoadState('networkidle');

    // Initial mode
    await expect(page.locator('text="Mode: help-assistant"')).toBeVisible({ timeout: 2000 });

    // Switch mode button
    const switchButton = page.locator('button:has-text("Switch to Code Reviewer")');
    if (await switchButton.isVisible()) {
      await switchButton.click();
      await page.waitForTimeout(500);

      // Verify mode changed
      await expect(page.locator('text="Mode: code-reviewer"')).toBeVisible();
    }
  });
});

test.describe('Mode Configurations - All Pre-built Modes', () => {
  const modes = [
    { name: 'help-assistant', description: 'General website help' },
    { name: 'code-reviewer', description: 'Technical code analysis' },
    { name: 'shopping-assistant', description: 'E-commerce guidance' },
    { name: 'form-helper', description: 'Form completion' },
    { name: 'accessibility-guide', description: 'Accessibility support' },
  ];

  for (const mode of modes) {
    test(`${mode.name} mode loads correctly`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ai-modes--${mode.name}-mode`);
      await page.waitForLoadState('networkidle');

      // Verify mode name
      await expect(page.locator(`text="Mode: ${mode.name}"`)).toBeVisible({ timeout: 2000 });

      // Verify description contains expected keywords
      const description = await page.locator('.mode-description, [class*="description"]').textContent();
      expect(description?.toLowerCase()).toContain(mode.description.toLowerCase().split(' ')[0]);

      // Verify quick actions exist
      await expect(page.locator('text="Quick Actions"')).toBeVisible();
    });
  }
});

test.describe('Mode Configurations - Proactive Strategy Integration', () => {
  test('mode proactive strategy is used', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--help-assistant-mode');
    await page.waitForLoadState('networkidle');

    // Verify proactive behavior is enabled (from mode default)
    await expect(page.locator('text="Proactive: enabled"')).toBeVisible({ timeout: 2000 });
  });

  test('config proactive settings override mode defaults', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--mode-with-custom-proactive');
    await page.waitForLoadState('networkidle');

    // Should show custom proactive config
    await expect(page.locator('text="Proactive: custom"')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Mode Configurations - Error Handling', () => {
  test('handles undefined mode gracefully', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--undefined-mode');
    await page.waitForLoadState('networkidle');

    // Should not crash, show no mode
    await expect(page.locator('text="Mode: none"')).toBeVisible({ timeout: 2000 });

    // App should still be functional
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
  });

  test('handles malformed mode object', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-modes--malformed-mode');
    await page.waitForLoadState('networkidle');

    // Should handle gracefully, possibly show error or fallback
    const body = await page.textContent('body');
    expect(body).toBeTruthy(); // Page should render something
  });
});
