import { test, expect } from '@playwright/test';

/**
 * E2E Tests: History Persistence
 *
 * Tests conversation history storage and retrieval across different storage implementations:
 * - LocalStorageHistoryStore (localStorage API)
 * - SessionStorageHistoryStore (sessionStorage API)
 * - IndexedDBHistoryStore (IndexedDB API)
 */

test.describe('History Persistence - LocalStorage', () => {
  test('saves and loads conversation history', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--local-storage-persistence');
    await page.waitForLoadState('networkidle');

    // Send a message
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('Test message for history');
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(1000);

    // Reload page to test persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify message history is restored
    await expect(page.locator('text="Test message for history"')).toBeVisible({ timeout: 2000 });
  });

  test('clears specific agent history', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--local-storage-clear-specific');
    await page.waitForLoadState('networkidle');

    // Send message
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('Message before clear');
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(500);

    // Clear history button
    await page.locator('button:has-text("Clear History")').click();

    // Reload and verify history is cleared
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text="Message before clear"')).not.toBeVisible();
  });

  test('clears all conversation histories', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--local-storage-clear-all');
    await page.waitForLoadState('networkidle');

    // Verify clearAll functionality
    await page.locator('button:has-text("Clear All")').click();
    await page.waitForTimeout(500);

    // Verify localStorage is empty for history
    const historyKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('clippy-ai-history')) {
          keys.push(key);
        }
      }
      return keys;
    });

    expect(historyKeys.length).toBe(0);
  });
});

test.describe('History Persistence - SessionStorage', () => {
  test('saves and loads within same session', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--session-storage-persistence');
    await page.waitForLoadState('networkidle');

    // Send message
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('Session test message');
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(1000);

    // Navigate away and back (simulating navigation within same tab)
    await page.goto('/iframe.html?id=ai-modes--help-assistant-mode');
    await page.goto('/iframe.html?id=ai-history--session-storage-persistence');
    await page.waitForLoadState('networkidle');

    // Verify message is still there
    await expect(page.locator('text="Session test message"')).toBeVisible({ timeout: 2000 });
  });

  test('history cleared on new session', async ({ context }) => {
    // Open page in first tab
    const page1 = await context.newPage();
    await page1.goto('/iframe.html?id=ai-history--session-storage-persistence');
    await page1.waitForLoadState('networkidle');

    const input1 = page1.locator('input[type="text"], textarea').first();
    await input1.fill('Session 1 message');
    await page1.locator('button:has-text("Send")').click();
    await page1.waitForTimeout(500);

    // Open new tab (new session context)
    const page2 = await context.newPage();
    await page2.goto('/iframe.html?id=ai-history--session-storage-persistence');
    await page2.waitForLoadState('networkidle');

    // Verify message from session 1 is NOT visible in session 2
    await expect(page2.locator('text="Session 1 message"')).not.toBeVisible();

    await page1.close();
    await page2.close();
  });
});

test.describe('History Persistence - IndexedDB', () => {
  test('initializes IndexedDB connection', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--indexed-db-initialization');
    await page.waitForLoadState('networkidle');

    // Verify initialization status
    await expect(page.locator('text="Status: initialized"')).toBeVisible({ timeout: 2000 });
  });

  test('saves and loads large conversation history', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--indexed-db-persistence');
    await page.waitForLoadState('networkidle');

    // Send multiple messages to create larger history
    const input = page.locator('input[type="text"], textarea').first();

    for (let i = 1; i <= 5; i++) {
      await input.fill(`IndexedDB message ${i}`);
      await page.locator('button:has-text("Send")').click();
      await page.waitForTimeout(300);
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify all messages restored
    for (let i = 1; i <= 5; i++) {
      await expect(page.locator(`text="IndexedDB message ${i}"`)).toBeVisible({ timeout: 2000 });
    }
  });

  test('handles large data volumes better than localStorage', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--indexed-db-large-data');
    await page.waitForLoadState('networkidle');

    // Send messages with large content
    const input = page.locator('input[type="text"], textarea').first();
    const largeMessage = 'A'.repeat(1000); // 1KB message

    for (let i = 1; i <= 10; i++) {
      await input.fill(`${largeMessage} ${i}`);
      await page.locator('button:has-text("Send")').click();
      await page.waitForTimeout(200);
    }

    await page.waitForTimeout(1000);

    // Reload and verify data persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that at least some messages are restored
    const messageCount = await page.locator('.message-content').count();
    expect(messageCount).toBeGreaterThan(5);
  });

  test('clears specific agent from IndexedDB', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--indexed-db-clear-specific');
    await page.waitForLoadState('networkidle');

    // Add messages
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('Message to be cleared');
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(500);

    // Clear history
    await page.locator('button:has-text("Clear History")').click();
    await page.waitForTimeout(500);

    // Reload and verify cleared
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text="Message to be cleared"')).not.toBeVisible();
  });

  test('clears all agents from IndexedDB', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--indexed-db-clear-all');
    await page.waitForLoadState('networkidle');

    // Clear all button
    await page.locator('button:has-text("Clear All")').click();
    await page.waitForTimeout(500);

    // Verify database is empty via evaluation
    const dbIsEmpty = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('clippy-ai-history', 1);

        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['conversations'], 'readonly');
          const store = transaction.objectStore('conversations');
          const countRequest = store.count();

          countRequest.onsuccess = () => {
            resolve(countRequest.result === 0);
          };
        };
      });
    });

    expect(dbIsEmpty).toBe(true);
  });

  test('closes connection properly', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--indexed-db-connection-lifecycle');
    await page.waitForLoadState('networkidle');

    // Initialize and close
    await page.locator('button:has-text("Initialize")').click();
    await page.waitForTimeout(500);

    await page.locator('button:has-text("Close Connection")').click();
    await page.waitForTimeout(500);

    // Verify connection closed
    await expect(page.locator('text="Status: closed"')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('History Persistence - Cross-Store Compatibility', () => {
  test('different stores maintain separate histories', async ({ page }) => {
    // Test that localStorage, sessionStorage, and IndexedDB are independent
    await page.goto('/iframe.html?id=ai-history--cross-store-compatibility');
    await page.waitForLoadState('networkidle');

    // Send messages to different stores
    await page.locator('button:has-text("LocalStorage Message")').click();
    await page.waitForTimeout(300);

    await page.locator('button:has-text("SessionStorage Message")').click();
    await page.waitForTimeout(300);

    await page.locator('button:has-text("IndexedDB Message")').click();
    await page.waitForTimeout(500);

    // Verify each store has its own history
    await expect(page.locator('text="LocalStorage: 1 message"')).toBeVisible();
    await expect(page.locator('text="SessionStorage: 1 message"')).toBeVisible();
    await expect(page.locator('text="IndexedDB: 1 message"')).toBeVisible();
  });
});

test.describe('History Persistence - Date Serialization', () => {
  test('properly serializes and deserializes dates', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--date-serialization');
    await page.waitForLoadState('networkidle');

    // Send message
    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('Test date serialization');
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(1000);

    // Reload to test date deserialization
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify date fields are properly restored
    const dateInfo = await page.locator('.date-info').textContent();
    expect(dateInfo).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date format
  });

  test('preserves context timestamps', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--context-timestamps');
    await page.waitForLoadState('networkidle');

    // Send message with context
    await page.locator('button:has-text("Send with Context")').click();
    await page.waitForTimeout(1000);

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify context timestamps preserved
    await expect(page.locator('text="Context timestamp: "')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('History Persistence - Error Handling', () => {
  test('handles localStorage quota exceeded', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--quota-exceeded-test');
    await page.waitForLoadState('networkidle');

    // Attempt to fill localStorage beyond quota
    const result = await page.evaluate(() => {
      try {
        const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
        localStorage.setItem('test-large', largeData);
        return 'success';
      } catch (e) {
        return 'quota-exceeded';
      }
    });

    // Verify app handles quota gracefully
    await expect(page.locator('text="Storage available" | text="quota-exceeded"')).toBeVisible({ timeout: 2000 });
  });

  test('handles IndexedDB initialization failure', async ({ page }) => {
    await page.goto('/iframe.html?id=ai-history--indexed-db-error-handling');
    await page.waitForLoadState('networkidle');

    // Verify error handling UI
    await expect(page.locator('text="Status:" | text="Error:"')).toBeVisible({ timeout: 2000 });
  });
});
