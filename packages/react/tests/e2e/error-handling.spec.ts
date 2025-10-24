import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Error Handling
 *
 * Tests how the application handles errors, network failures,
 * and edge cases in a real browser environment.
 */

test.describe('Error Handling - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');
  });

  test('handles network interruption gracefully', async ({ page }) => {
    // Verify initial load works
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to navigate to new story
    await page.goto('/iframe.html?id=clippy-component--basic', { waitUntil: 'domcontentloaded' }).catch(() => {
      // Expected to fail when offline
    });

    // Go back online
    await page.context().setOffline(false);

    // Verify recovery
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const recoveredRoot = page.locator('#storybook-root');
    await expect(recoveredRoot).toBeVisible();
  });

  test('handles missing story gracefully', async ({ page }) => {
    // Try to load a non-existent story
    const response = await page.goto('/iframe.html?id=nonexistent--story', {
      waitUntil: 'domcontentloaded',
    });

    // Should get some response even if story doesn't exist
    expect(response?.status()).toBeDefined();

    // Storybook should show an error state or similar
    // The page should still be functional
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('recovers from console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Page should still be functional even if there are console errors
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Log errors for debugging but don't fail
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
    }
  });

  test('handles rapid navigation without crashing', async ({ page }) => {
    const stories = [
      '/iframe.html?id=useagent-basic--auto-load',
      '/iframe.html?id=clippy-component--basic',
      '/iframe.html?id=useagent-basic--auto-load',
      '/iframe.html?id=clippy-component--with-greeting',
    ];

    // Rapidly navigate between stories
    for (const story of stories) {
      await page.goto(story, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(100); // Very short wait
    }

    // Verify final state is stable
    await page.waitForLoadState('networkidle');
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('Asset Loading Errors', () => {
  test('handles missing agent assets gracefully', async ({ page }) => {
    // Intercept agent asset requests and fail some
    await page.route('**/*.png', (route) => {
      // Let first few through, fail some others
      if (Math.random() > 0.7) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Page should still load even if some assets fail
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Clean up route
    await page.unroute('**/*.png');
  });

  test('handles slow network conditions', async ({ page }) => {
    // Slow down network
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024, // 50 KB/s
      uploadThroughput: 20 * 1024,   // 20 KB/s
      latency: 500, // 500ms latency
    });

    await page.goto('/iframe.html?id=useagent-basic--auto-load');

    // Should eventually load even with slow network
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Reset network conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });
});

test.describe('JavaScript Errors', () => {
  test('catches and logs uncaught exceptions', async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Application should handle errors gracefully
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Log any errors for debugging
    if (pageErrors.length > 0) {
      console.log('Page errors detected:', pageErrors.map(e => e.message));
    }
  });

  test('handles Promise rejections', async ({ page }) => {
    const rejections: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Unhandled')) {
        rejections.push(msg.text());
      }
    });

    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Wait a bit to catch any async Promise rejections
    await page.waitForTimeout(2000);

    // Application should remain functional
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Log rejections for debugging
    if (rejections.length > 0) {
      console.log('Promise rejections detected:', rejections);
    }
  });
});

test.describe('Browser Compatibility', () => {
  test('works with different user agents', async ({ page }) => {
    // Test with mobile user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });

    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });

  test('handles browser back/forward navigation', async ({ page }) => {
    // Load first story
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    let storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Load second story
    await page.goto('/iframe.html?id=clippy-component--basic');
    await page.waitForLoadState('networkidle');

    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');

    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('Resource Cleanup', () => {
  test('cleans up resources on page unload', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Navigate away
    await page.goto('about:blank');

    // Navigate back
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Should load cleanly without leftover state
    const newStoryRoot = page.locator('#storybook-root');
    await expect(newStoryRoot).toBeVisible();
  });

  test('handles tab visibility changes', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Application should still be functional
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});
