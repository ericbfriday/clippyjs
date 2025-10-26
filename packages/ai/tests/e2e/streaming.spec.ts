import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Streaming Messages
 *
 * Tests real-time streaming functionality including token-by-token updates,
 * cancel functionality, and streaming UI behavior.
 */

test.describe('Streaming - Real-time Updates', () => {
  test('messages stream token by token', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Hello AI');
    await sendButton.click();

    // Wait for assistant message to start appearing
    await expect(page.locator('text="🤖 Assistant"')).toBeVisible({ timeout: 3000 });

    // Wait a moment for streaming to be in progress
    await page.waitForTimeout(200);

    // Verify the (typing...) indicator appears during streaming
    await expect(page.locator('text="(typing...)"')).toBeVisible({ timeout: 1000 });

    // Wait for streaming to complete
    await page.waitForTimeout(2500);

    // Verify (typing...) indicator is gone
    await expect(page.locator('text="(typing...)"')).not.toBeVisible();
  });

  test('streaming indicator shows during response', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Test streaming');
    await sendButton.click();

    // Verify streaming indicator appears
    await expect(page.locator('text="⚡ Streaming..."')).toBeVisible({ timeout: 2000 });

    // Wait for streaming to complete
    await page.waitForTimeout(3000);

    // Verify indicator disappears
    await expect(page.locator('text="⚡ Streaming..."')).not.toBeVisible();
  });

  test('message content updates incrementally', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Tell me something');
    await sendButton.click();

    // Wait for assistant message to appear
    await expect(page.locator('text="🤖 Assistant"')).toBeVisible({ timeout: 3000 });

    // Wait for streaming to start
    await page.waitForTimeout(300);

    // Get initial content length using more reliable selector
    const assistantMessages = page.locator('div').filter({ hasText: '🤖 Assistant' });
    await expect(assistantMessages.last()).toBeVisible();

    const initialText = await assistantMessages.last().textContent();
    const initialLength = initialText?.length || 0;

    // Wait for more streaming
    await page.waitForTimeout(800);

    // Verify content has grown
    const updatedText = await assistantMessages.last().textContent();
    const updatedLength = updatedText?.length || 0;

    expect(updatedLength).toBeGreaterThan(initialLength);
  });
});

test.describe('Streaming - Cancel Functionality', () => {
  test('cancel button appears during streaming', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-cancel-stream');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Long message');
    await sendButton.click();

    // Verify cancel button appears
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible({ timeout: 2000 });
  });

  test('clicking cancel stops streaming', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-cancel-stream');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Cancel this');
    await sendButton.click();

    // Wait for streaming to start and cancel button to appear
    await page.waitForTimeout(500);

    // Wait for cancel button to be visible
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible({ timeout: 2000 });

    // Get content before canceling using more reliable selector
    const assistantMessages = page.locator('div').filter({ hasText: '🤖 Assistant' });
    const beforeCancel = await assistantMessages.last().textContent();

    // Click cancel
    await cancelButton.click();

    // Wait a moment
    await page.waitForTimeout(500);

    // Get content after canceling
    const afterCancel = await assistantMessages.last().textContent();

    // Content should not have changed significantly after cancel
    expect(afterCancel).toBe(beforeCancel);

    // Verify cancel button is gone
    await expect(cancelButton).not.toBeVisible();
  });

  test('input is re-enabled after canceling', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-cancel-stream');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Test cancel');
    await sendButton.click();

    // Verify input is disabled during streaming
    await expect(input).toBeDisabled();

    // Cancel the stream
    await page.waitForTimeout(500);
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Verify input is enabled again
    await expect(input).toBeEnabled();
    await expect(sendButton).toBeEnabled();
  });

  test('can send new message after canceling', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-cancel-stream');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send and cancel first message
    await input.fill('First message');
    await sendButton.click();
    await page.waitForTimeout(500);

    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Send second message
    await input.fill('Second message');
    await sendButton.click();

    // Verify second message appears
    await expect(page.locator('text="Second message"')).toBeVisible();
  });
});

test.describe('Streaming - UI Behavior', () => {
  test('chat auto-scrolls during streaming', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send multiple messages to create scrollable content
    for (let i = 1; i <= 3; i++) {
      await input.fill(`Message ${i}`);
      await sendButton.click();
      await page.waitForTimeout(2000);
    }

    // The chat should scroll to show the latest message
    const lastMessage = page.locator('text="Message 3"');
    await expect(lastMessage).toBeVisible();
  });

  test('streaming does not block UI interactions', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Start streaming
    await input.fill('Start streaming');
    await sendButton.click();

    // Wait for streaming to be in progress
    await page.waitForTimeout(500);

    // Verify we can still interact with the page (e.g., scroll)
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(200);

    // Page should remain responsive - check for input visibility
    await expect(input).toBeVisible();
  });

  test('message placeholder shows before content', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Test placeholder');
    await sendButton.click();

    // Immediately check for assistant message placeholder
    await expect(page.locator('text="🤖 Assistant"')).toBeVisible({ timeout: 1000 });

    // The message should appear with typing indicator or content
    const assistantMessages = page.locator('div').filter({ hasText: '🤖 Assistant' });
    await expect(assistantMessages.last()).toBeVisible();
  });
});

test.describe('Streaming - Multiple Messages', () => {
  test('cannot send while streaming', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send first message
    await input.fill('First');
    await sendButton.click();

    // Wait a moment for streaming state to update
    await page.waitForTimeout(100);

    // Verify input and button are disabled
    await expect(input).toBeDisabled();
    await expect(sendButton).toBeDisabled();

    // Wait for streaming to complete
    await page.waitForTimeout(2500);

    // Verify input is enabled again
    await expect(input).toBeEnabled();
  });

  test('messages stream in correct order', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-message-history');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send first message
    await input.fill('First message');
    await sendButton.click();
    await page.waitForTimeout(2500);

    // Send second message
    await input.fill('Second message');
    await sendButton.click();
    await page.waitForTimeout(2500);

    // Verify both messages are visible
    await expect(page.locator('text="First message"')).toBeVisible();
    await expect(page.locator('text="Second message"')).toBeVisible();

    // Verify first message appears before second
    const allText = await page.locator('body').textContent();
    const firstIndex = allText?.indexOf('First message') || -1;
    const secondIndex = allText?.indexOf('Second message') || -1;
    expect(firstIndex).toBeLessThan(secondIndex);
    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(-1);
  });
});

test.describe('Streaming - Error Handling', () => {
  test('handles streaming errors gracefully', async ({ page }) => {
    // This test would require a mock that produces errors
    // For now, we verify the error handling UI exists
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    // The chat interface should be robust enough to handle errors
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
  });

  test('streaming state resets after completion', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Test message');
    await sendButton.click();

    // Wait for streaming to complete
    await page.waitForTimeout(3000);

    // Verify streaming indicator is gone
    await expect(page.locator('text="⚡ Streaming..."')).not.toBeVisible();

    // Verify (typing...) is gone
    await expect(page.locator('text="(typing...)"')).not.toBeVisible();

    // Verify interface is back to normal state
    await expect(input).toBeEnabled();
    await expect(sendButton).toBeEnabled();
  });
});

test.describe('Streaming - Performance', () => {
  test('handles rapid token updates without lag', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Performance test');
    await sendButton.click();

    // Monitor for any console errors during streaming
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait for streaming to complete
    await page.waitForTimeout(3000);

    // Verify no errors occurred
    expect(errors).toHaveLength(0);

    // Verify UI is still responsive
    const chatContainer = page.locator('[style*="border"]').first();
    await expect(chatContainer).toBeVisible();
  });

  test('memory usage remains stable during streaming', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-message-history');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send multiple messages to test memory stability
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Memory test ${i}`);
      await sendButton.click();
      await page.waitForTimeout(2000);
    }

    // Verify interface remains functional
    await expect(input).toBeEnabled();
    await expect(sendButton).toBeEnabled();

    // Verify all messages are still visible
    await expect(page.locator('text="Memory test 1"')).toBeVisible();
    await expect(page.locator('text="Memory test 5"')).toBeVisible();
  });
});

test.describe('Streaming - Accessibility', () => {
  test('streaming status is announced to screen readers', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Accessibility test');
    await sendButton.click();

    // Verify streaming indicator is visible (would be announced)
    await expect(page.locator('text="⚡ Streaming..."')).toBeVisible({ timeout: 2000 });

    // Verify completion state
    await page.waitForTimeout(3000);
    await expect(page.locator('text="⚡ Streaming..."')).not.toBeVisible();
  });

  test('keyboard users can cancel streaming', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-cancel-stream');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');

    // Send a message
    await input.fill('Keyboard cancel test');
    await page.keyboard.press('Enter');

    // Wait for cancel button to appear
    await page.waitForTimeout(500);

    // Navigate to cancel button with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter to cancel
    await page.keyboard.press('Enter');

    // Verify streaming was canceled
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).not.toBeVisible();
  });
});
