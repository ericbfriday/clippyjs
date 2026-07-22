# Issues & Gotchas — browser-ai-assistant

## Known Gotchas

### PnP Workspace
Yarn 4.9.2 with PnP — always use "workspace:*" for internal deps, NOT "^1.0.0".
Run `yarn install` after modifying package.json files.

### Nx project registration
New packages need project.json at their root. Nx auto-discovers packages with project.json.
After adding new packages, run `yarn nx show projects` to verify they appear.

### tsconfig.base.json path aliases
After creating new packages, add path aliases to root tsconfig.base.json:
```json
"@clippyjs/browser-assistant": ["packages/browser-assistant/src/index.ts"],
"@clippyjs/browser-parser": ["packages/browser-parser/src/index.ts"],
"@clippyjs/context-providers": ["packages/context-providers/src/index.ts"]
```

### rollup.config.ts for browser packages
Browser packages targeting the DOM should NOT externalize DOM globals.
Use @rollup/plugin-node-resolve with browser: true option.

### MutationObserver in tests
jsdom supports MutationObserver — no mocking needed.
ResizeObserver may need polyfill: `global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };`

### ShadowRoot adoptedStyleSheets
jsdom may not support `adoptedStyleSheets` — check jsdom version and add fallback in ShadowRenderer:
```typescript
if ('adoptedStyleSheets' in this.shadow) {
  this.shadow.adoptedStyleSheets = [this.styles];
} else {
  const style = document.createElement('style');
  style.textContent = CLIPPY_STYLES;
  this.shadow.appendChild(style);
}
```
