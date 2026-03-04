# Decisions — browser-ai-assistant

## Architecture Decisions

### Shadow DOM mode: closed
Use `attachShadow({ mode: 'closed' })` to prevent host page JS from accessing Clippy internals.

### No React dependency for browser-parser and context-providers
These packages run in vanilla browser context (no React). Pure TypeScript, no JSX.
browser-assistant MAY include a React wrapper as secondary export but core must be framework-agnostic.

### jsdom test environment
All 3 new packages test against jsdom because they manipulate browser DOM APIs. Set environment: 'jsdom' in vitest.config.ts.

### CDN bundle: IIFE format
The CDN embed (`clippy.min.js`) must produce an IIFE bundle that self-registers as `window.ClippyAssistant`.
Rollup output: format: 'iife', name: 'ClippyAssistant'.

### Dependency graph
browser-parser → @clippyjs/types only (no circular deps)
context-providers → @clippyjs/types + @clippyjs/ai + @clippyjs/browser-parser
browser-assistant → all of the above
