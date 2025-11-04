# ClippyJS AI Integration Documentation

Complete documentation for the AI-powered ClippyJS integration.

---

## 📚 Documentation Index

### Getting Started
1. **[AI Integration Specification](./AI_INTEGRATION_SPECIFICATION.md)** - Complete technical specification and architecture
   - System architecture and package structure
   - Core component specifications
   - React integration patterns
   - Anthropic provider implementation
   - Pre-built modes and personality system

2. **[Implementation Tasks](./AI_INTEGRATION_ISSUES.md)** - Detailed implementation roadmap
   - Phase 1: Foundation (Package Structure & Core Interfaces)
   - Phase 2: Core Features (Provider Implementation & UI Components)
   - Phase 3: Proactive Behavior (Engine & Trigger Strategies) ✅ **COMPLETE**
   - Phase 4: Advanced Features (History, Modes, Tools)
   - Phase 5: Polish & Documentation

3. **[Implementation Log](./AI_INTEGRATION_IMPLEMENTATION_LOG.md)** - Development journal and learnings
   - Recent commits and changes
   - Technical patterns discovered
   - React StrictMode resilience strategies
   - Build system requirements
   - Performance metrics
   - Lessons learned

### Technical Guides

4. **[React 19 TypeScript Fixes](./react19-typescript-fixes.md)** - React 19 migration and type fixes
   - Type system changes
   - Hook type improvements
   - Component type patterns

5. **[CHANGELOG](../CHANGELOG.md)** - Version history and release notes
   - Feature additions
   - Bug fixes
   - Breaking changes
   - Migration guides

---

## 🚀 Quick Start

### Basic Setup (Single Provider)

```typescript
import { ClippyProvider } from '@clippyjs/react';
import { AIClippyProvider } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

function App() {
  const anthropicProvider = new AnthropicProvider();
  await anthropicProvider.initialize({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  return (
    <ClippyProvider>
      <AIClippyProvider
        config={{
          provider: anthropicProvider,
          agentName: 'Clippy',
          personalityMode: 'helpful',
          proactiveConfig: {
            enabled: true,
            intervalMs: 120000, // 2 minutes
            intrusionLevel: 'medium',
          },
        }}
      >
        <YourApp />
      </AIClippyProvider>
    </ClippyProvider>
  );
}
```

### Multi-Provider Setup (New in Phase 6!)

```typescript
import { AIClippyProvider, type ProviderInfo } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';
import { OpenAIProvider } from '@clippyjs/ai-openai';

// Initialize providers
const anthropicProvider = new AnthropicProvider();
await anthropicProvider.initialize({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openaiProvider = new OpenAIProvider();
await openaiProvider.initialize({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define provider info
const providers: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    supportsVision: true,
    supportsTools: true,
    instance: anthropicProvider,
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    models: ['gpt-4o', 'gpt-4-turbo'],
    supportsVision: true,
    supportsTools: true,
    instance: openaiProvider,
  },
];

function App() {
  return (
    <AIClippyProvider
      config={{
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      }}
    >
      <YourApp />
    </AIClippyProvider>
  );
}
```

### Backend Proxy (Next.js)

```typescript
// app/api/ai/chat/route.ts
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  const { messages, systemPrompt, maxTokens } = await req.json();

  const stream = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: maxTokens || 1024,
    system: systemPrompt,
    messages,
    stream: true,
  });

  // Stream response as SSE...
}
```

---

## 🎯 Current Status

### Phase 3: Complete ✅
- [x] Proactive behavior engine with timer management
- [x] Ignore detection and cooldown system
- [x] Manual trigger support for testing
- [x] Intrusion level configuration
- [x] User interaction tracking
- [x] Accept/ignore statistics
- [x] React StrictMode resilience
- [x] Comprehensive E2E tests
- [x] Storybook stories

### Phase 6: Sprint 2 Complete ✅
- [x] Multi-provider architecture support
- [x] ProviderSelector React component
- [x] Provider switching with conversation preservation
- [x] Model selection and persistence
- [x] localStorage configuration persistence
- [x] SSR compatibility
- [x] Comprehensive integration tests (18/18 passing)
- [x] Complete package documentation
- [x] Migration guide and examples

### Next: Phase 6 - Sprint 3 (Enhanced Accessibility)
- [ ] Enhanced keyboard navigation
- [ ] Screen reader announcements
- [ ] ARIA attributes and roles
- [ ] High contrast mode support
- [ ] Focus management
- [ ] Accessibility testing

---

## 📊 Key Achievements

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Context Gathering | < 200ms | ~50ms | ✅ Excellent |
| E2E Test Suite | < 30s | ~6.9s | ✅ Excellent |
| Package Build | < 60s | ~8s | ✅ Excellent |

### Test Coverage
- **E2E Tests**: 100% passing (60+ tests)
- **Proactive Behavior**: All scenarios covered
- **Streaming Chat**: All edge cases tested
- **Execution Time**: ~6.9s (down from 30s+ timeouts)

### Technical Victories
- ✅ React StrictMode race condition resolved
- ✅ Streaming UI gaps eliminated with flushSync
- ✅ E2E test reliability improved
- ✅ Build system requirements documented
- ✅ Comprehensive diagnostic logging added

---

## 🔧 Development Workflow

### Before Running Tests
```bash
# Always build first
yarn build

# Then run tests
yarn test:e2e
```

### Testing Specific Features
```bash
# Proactive behavior tests
yarn test:e2e --grep "Proactive"

# Streaming tests
yarn test:e2e --grep "Streaming"

# Single test
yarn test:e2e --grep "triggers proactive suggestion manually"
```

### Storybook Development
```bash
# Start Storybook
yarn storybook

# Build Storybook
yarn build-storybook
```

---

## 🏗️ Architecture Highlights

### Package Structure
```
packages/
├── ai/                       # @clippyjs/ai (core)
│   ├── src/
│   │   ├── providers/        # AI provider plugin interface
│   │   ├── context/          # Context gathering system
│   │   ├── proactive/        # Proactive behavior engine
│   │   ├── conversation/     # Conversation management
│   │   ├── personality/      # Personality profiles
│   │   └── react/            # React integration
│   └── tests/e2e/            # E2E tests
│
└── ai-anthropic/             # @clippyjs/ai-anthropic
    └── src/                  # Claude SDK provider
```

### React Integration Pattern
```
AIClippyProvider
├── Lazy State Initialization (useState(() => {...}))
├── useLayoutEffect for Subscriptions
├── flushSync for Immediate UI Updates
└── Proper Cleanup and Resource Management
```

### Proactive Behavior Flow
```
Timer → shouldTrigger() → gatherContext() → analyzeTriggers()
→ triggerSuggestion() → notifyListeners() → UI Update
```

---

## 🐛 Troubleshooting

### Tests Failing?
1. **Run build first**: `yarn build`
2. **Check React StrictMode**: Development has double-mounting
3. **Review logs**: Look for `[ProactiveBehaviorEngine]` and `[AIClippyContext]` messages
4. **Verify versions**: Ensure React 19+ and latest dependencies

### Proactive Behavior Not Working?
1. **Check console logs**: Look for diagnostic messages
2. **Verify listener attachment**: Should see "[AIClippyContext] Listener subscribed"
3. **Test manual trigger**: Use manual trigger button in Storybook
4. **Check configuration**: Ensure `enabled: true` and not in cooldown

### Streaming Issues?
1. **Verify flushSync**: Check useAIChat implementation
2. **Test mock provider**: Rule out API issues
3. **Review selectors**: E2E tests should target correct elements
4. **Check timing**: Adjust waitForTimeout values if needed

---

## 📖 Key Learnings

### React StrictMode Resilience
**Pattern**: Lazy State Initialization + useLayoutEffect
- Use `useState(() => {...})` for synchronous manager creation
- Use `useLayoutEffect` for subscriptions before first paint
- Avoid async initialization patterns that race with double-mounting

### flushSync for Async Coordination
**Pattern**: Force immediate rendering before async work
- Wrap state updates in `flushSync()` before async operations
- Ensures UI updates complete before async work begins
- Critical for streaming and real-time interactions

### E2E Selector Strategies
**Pattern**: Split compound selectors for reliability
- Use `.filter()` for complex targeting
- Split text selectors to avoid whitespace issues
- Target specific descendants with `> selector`

---

## 🤝 Contributing

### Development Guidelines
1. **Test-Driven**: Write tests alongside implementation
2. **StrictMode**: Always develop with StrictMode enabled
3. **Build First**: Run `yarn build` before testing
4. **Document Changes**: Update relevant docs and CHANGELOG
5. **Conventional Commits**: Use semantic commit messages

### Code Review Checklist
- [ ] Tests pass with `yarn build && yarn test:e2e`
- [ ] Works in React StrictMode
- [ ] No console errors or warnings
- [ ] Documentation updated
- [ ] CHANGELOG entry added
- [ ] Storybook stories created/updated (if UI changes)

---

## 📚 Further Reading

### External Resources
- [React 19 Documentation](https://react.dev/)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [Playwright Testing Guide](https://playwright.dev/)
- [Storybook Documentation](https://storybook.js.org/)

### Internal Resources
- [Main Project README](../README.md)
- [Workspace Guide](../WORKSPACE_GUIDE.md)
- [Agent Personalities](../AGENTS.md)

---

## 🔮 Roadmap

### Version 0.4.0 - Phase 4
- Conversation history persistence
- Pre-built modes
- Tool use support
- Vision support

### Version 0.5.0 - Phase 5
- 90%+ test coverage
- Complete API documentation
- Usage examples and tutorials
- Starter templates

### Version 1.0.0 - Production Release
- OpenAI provider support
- Multi-agent coordination
- Voice input/output
- Analytics and tracking

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/clippyjs/clippy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/clippyjs/clippy/discussions)
- **Documentation**: This directory
- **Examples**: `packages/storybook/stories/`

---

**Last Updated**: 2025-11-04
**Current Version**: 0.4.0 (Phase 6 Sprint 2 Complete - Multi-Provider Support)
**Status**: Active Development - Sprint 3 (Accessibility) Starting Soon
