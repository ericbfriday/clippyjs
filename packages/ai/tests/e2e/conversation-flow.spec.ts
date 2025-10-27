import { test, expect } from '@playwright/test';

/**
 * E2E Tests: AI Conversation Flow
 *
 * Tests complete conversation flows including message sending,
 * streaming responses, and conversation history management.
 */

test.describe('AI Conversation Flow', () => {
  test('user sends message and receives streaming response', async ({ page }) => {
    // Navigate to the basic chat story
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    // Verify chat interface is visible
    const chatContainer = page.locator('div').filter({ hasText: 'Start a conversation!' }).first();
    await expect(chatContainer).toBeVisible();

    // Type a message
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await input.fill('Hello, AI!');

    // Send the message
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Verify user message appears
    await expect(page.locator('text="👤 You"')).toBeVisible();
    await expect(page.locator('text="Hello, AI!"')).toBeVisible();

    // Wait for assistant response to appear
    await expect(page.locator('text="🤖 Assistant"')).toBeVisible({ timeout: 5000 });

    // Verify assistant message contains content (wait for streaming to complete)
    await page.waitForTimeout(3000); // Increased wait for streaming
    const assistantMessages = page.locator('div').filter({ hasText: '🤖 Assistant' });
    const assistantText = await assistantMessages.last().textContent();
    expect(assistantText).toBeTruthy();
    expect(assistantText!.length).toBeGreaterThan(10);
  });

  test('maintains conversation history across multiple messages', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-message-history');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send first message
    await input.fill('First message');
    await sendButton.click();

    // Wait for streaming to complete
    await page.waitForTimeout(2500);

    // Send second message
    await input.fill('Second message');
    await sendButton.click();

    // Wait for streaming to complete
    await page.waitForTimeout(2500);

    // Verify both messages are in history
    await expect(page.locator('text="First message"')).toBeVisible();
    await expect(page.locator('text="Second message"')).toBeVisible();

    // Verify we have multiple messages (at least both user messages visible)
    const userMessages = page.locator('text="👤 You"');
    const count = await userMessages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('handles empty input gracefully', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send button should be disabled with empty input
    await expect(sendButton).toBeDisabled();

    // Type and then clear
    await input.fill('Test');
    await input.clear();

    // Send button should be disabled again
    await expect(sendButton).toBeDisabled();
  });

  test('disables input during streaming', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--streaming-visualization');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Test message');
    await sendButton.click();

    // Wait a moment for streaming state to update
    await page.waitForTimeout(100);

    // Input and send button should be disabled during streaming
    await expect(input).toBeDisabled();
    await expect(sendButton).toBeDisabled();

    // Wait for streaming to complete
    await page.waitForTimeout(3000);

    // Input should be enabled again
    await expect(input).toBeEnabled();
  });

  test('clears conversation history when requested', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-clear-history');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Send a message
    await input.fill('Test message');
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Verify message exists
    await expect(page.locator('text="Test message"')).toBeVisible();

    // Click clear button
    const clearButton = page.locator('button:has-text("Clear")');
    await clearButton.click();

    // Verify messages are cleared
    await expect(page.locator('text="Test message"')).not.toBeVisible();
    await expect(page.locator('text="Start a conversation!"')).toBeVisible();
  });
});

test.describe('AI Conversation - Different Personalities', () => {
  test('professional personality affects responses', async ({ page }) => {
    // This test would require actual AI integration to verify personality
    // For now, we just verify the provider can be configured
    await page.goto('/iframe.html?id=ai-aiclippyprovider--different-personalities');
    await page.waitForLoadState('networkidle');

    const select = page.locator('select');
    await select.selectOption('professional');

    // Verify the selection worked by checking the select value
    const selectedValue = await select.inputValue();
    expect(selectedValue).toBe('professional');
  });

  test('friendly personality can be selected', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-aiclippyprovider--different-personalities');
    await page.waitForLoadState('networkidle');

    const select = page.locator('select');
    await select.selectOption('friendly');

    // Verify the selection worked by checking the select value
    const selectedValue = await select.inputValue();
    expect(selectedValue).toBe('friendly');
  });
});

test.describe('AI Conversation - Error Handling', () => {
  test('handles rapid message sending', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    // Try to send multiple messages rapidly
    await input.fill('Message 1');
    await sendButton.click();

    // Wait a moment for streaming state to update
    await page.waitForTimeout(100);

    // Try to send another immediately (should be disabled)
    await input.fill('Message 2');
    // Button should be disabled during streaming
    await expect(sendButton).toBeDisabled();

    // Wait for first message to complete
    await page.waitForTimeout(2500);

    // Now should be able to send
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
    await page.waitForTimeout(500);
  });

  test('conversation UI remains stable over time', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--with-message-history');
    await page.waitForLoadState('networkidle');

    // Send multiple messages to fill up the conversation
    const input = page.locator('input[type="text"]');
    const sendButton = page.locator('button:has-text("Send")');

    for (let i = 1; i <= 5; i++) {
      await input.fill(`Message ${i}`);
      await sendButton.click();
      await page.waitForTimeout(2000);
    }

    // Verify the UI is still stable - check for chat input
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    // Verify we can still interact with the interface
    await expect(sendButton).toBeVisible();
  });
});

test.describe('AI Conversation - Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('chat interface works on mobile viewport', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    // Verify interface is visible and usable on mobile
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();

    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeVisible();

    // Send a message
    await input.fill('Mobile test');
    await sendButton.click();

    // Verify message appears
    await expect(page.locator('text="Mobile test"')).toBeVisible();

    // Verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });
});

test.describe('AI Conversation - Accessibility', () => {
  test('keyboard navigation works in chat interface', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');

    // Focus input with Tab
    await page.keyboard.press('Tab');
    await input.type('Keyboard message');

    // Send with Enter
    await page.keyboard.press('Enter');

    // Verify message was sent
    await expect(page.locator('text="Keyboard message"')).toBeVisible();
  });

  test('input has proper labels and attributes', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-useaichat--basic-chat');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[type="text"]');

    // Check for placeholder
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();

    // Check input is focusable
    await input.focus();
    const isFocused = await input.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });
});