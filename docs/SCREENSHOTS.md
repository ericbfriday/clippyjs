# Screenshot Capture Guide

Guide for capturing screenshots of ClippyJS demos and components for documentation and marketing.

## Table of Contents
- [Overview](#overview)
- [Methods](#methods)
- [Automated Capture](#automated-capture)
- [Manual Capture](#manual-capture)
- [Best Practices](#best-practices)
- [Screenshot Organization](#screenshot-organization)
- [Troubleshooting](#troubleshooting)

## Overview

Screenshots are captured from the React demo application to showcase:
- Clippy agent rendering and animations
- Different viewport sizes and responsive behavior
- UI interactions and state changes
- Component integration examples

**Output Directory**: `screenshots/`

## Methods

### 1. Chrome DevTools MCP (Recommended)

The Playwright Chrome DevTools MCP server provides the most reliable method for programmatic screenshot capture.

**Advantages**:
- Real browser rendering (Chromium)
- Accurate animation capture
- Viewport resizing capabilities
- Console message monitoring
- Built into Claude Code

**Usage**:
```typescript
import { mcp__chrome-devtools } from '@playwright/mcp';

// Navigate to page
await mcp__chrome-devtools__new_page({ url: 'http://localhost:5173' });

// Take screenshot
await mcp__chrome-devtools__take_screenshot();

// Or save to file (if supported)
await mcp__chrome-devtools__take_screenshot({
  filePath: '/path/to/screenshots/demo.png'
});
```

### 2. TypeScript Script (Automated)

Use the provided TypeScript script for batch screenshot capture.

**Location**: `scripts/capture-screenshots.ts`

**Prerequisites**:
- Playwright installed: `yarn add -D @playwright/test`
- Demo running: `yarn demo:react`

**Usage**:
```bash
# Install dependencies if needed
yarn add -D @playwright/test ts-node

# Run capture script
npx ts-node scripts/capture-screenshots.ts
```

**Configuration**:
Edit `scripts/capture-screenshots.ts` to:
- Add/remove screenshot scenarios
- Adjust viewport sizes
- Configure wait times
- Customize output paths

### 3. Manual Capture

For quick screenshots or specific states:

**Browser DevTools**:
1. Open demo: http://localhost:5173/
2. Open DevTools (F12 or ⌘+Option+I)
3. Device toolbar (⌘+Shift+M) for responsive views
4. Screenshot: ⌘+Shift+P → "Capture screenshot"

**OS Screenshot Tools**:
- macOS: ⌘+Shift+4 (region) or ⌘+Shift+3 (full screen)
- Windows: Win+Shift+S
- Linux: Varies by distro (often PrtScn or Shift+PrtScn)

## Automated Capture

### Setup

1. **Ensure demo is built**:
   ```bash
   yarn nx run @clippyjs/react:build
   ```

2. **Start demo server**:
   ```bash
   yarn demo:react
   ```

3. **Verify demo loads**: Open http://localhost:5173/

### Capture Script Configuration

The `scripts/capture-screenshots.ts` script supports customization:

```typescript
const screenshots: ScreenshotConfig[] = [
  {
    name: '01-initial-load',
    description: 'Initial demo page load',
    waitFor: 2000, // Wait 2 seconds
  },
  {
    name: '02-clippy-agent',
    description: 'Clippy agent close-up',
    selector: '[data-clippy-agent]', // Specific element
  },
  {
    name: '03-animation-frame',
    description: 'Clippy mid-animation',
    action: async (page) => {
      // Custom interactions
      await page.waitForTimeout(3000);
      await page.click('[data-animate-button]');
    },
  },
];
```

### Running Automated Capture

```bash
# Basic usage
npx ts-node scripts/capture-screenshots.ts

# With custom output directory
OUTPUT_DIR=./docs/images npx ts-node scripts/capture-screenshots.ts

# Debug mode (non-headless)
HEADLESS=false npx ts-node scripts/capture-screenshots.ts
```

## Manual Capture

### Capturing Different States

1. **Idle Animation**:
   - Load demo
   - Wait 2-3 seconds for idle animation
   - Capture multiple frames for animation sequence

2. **Responsive Views**:
   ```
   Desktop: 1280x800px
   Tablet:  800x600px
   Mobile:  375x667px
   ```

3. **Component Interactions**:
   - Click agent to trigger animations
   - Hover for tooltips (if implemented)
   - Capture modal/dialog states

### Best Manual Workflow

1. **Prepare**: Clean browser cache, use incognito/private mode
2. **Navigate**: Open demo URL
3. **Set Viewport**: Use browser DevTools device toolbar
4. **Interact**: Trigger desired state
5. **Wait**: Allow animations to settle
6. **Capture**: Use browser screenshot or OS tool
7. **Save**: Use descriptive filename (e.g., `clippy-idle-desktop.png`)

## Best Practices

### File Naming

Use descriptive, sequential names:
```
01-initial-load.png
02-clippy-idle.png
03-clippy-animation-1.png
04-clippy-animation-2.png
05-responsive-tablet.png
06-responsive-mobile.png
```

### Image Quality

- **Format**: PNG for screenshots (lossless)
- **Size**: Optimize for web (use tools like ImageOptim, TinyPNG)
- **Dimensions**: Standard viewports (1280x800, 800x600, 375x667)
- **DPI**: 72-96 DPI for web usage

### Content Guidelines

- **Clean State**: No browser chrome, clean URL bar
- **Consistent Timing**: Same animation frames across captures
- **Context**: Show enough surrounding UI for context
- **Avoid**: Personal information, API keys, temporary states

### Accessibility

- **Alt Text**: Provide descriptive alt text for documentation
- **Captions**: Add captions explaining what's shown
- **Context**: Ensure screenshots are understandable without color

## Screenshot Organization

### Directory Structure

```
screenshots/
├── README.md                 # Screenshot documentation
├── desktop/
│   ├── 01-initial-load.png
│   ├── 02-clippy-idle.png
│   └── 03-clippy-animation.png
├── tablet/
│   └── 01-responsive-view.png
├── mobile/
│   └── 01-mobile-view.png
└── components/
    ├── provider-selector.png
    └── chat-interface.png
```

### Metadata

Create a `screenshots/manifest.json` for programmatic usage:

```json
{
  "screenshots": [
    {
      "path": "desktop/01-initial-load.png",
      "description": "Initial demo page load",
      "viewport": "1280x800",
      "timestamp": "2025-11-11T16:56:00Z",
      "version": "1.0.0"
    }
  ]
}
```

## Troubleshooting

### Demo Won't Load

**Problem**: Demo page shows errors or blank screen

**Solutions**:
1. Verify build: `yarn nx run @clippyjs/react:build`
2. Check console: Open browser DevTools
3. Verify server: Ensure `yarn demo:react` is running
4. Clear cache: Hard refresh (⌘+Shift+R or Ctrl+Shift+R)

### Clippy Not Rendering

**Problem**: Agent doesn't appear on page

**Possible Causes**:
1. Assets not loading (check network tab)
2. React not rendering (check console errors)
3. Build artifacts stale (rebuild packages)

**Solution**:
```bash
# Clean rebuild
yarn clean
yarn nx:build
yarn demo:react
```

### Screenshot Script Fails

**Problem**: `capture-screenshots.ts` throws errors

**Common Issues**:

1. **Playwright not installed**:
   ```bash
   yarn add -D @playwright/test
   yarn workspace @clippyjs/react playwright:install
   ```

2. **Demo not running**:
   ```bash
   # Start in separate terminal
   yarn demo:react
   ```

3. **Port conflict**: Demo must be on http://localhost:5173/

4. **Permissions**: Ensure write access to `screenshots/` directory

### Image Quality Issues

**Problem**: Screenshots appear blurry or pixelated

**Solutions**:
- Use higher viewport sizes
- Disable browser zoom (set to 100%)
- Use PNG format, not JPEG
- Capture at 2x DPI if possible

### Animation Timing

**Problem**: Can't capture specific animation frame

**Solutions**:
- Increase `waitFor` duration in script
- Use browser DevTools to pause animations
- Capture video and extract frames
- Use browser animation controls

## Advanced Usage

### Capturing Videos

For animated demonstrations:

```typescript
// Using Playwright
const context = await browser.newContext({
  recordVideo: {
    dir: 'videos/',
    size: { width: 1280, height: 800 }
  }
});
```

### Multiple Viewports

Batch capture across viewport sizes:

```typescript
const viewports = [
  { width: 1280, height: 800, name: 'desktop' },
  { width: 800, height: 600, name: 'tablet' },
  { width: 375, height: 667, name: 'mobile' },
];

for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  await page.screenshot({
    path: `screenshots/${viewport.name}/demo.png`
  });
}
```

### Headless vs Headed

**Headless** (faster, CI-friendly):
```typescript
const browser = await chromium.launch({ headless: true });
```

**Headed** (debugging):
```typescript
const browser = await chromium.launch({ headless: false, slowMo: 100 });
```

## Related Documentation

- [screenshots/README.md](../screenshots/README.md) - Screenshot collection documentation
- [scripts/capture-screenshots.ts](../scripts/capture-screenshots.ts) - Automated capture script
- [Playwright Documentation](https://playwright.dev/) - Official Playwright docs
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - CDP reference
