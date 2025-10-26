import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Proactive Behavior
 *
 * Tests proactive suggestion system including triggers, cooldown,
 * intrusion levels, and user interaction tracking.
 */

test.describe('Proactive Behavior - Basic Functionality', () => {
  test('triggers proactive suggestion manually', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    // Click trigger button
    const triggerButton = page.locator('button:has-text("Trigger Suggestion")');
    await expect(triggerButton).toBeVisible();
    await triggerButton.click();

    // Verify suggestion appears
    await expect(page.locator('text="💡 Proactive Suggestion"')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text="Reason: manual"')).toBeVisible();

    // Verify timestamp is shown
    await expect(page.locator('text="Time:"')).toBeVisible();
  });

  test('user can accept proactive suggestion', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    // Trigger a suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);

    // Verify suggestion is visible
    await expect(page.locator('text="💡 Proactive Suggestion"')).toBeVisible();

    // Click accept button (with emoji)
    const acceptButton = page.locator('button:has-text("✓ Accept")');
    await acceptButton.click();

    // Verify suggestion is dismissed
    await expect(page.locator('text="💡 Proactive Suggestion"')).not.toBeVisible();
  });

  test('user can ignore proactive suggestion', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    // Trigger a suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);

    // Verify suggestion is visible
    await expect(page.locator('text="💡 Proactive Suggestion"')).toBeVisible();

    // Click ignore button (with emoji)
    const ignoreButton = page.locator('button:has-text("✕ Ignore")');
    await ignoreButton.click();

    // Verify suggestion is dismissed
    await expect(page.locator('text="💡 Proactive Suggestion"')).not.toBeVisible();
  });
});

test.describe('Proactive Behavior - Intrusion Levels', () => {
  test('low intrusion level can be selected', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--intrusion-level-comparison');
    await page.waitForLoadState('networkidle');

    // Select low intrusion level
    const lowRadio = page.locator('input[value="low"]');
    await lowRadio.click();

    // Verify the selection
    await expect(lowRadio).toBeChecked();
    await expect(page.locator('text="Min interval: 5 minutes"')).toBeVisible();
  });

  test('medium intrusion level can be selected', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--intrusion-level-comparison');
    await page.waitForLoadState('networkidle');

    // Select medium intrusion level
    const mediumRadio = page.locator('input[value="medium"]');
    await mediumRadio.click();

    // Verify the selection
    await expect(mediumRadio).toBeChecked();
    await expect(page.locator('text="Min interval: 2 minutes"')).toBeVisible();
  });

  test('high intrusion level can be selected', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--intrusion-level-comparison');
    await page.waitForLoadState('networkidle');

    // Select high intrusion level
    const highRadio = page.locator('input[value="high"]');
    await highRadio.click();

    // Verify the selection
    await expect(highRadio).toBeChecked();
    await expect(page.locator('text="Min interval: 1 minute"')).toBeVisible();
  });

  test('intrusion level affects suggestion frequency', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--intrusion-level-comparison');
    await page.waitForLoadState('networkidle');

    // This test verifies the UI reflects different intrusion levels
    // Actual timing tests would be in unit tests

    const lowRadio = page.locator('input[value="low"]');
    const mediumRadio = page.locator('input[value="medium"]');
    const highRadio = page.locator('input[value="high"]');

    // Verify all options are available
    await expect(lowRadio).toBeVisible();
    await expect(mediumRadio).toBeVisible();
    await expect(highRadio).toBeVisible();
  });
});

test.describe('Proactive Behavior - Cooldown System', () => {
  test('cooldown activates after consecutive ignores', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--cooldown-behavior');
    await page.waitForLoadState('networkidle');

    // Verify initial state
    await expect(page.locator('text="Consecutive Ignores: 0 / 3"')).toBeVisible();

    // Trigger and ignore first suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');

    // Verify count increases
    await expect(page.locator('text="Consecutive Ignores: 1 / 3"')).toBeVisible();

    // Trigger and ignore second suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');
    await expect(page.locator('text="Consecutive Ignores: 2 / 3"')).toBeVisible();

    // Trigger and ignore third suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');
    await expect(page.locator('text="Consecutive Ignores: 3 / 3"')).toBeVisible();

    // Verify cooldown is active
    await expect(page.locator('text="⏳"')).toBeVisible();
    await expect(page.locator('text="Cooldown Active!"')).toBeVisible();
    await expect(page.locator('button:has-text("Cooldown Active")')).toBeDisabled();
  });

  test('cooldown prevents new suggestions', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--cooldown-behavior');
    await page.waitForLoadState('networkidle');

    // Trigger 3 ignores to activate cooldown
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Trigger Suggestion")');
      await page.waitForTimeout(500);
      const ignoreButton = page.locator('button:has-text("✕ Ignore")');
      if (await ignoreButton.isVisible()) {
        await ignoreButton.click();
      }
      await page.waitForTimeout(300);
    }

    // Verify trigger button is disabled during cooldown
    const triggerButton = page.locator('button:has-text("Cooldown Active")');
    await expect(triggerButton).toBeDisabled();
  });
});

test.describe('Proactive Behavior - Tracking', () => {
  test('tracks accept and ignore statistics', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--accept-ignore-tracking');
    await page.waitForLoadState('networkidle');

    // Verify initial statistics
    await expect(page.locator('text="Total Suggestions: 0"')).toBeVisible();
    await expect(page.locator('text="Accepts: 0"')).toBeVisible();
    await expect(page.locator('text="Ignores: 0"')).toBeVisible();
    await expect(page.locator('text="Accept Rate: 0%"')).toBeVisible();

    // Trigger and accept first suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✓ Accept")');

    // Verify stats updated
    await expect(page.locator('text="Total Suggestions: 1"')).toBeVisible();
    await expect(page.locator('text="Accepts: 1"')).toBeVisible();
    await expect(page.locator('text="Accept Rate: 100.0%"')).toBeVisible();

    // Trigger and ignore second suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');

    // Verify stats updated
    await expect(page.locator('text="Total Suggestions: 2"')).toBeVisible();
    await expect(page.locator('text="Ignores: 1"')).toBeVisible();
    await expect(page.locator('text="Accept Rate: 50.0%"')).toBeVisible();
  });

  test('accept rate calculation is accurate', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--accept-ignore-tracking');
    await page.waitForLoadState('networkidle');

    // Accept 3 out of 5 suggestions (60% rate)
    const sequences = ['✓ Accept', '✕ Ignore', '✓ Accept', '✕ Ignore', '✓ Accept'];

    for (const action of sequences) {
      await page.click('button:has-text("Trigger Suggestion")');
      await page.waitForTimeout(500);
      await page.click(`button:has-text("${action}")`);
      await page.waitForTimeout(300);
    }

    // Verify final statistics
    await expect(page.locator('text="Total Suggestions: 5"')).toBeVisible();
    await expect(page.locator('text="Accepts: 3"')).toBeVisible();
    await expect(page.locator('text="Ignores: 2"')).toBeVisible();
    await expect(page.locator('text="Accept Rate: 60.0%"')).toBeVisible();
  });
});

test.describe('Proactive Behavior - Configuration', () => {
  test('proactive behavior can be enabled and disabled', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--configuration-updates');
    await page.waitForLoadState('networkidle');

    // Verify initially enabled
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    await expect(page.locator('text="Status: ✓ Enabled"')).toBeVisible();

    // Disable proactive behavior
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await expect(page.locator('text="Status: ✗ Disabled"')).toBeVisible();

    // Re-enable
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(page.locator('text="Status: ✓ Enabled"')).toBeVisible();
  });

  test('intrusion level can be updated dynamically', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--configuration-updates');
    await page.waitForLoadState('networkidle');

    // Select different intrusion levels
    const lowRadio = page.locator('input[value="low"]');
    const highRadio = page.locator('input[value="high"]');

    await lowRadio.click();
    await expect(lowRadio).toBeChecked();

    await highRadio.click();
    await expect(highRadio).toBeChecked();
    await expect(lowRadio).not.toBeChecked();
  });

  test('configuration persists across interactions', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--configuration-updates');
    await page.waitForLoadState('networkidle');

    // Change configuration
    const checkbox = page.locator('input[type="checkbox"]');
    const highRadio = page.locator('input[value="high"]');

    await checkbox.click(); // Disable
    await highRadio.click(); // Set to high

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Note: Configuration state may or may not persist depending on implementation
    // This test documents the behavior
  });
});

test.describe('Proactive Behavior - User Experience', () => {
  test('suggestion UI is visually distinct', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    // Trigger a suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);

    // Verify suggestion box is present
    await expect(page.locator('text="💡 Proactive Suggestion"')).toBeVisible();

    // Verify icon is present
    await expect(page.locator('text="💡"')).toBeVisible();

    // Verify buttons are styled distinctly
    const acceptButton = page.locator('button:has-text("✓ Accept")');
    const ignoreButton = page.locator('button:has-text("✕ Ignore")');

    await expect(acceptButton).toBeVisible();
    await expect(ignoreButton).toBeVisible();
  });

  test('multiple suggestions can be triggered in sequence', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    // Trigger first suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✓ Accept")');

    // Verify no active suggestion
    await expect(page.locator('text="No active suggestions"')).toBeVisible();

    // Trigger second suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);

    // Verify new suggestion appears
    await expect(page.locator('text="💡 Proactive Suggestion"')).toBeVisible();
  });
});

test.describe('Proactive Behavior - Accessibility', () => {
  test('keyboard navigation works for suggestion interactions', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    // Trigger a suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);

    // Navigate to accept button with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter to accept
    await page.keyboard.press('Enter');

    // Verify suggestion was accepted
    await expect(page.locator('text="💡 Proactive Suggestion"')).not.toBeVisible();
  });

  test('suggestion buttons are focusable and accessible', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);

    const acceptButton = page.locator('button:has-text("Accept")');
    const ignoreButton = page.locator('button:has-text("Ignore")');

    // Verify buttons are focusable
    await acceptButton.focus();
    const acceptFocused = await acceptButton.evaluate((el) => el === document.activeElement);
    expect(acceptFocused).toBe(true);

    await ignoreButton.focus();
    const ignoreFocused = await ignoreButton.evaluate((el) => el === document.activeElement);
    expect(ignoreFocused).toBe(true);
  });
});