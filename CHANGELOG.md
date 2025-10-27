# Changelog

All notable changes to ClippyJS AI Integration will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Proactive Behavior System** - Complete AI assistant that proactively offers help
  - Configurable intrusion levels (low/medium/high)
  - Smart cooldown system after consecutive ignores
  - User interaction tracking and statistics
  - Accept/ignore rate analytics
  - Manual trigger support for testing
- **React Integration** - Full React 19 support with streaming
  - `AIClippyProvider` context provider for AI state management
  - `useAIChat` hook for conversation management
  - React StrictMode resilience with proper lifecycle management
  - Real-time streaming responses with flushSync
- **Anthropic Claude Integration** - Native support for Claude AI
  - Streaming chat with Claude SDK
  - Tool use capabilities (experimental)
  - Vision support (experimental)
  - Proxy and client-side modes
- **Comprehensive E2E Tests** - Full Playwright test suite
  - Proactive behavior tests (triggers, cooldown, tracking)
  - Streaming chat tests (token-by-token, cancel, UI behavior)
  - Accessibility tests (keyboard navigation, focus management)
  - Performance tests (latency, memory, rendering)
- **Storybook Stories** - Interactive documentation and demos
  - Proactive behavior demonstrations
  - Chat interface examples
  - Configuration controls
- **Context System** - Smart context gathering for AI
  - DOM context provider (page structure, forms, text)
  - User action tracking (clicks, inputs, scrolls)
  - App state integration (custom context providers)
- **Personality System** - Classic and Extended modes for all agents
  - Clippy, Merlin, Bonzi, F1, Genie, Genius, Links, Peedy, Rocky, Rover
  - Configurable system prompts
  - Personality trait definitions

### Fixed
- **React StrictMode Race Condition** - Critical bug causing proactive behavior failures
  - Implemented lazy state initialization for synchronous manager creation
  - Switched from useEffect to useLayoutEffect for subscription timing
  - Guaranteed listener attachment before engine starts
  - Prevented double-mount race conditions
- **Streaming UI Gaps** - Chat messages appearing out of order
  - Added flushSync to force immediate UI updates before async work
  - Ensured user messages appear instantly before AI response
  - Improved streaming state management
- **E2E Test Flakiness** - Tests timing out or failing intermittently
  - Split compound selectors for whitespace resilience
  - Improved message targeting with .filter()
  - Better content div isolation for streaming verification
  - Reduced test execution time from 30s+ to ~6.9s
- **Manual Trigger Timing** - Manual proactive triggers respecting time intervals
  - Added bypass parameter for manual triggers
  - Allows instant testing without waiting for cooldown
- **Context Gathering Errors** - Crashes when context providers fail
  - Added try-catch with empty context fallback
  - Better error logging for debugging

### Changed
- **Build Process** - Clarified monorepo build requirements
  - Added documentation for `yarn build` requirement before tests
  - Improved build order in CI/CD
- **Logging** - Enhanced diagnostic logging for debugging
  - ProactiveBehaviorEngine logs for trigger flow
  - AIClippyContext logs for subscription lifecycle
  - Detailed callback execution logging
- **.gitignore** - Updated to exclude development artifacts
  - Serena MCP memories (.serena/)
  - Test reports and artifacts (playwright-report/, test-results/)
  - Session summaries (SESSION_SUMMARY.md)

### Performance
- **Context Gathering**: ~50ms (target < 200ms) ✅
- **E2E Test Suite**: ~6.9s total execution ✅
- **Package Build**: ~8s for @clippyjs/ai ✅
- **Storybook Build**: ~45s ✅

### Documentation
- Added `AI_INTEGRATION_SPECIFICATION.md` - Complete technical specification
- Added `AI_INTEGRATION_ISSUES.md` - Detailed implementation tasks (5 phases)
- Added `AI_INTEGRATION_IMPLEMENTATION_LOG.md` - Development journal and learnings
- Added React patterns documentation for StrictMode and streaming
- Added Playwright selector strategies and best practices
- Added build system requirements for contributors

## [0.3.0] - 2025-10-27 - Phase 3 Complete

### Summary
Phase 3 implementation complete with fully functional proactive behavior system. All E2E tests passing consistently. React StrictMode race condition resolved. Ready for Phase 4 (advanced features).

**Commits**: `8700bf6`, `7e261a7`, `240f41f`, `a7a247e`, `bdc1ff8`, `aa9b749`

## [0.2.0] - 2025-10-23 - Phase 2 Complete

### Summary
Core AI integration features implemented. AIClippyProvider working with streaming responses. Anthropic provider functional in both proxy and client modes.

## [0.1.0] - 2025-10-20 - Phase 1 Complete

### Summary
Foundation phase complete. Package structure established. Core interfaces and context system implemented. Ready for React integration.

---

## Future Releases

### [0.4.0] - Phase 4: Advanced Features
- Conversation history persistence
- Pre-built modes (help-assistant, code-reviewer, shopping-assistant)
- Tool use support for page manipulation
- Vision support for screenshot analysis
- Custom context provider examples

### [0.5.0] - Phase 5: Polish & Documentation
- 90%+ test coverage
- Complete API documentation
- Usage examples and tutorials
- Starter templates (Next.js, Vite)
- Performance optimizations

### [1.0.0] - Production Release
- OpenAI provider support
- Multi-agent coordination
- Voice input/output
- Analytics and tracking
- Mobile support

---

## Migration Guides

### From Basic ClippyJS to AI-Powered

```typescript
// Before (Basic ClippyJS)
import { ClippyProvider, useAgent } from '@clippyjs/react';

function App() {
  return (
    <ClippyProvider>
      <MyApp />
    </ClippyProvider>
  );
}

// After (AI-Powered ClippyJS)
import { ClippyProvider } from '@clippyjs/react';
import { AIClippyProvider } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

function App() {
  const anthropicProvider = new AnthropicProvider();

  return (
    <ClippyProvider>
      <AIClippyProvider
        provider={anthropicProvider}
        integrationMode="proxy"
        endpoint="/api/ai/chat"
        agentName="Clippy"
        personalityMode="extended"
        proactiveConfig={{
          enabled: true,
          intervalMs: 120000, // 2 minutes
        }}
      >
        <MyApp />
      </AIClippyProvider>
    </ClippyProvider>
  );
}
```

---

## Breaking Changes

### None Yet
Version 0.x.x is pre-release. Breaking changes may occur between minor versions until 1.0.0.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/clippyjs/clippy/issues)
- **Documentation**: [docs/](./docs/)
- **Examples**: [packages/storybook/stories/](./packages/storybook/stories/)

---

## Contributors

Thanks to everyone who has contributed to ClippyJS AI Integration!

<!-- Add contributor list here -->

---

## License

MIT License - See [LICENSE](./LICENSE) for details
