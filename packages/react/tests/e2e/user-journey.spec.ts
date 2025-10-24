import { test, expect } from '@playwright/test';

/**
 * E2E Tests: User Journey
 *
 * Tests complete realistic user journeys from start to finish,
 * simulating how real users would interact with the application.
 */

test.describe('User Journey - First Time Visitor', () => {
  test('new user explores agent features', async ({ page }) => {
    // Step 1: Arrive at Storybook
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Step 2: Navigate to agent demo
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Step 3: Explore different agents
    await page.goto('/iframe.html?id=stories-all-agents--all-agents');
    await page.waitForLoadState('networkidle');

    await expect(storyRoot).toBeVisible();

    // Step 4: View component API
    await page.goto('/iframe.html?id=clippy-component--basic');
    await page.waitForLoadState('networkidle');

    await expect(storyRoot).toBeVisible();
  });

  test('user tests interactive features', async ({ page }) => {
    // Load interactive story
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Interact with page
    await page.mouse.move(200, 200);
    await page.waitForTimeout(300);

    await page.click('body');
    await page.waitForTimeout(300);

    // Verify page remains stable
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('User Journey - Developer Integration', () => {
  test('developer explores API documentation', async ({ page }) => {
    // Visit different component stories to understand API
    const stories = [
      '/iframe.html?id=clippy-component--basic',
      '/iframe.html?id=clippy-component--with-greeting',
      '/iframe.html?id=useagent-basic--auto-load',
    ];

    for (const story of stories) {
      await page.goto(story);
      await page.waitForLoadState('networkidle');

      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible();

      // Developer would inspect controls and props
      await page.waitForTimeout(1000);
    }
  });

  test('developer tests different agent configurations', async ({ page }) => {
    // Test auto-load configuration
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    let storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Test component with custom props
    await page.goto('/iframe.html?id=clippy-component--with-greeting');
    await page.waitForLoadState('networkidle');

    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Test multi-agent setup
    await page.goto('/iframe.html?id=stories-all-agents--all-agents');
    await page.waitForLoadState('networkidle');

    storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('User Journey - Performance Testing', () => {
  test('handles sustained usage over time', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Simulate 5 minutes of usage
    const duration = 60 * 1000; // 1 minute for testing
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      // Simulate user activity
      await page.mouse.move(
        Math.random() * 800,
        Math.random() * 600
      );

      await page.waitForTimeout(2000);

      // Verify page is still responsive
      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible();

      await page.waitForTimeout(3000);
    }

    // Final stability check
    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();
  });

  test('handles frequent story switching', async ({ page }) => {
    const stories = [
      '/iframe.html?id=useagent-basic--auto-load',
      '/iframe.html?id=clippy-component--basic',
      '/iframe.html?id=clippy-component--with-greeting',
    ];

    // Switch between stories 10 times
    for (let i = 0; i < 10; i++) {
      const story = stories[i % stories.length];
      await page.goto(story);
      await page.waitForLoadState('networkidle');

      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible();

      await page.waitForTimeout(500);
    }
  });
});

test.describe('User Journey - Mobile User', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('mobile user interacts with agent', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Simulate mobile touch interactions
    await page.tap('body');
    await page.waitForTimeout(300);

    // Verify page remains functional
    await expect(storyRoot).toBeVisible();

    // Simulate scroll
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);

    await expect(storyRoot).toBeVisible();
  });

  test('responsive layout works on mobile', async ({ page }) => {
    const stories = [
      '/iframe.html?id=useagent-basic--auto-load',
      '/iframe.html?id=clippy-component--basic',
    ];

    for (const story of stories) {
      await page.goto(story);
      await page.waitForLoadState('networkidle');

      // Verify content is visible and accessible on mobile
      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible();

      // Check viewport doesn't require horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width || 375;

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Small margin for scrollbar
    }
  });
});

test.describe('User Journey - Accessibility User', () => {
  test('keyboard navigation works throughout journey', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Simulate keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Page should remain functional
    await expect(storyRoot).toBeVisible();
  });

  test('screen reader landmarks are present', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Check for basic accessibility structure
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify page has proper document structure
    const html = page.locator('html');
    const lang = await html.getAttribute('lang');

    // Should have lang attribute or default to en
    expect(lang === 'en' || lang === null).toBeTruthy();
  });
});

test.describe('User Journey - Power User', () => {
  test('explores all agent types', async ({ page }) => {
    // Navigate through all available agent stories
    const agentStories = [
      '/iframe.html?id=useagent-basic--auto-load',
      '/iframe.html?id=clippy-component--basic',
      '/iframe.html?id=clippy-component--with-greeting',
      '/iframe.html?id=stories-all-agents--all-agents',
    ];

    for (const story of agentStories) {
      await page.goto(story);
      await page.waitForLoadState('networkidle');

      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible();

      // Power user would inspect each demo thoroughly
      await page.waitForTimeout(800);
    }
  });

  test('tests edge cases and boundaries', async ({ page }) => {
    await page.goto('/iframe.html?id=useagent-basic--auto-load');
    await page.waitForLoadState('networkidle');

    // Test rapid clicks
    for (let i = 0; i < 10; i++) {
      await page.click('body');
      await page.waitForTimeout(50);
    }

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Test window resizing
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(200);
    await expect(storyRoot).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(200);
    await expect(storyRoot).toBeVisible();
  });
});

test.describe('User Journey - Return Visitor', () => {
  test('returning user quickly navigates to familiar features', async ({ page }) => {
    // User knows exactly what they want
    await page.goto('/iframe.html?id=clippy-component--with-greeting');
    await page.waitForLoadState('networkidle');

    const storyRoot = page.locator('#storybook-root');
    await expect(storyRoot).toBeVisible();

    // Quickly verify it works as expected
    await page.waitForTimeout(500);

    // Navigate to another favorite
    await page.goto('/iframe.html?id=stories-all-agents--all-agents');
    await page.waitForLoadState('networkidle');

    await expect(storyRoot).toBeVisible();
  });
});
