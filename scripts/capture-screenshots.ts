/**
 * Playwright Screenshot Capture Script
 * Captures screenshots of the ClippyJS React demo for documentation
 */

import { chromium, Browser, Page } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const DEMO_URL = 'http://localhost:5173';
const OUTPUT_DIR = join(process.cwd(), 'screenshots');
const VIEWPORT = { width: 1280, height: 800 };

interface ScreenshotConfig {
  name: string;
  description: string;
  selector?: string;
  action?: (page: Page) => Promise<void>;
  waitFor?: number;
}

const screenshots: ScreenshotConfig[] = [
  {
    name: '01-initial-load',
    description: 'Initial demo page load with Clippy agent',
    waitFor: 2000,
  },
  {
    name: '02-clippy-idle',
    description: 'Clippy in idle state',
    selector: '[data-clippy-agent]',
    waitFor: 1000,
  },
  {
    name: '03-clippy-animated',
    description: 'Clippy with animation',
    action: async (page) => {
      // Wait for agent to be visible
      await page.waitForSelector('[data-clippy-agent]', { state: 'visible' });
      // Give time for any animations
      await page.waitForTimeout(2000);
    },
  },
  {
    name: '04-full-page-context',
    description: 'Full page showing Clippy in context',
    waitFor: 1000,
  },
];

async function ensureOutputDirectory(): Promise<void> {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Output directory ready: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error(`✗ Failed to create output directory:`, error);
    throw error;
  }
}

async function captureScreenshot(
  page: Page,
  config: ScreenshotConfig
): Promise<void> {
  const { name, description, selector, action, waitFor } = config;

  console.log(`\n📸 Capturing: ${name}`);
  console.log(`   ${description}`);

  try {
    // Execute custom action if provided
    if (action) {
      await action(page);
    }

    // Wait for specific duration if specified
    if (waitFor) {
      await page.waitForTimeout(waitFor);
    }

    // Capture screenshot
    const screenshotPath = join(OUTPUT_DIR, `${name}.png`);

    if (selector) {
      // Capture specific element
      const element = await page.waitForSelector(selector, {
        state: 'visible',
        timeout: 10000
      });
      await element.screenshot({
        path: screenshotPath,
        animations: 'disabled'
      });
    } else {
      // Capture full page
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: 'disabled'
      });
    }

    console.log(`   ✓ Saved: ${screenshotPath}`);
  } catch (error) {
    console.error(`   ✗ Failed to capture ${name}:`, error);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('🎬 ClippyJS Screenshot Capture\n');
  console.log(`Target URL: ${DEMO_URL}`);
  console.log(`Output Directory: ${OUTPUT_DIR}\n`);

  // Ensure output directory exists
  await ensureOutputDirectory();

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ headless: true });

    // Create page with viewport
    page = await browser.newPage({ viewport: VIEWPORT });
    console.log(`✓ Browser launched (${VIEWPORT.width}x${VIEWPORT.height})\n`);

    // Navigate to demo
    console.log(`🔗 Navigating to ${DEMO_URL}...`);
    const response = await page.goto(DEMO_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (!response || !response.ok()) {
      throw new Error(`Failed to load demo: ${response?.status()}`);
    }
    console.log('✓ Demo loaded successfully');

    // Wait for initial render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Capture all screenshots
    console.log(`\n📸 Capturing ${screenshots.length} screenshots...\n`);
    for (const config of screenshots) {
      await captureScreenshot(page, config);
    }

    console.log(`\n✅ Successfully captured ${screenshots.length} screenshots!`);
    console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error('\n❌ Screenshot capture failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('🧹 Browser closed');
  }
}

// Run script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
