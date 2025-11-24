# ClippyJS Screenshots

Generated screenshots of the ClippyJS React demo application.

## Captured Images

This directory contains programmatically captured screenshots showing:

1. **Clippy Idle Animation** - Multiple frames showing Clippy's natural idle animation
2. **Different Viewport Sizes** - Responsive behavior at various screen sizes
3. **Clean Rendering** - Demonstrates the library's rendering quality

## Screenshot Details

- **Demo URL**: http://localhost:5173/
- **Method**: Playwright MCP Chrome DevTools
- **Date**: 2025-11-11
- **Browser**: Chromium (headless mode)

## Viewports Captured

- **Desktop**: 1280x800px (standard desktop resolution)
- **Tablet**: 800x600px (medium viewport)

## What's Shown

The screenshots demonstrate:
- ✅ Successful ClippyJS library integration
- ✅ Clippy agent rendering with proper assets
- ✅ Smooth animations (multiple frames captured)
- ✅ Clean, minimal demo interface
- ✅ Responsive design across viewport sizes

## Technical Notes

### Build Configuration Fixed
Prior to screenshot capture, the following build issues were resolved:
1. TypeScript output directory mismatch (dist/src vs dist)
2. Nx executor configuration for @clippyjs/types package
3. Project references validation between packages

### Screenshot Capture Method
Screenshots were captured using the Chrome DevTools MCP server, which provides:
- Real browser rendering (Chromium)
- Accurate animation capture
- Viewport resizing capabilities
- Console message monitoring

## Using the Screenshots

These screenshots can be used for:
- **Documentation**: README.md, getting started guides
- **Marketing**: Project website, npm package page
- **Social Media**: Twitter/X, LinkedIn project announcements
- **GitHub**: Repository banner, wiki pages

## Future Screenshot Ideas

To expand the screenshot collection, consider capturing:
1. Different Clippy agents (Merlin, Rover, etc.)
2. Various personality modes (helpful, concise, technical, creative)
3. Chat interactions with AI providers
4. Proactive behavior triggers
5. Provider switching UI
6. Mobile viewport sizes (375x667px)
7. Dark mode (if implemented)

## Reproducing Screenshots

To capture new screenshots:

1. **Start the React demo**:
   ```bash
   yarn demo:react
   ```

2. **Use the capture script** (when MCP is available):
   - Chrome DevTools MCP provides `take_screenshot` capability
   - Or use the TypeScript script in `scripts/capture-screenshots.ts`

3. **Manual capture**:
   - Open http://localhost:5173/ in browser
   - Use browser DevTools screenshot feature
   - Or use OS screenshot tools (⌘+Shift+4 on macOS)

## Notes

- Screenshots show the vanilla demo without AI provider configuration
- For AI-powered features, screenshots would require API keys configured
- Current demo shows basic agent rendering and animation
