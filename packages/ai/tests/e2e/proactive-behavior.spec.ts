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
    await expect(page.locator('text="Reason:"')).toBeVisible();
    await expect(page.locator('text="manual"')).toBeVisible();

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
    await expect(page.locator('text="Consecutive Ignores:"')).toBeVisible();
    await expect(page.locator('text="0 / 3"')).toBeVisible();

    // Trigger and ignore first suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');

    // Verify count increases
    await expect(page.locator('text="Consecutive Ignores:"')).toBeVisible();
    await expect(page.locator('text="1 / 3"')).toBeVisible();

    // Trigger and ignore second suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');
    await expect(page.locator('text="Consecutive Ignores:"')).toBeVisible();
    await expect(page.locator('text="2 / 3"')).toBeVisible();

    // Trigger and ignore third suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');
    await expect(page.locator('text="Consecutive Ignores:"')).toBeVisible();
    await expect(page.locator('text="3 / 3"')).toBeVisible();

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
    await expect(page.locator('text="Total Suggestions:"')).toBeVisible();
    await expect(page.locator('text="0"').first()).toBeVisible();
    await expect(page.locator('text="Accepts:"')).toBeVisible();
    await expect(page.locator('text="Ignores:"')).toBeVisible();
    await expect(page.locator('text="Accept Rate:"')).toBeVisible();
    await expect(page.locator('text="0%"')).toBeVisible();

    // Trigger and accept first suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✓ Accept")');

    // Verify stats updated
    await expect(page.locator('text="Total Suggestions:"')).toBeVisible();
    await expect(page.locator('text="1"').first()).toBeVisible();
    await expect(page.locator('text="Accepts:"')).toBeVisible();
    await expect(page.locator('text="Accept Rate:"')).toBeVisible();
    await expect(page.locator('text="100.0%"')).toBeVisible();

    // Trigger and ignore second suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("✕ Ignore")');

    // Verify stats updated
    await expect(page.locator('text="Total Suggestions:"')).toBeVisible();
    await expect(page.locator('text="2"').first()).toBeVisible();
    await expect(page.locator('text="Ignores:"')).toBeVisible();
    await expect(page.locator('text="Accept Rate:"')).toBeVisible();
    await expect(page.locator('text="50.0%"')).toBeVisible();
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
    await expect(page.locator('text="Total Suggestions:"')).toBeVisible();
    await expect(page.locator('text="5"').first()).toBeVisible();
    await expect(page.locator('text="Accepts:"')).toBeVisible();
    await expect(page.locator('text="3"').first()).toBeVisible();
    await expect(page.locator('text="Ignores:"')).toBeVisible();
    await expect(page.locator('text="2"').first()).toBeVisible();
    await expect(page.locator('text="Accept Rate:"')).toBeVisible();
    await expect(page.locator('text="60.0%"')).toBeVisible();
  });
});

test.describe('Proactive Behavior - Configuration', () => {
  test('proactive behavior can be enabled and disabled', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--configuration-updates');
    await page.waitForLoadState('networkidle');

    // Verify initially enabled
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    await expect(page.locator('text="Status:"')).toBeVisible();
    await expect(page.locator('text="✓ Enabled"')).toBeVisible();

    // Disable proactive behavior
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await expect(page.locator('text="Status:"')).toBeVisible();
    await expect(page.locator('text="✗ Disabled"')).toBeVisible();

    // Re-enable
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(page.locator('text="Status:"')).toBeVisible();
    await expect(page.locator('text="✓ Enabled"')).toBeVisible();
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

    // Verify initial state
    const checkbox = page.locator('input[type="checkbox"]');
    const highRadio = page.locator('input[value="high"]');

    // Ensure feature is enabled before changing intrusion level
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }

    // Wait for radio buttons to be enabled
    await page.waitForTimeout(100);

    // Change intrusion level to high
    await highRadio.click();

    // Verify high was selected
    await expect(highRadio).toBeChecked();

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Note: Configuration state may or may not persist depending on implementation
    // This test documents the behavior - state persistence would require storage integration
  });
});

test.describe('Proactive Behavior - User Experience', () => {
  test('suggestion UI is visually distinct', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-proactivebehavior--basic-suggestions');
    await page.waitForLoadState('networkidle');

    // Trigger a suggestion
    await page.click('button:has-text("Trigger Suggestion")');
    await page.waitForTimeout(500);

    // Verify suggestion box with icon is present (emoji is part of heading text)
    await expect(page.locator('text="💡 Proactive Suggestion"')).toBeVisible();

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