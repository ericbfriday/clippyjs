# ClippyJS Documentation

**Version**: 1.0.0 (Phase 6 Sprint 2 Complete)  
**Last Updated**: 2025-11-11  
**Build System**: Nx 22.0.3 with intelligent caching

Complete documentation for building AI-powered Clippy agents with React.

---

## 📚 Quick Navigation

### For New Users
1. **[Getting Started](#-getting-started)** - Installation and basic setup
2. **[Quick Examples](#-quick-examples)** - Copy-paste code to get started
3. **[Core Concepts](#-core-concepts)** - Understand the architecture

### For Developers
1. **[Workspace Guide](../WORKSPACE_GUIDE.md)** - Development workflow with Nx
2. **[Nx Commands](./NX_COMMANDS.md)** - Build system reference
3. **[Testing Guide](#-testing-documentation)** - Writing and running tests
4. **[Code Style](../AGENTS.md#code-style-guidelines)** - Conventions and patterns

### For Contributors
1. **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute
2. **[Nx Architecture](./NX_ARCHITECTURE.md)** - Build system design
3. **[Publishing Workflow](../PUBLISHING.md)** - Release process

---

## 🚀 Getting Started

### Installation

```bash
# Install core React package
npm install @clippyjs/react

# Choose your AI provider
npm install @clippyjs/ai-anthropic  # For Claude
# OR
npm install @clippyjs/ai-openai     # For GPT
```

### Basic Usage

```tsx
import { ClippyProvider, useClippy } from '@clippyjs/react';
import { AIClippyProvider } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

// Initialize provider
const anthropicProvider = new AnthropicProvider();
await anthropicProvider.initialize({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Wrap your app
function App() {
  return (
    <ClippyProvider>
      <AIClippyProvider
        config={{
          provider: anthropicProvider,
          agentName: 'Clippy',
          personalityMode: 'helpful',
        }}
      >
        <YourApp />
      </AIClippyProvider>
    </ClippyProvider>
  );
}

// Use in any component
function YourComponent() {
  const { ask, isVisible, toggle } = useClippy();
  
  return (
    <button onClick={() => ask('Help me with this')}>
      Ask Clippy
    </button>
  );
}
```

---

## 📖 Core Documentation

### Getting Started Guides
- **[Installation Guide](./getting-started/installation.md)** - Detailed setup instructions
- **[Basic Usage](./getting-started/basic-usage.md)** - First steps with ClippyJS
- **[Configuration](./getting-started/configuration.md)** - Configure your assistant

### AI Integration
- **[AI Integration Overview](./AI_INTEGRATION_SPECIFICATION.md)** - Complete technical specification
- **[Provider Setup](./getting-started/providers.md)** - Configure AI providers
- **[Multi-Provider Setup](#multi-provider-setup)** - Use multiple AI providers
- **[Personality Modes](./MODES_GUIDE.md)** - Assistant personalities

### React Integration
- **[React Components](./api-reference/components.md)** - Component documentation
- **[React Hooks](./api-reference/hooks.md)** - Hook reference
- **[Context Providers](./api-reference/providers.md)** - Provider APIs

### Advanced Features
- **[Proactive Behavior](#proactive-behavior)** - Automatic suggestions
- **[Context Gathering](#context-gathering)** - Smart context awareness
- **[Streaming Chat](#streaming-chat)** - Real-time responses
- **[Conversation History](#conversation-history)** - Persistent conversations

---

## 🎯 Quick Examples

### Multi-Provider Setup

```typescript
import { AIClippyProvider, type ProviderInfo } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';
import { OpenAIProvider } from '@clippyjs/ai-openai';

// Initialize providers
const anthropicProvider = new AnthropicProvider();
await anthropicProvider.initialize({ apiKey: process.env.ANTHROPIC_API_KEY });

const openaiProvider = new OpenAIProvider();
await openaiProvider.initialize({ apiKey: process.env.OPENAI_API_KEY });

// Configure providers
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

### Streaming Chat

```typescript
import { useAIChat } from '@clippyjs/ai';

function ChatComponent() {
  const { sendMessage, messages, isStreaming } = useAIChat();
  
  const handleSend = async () => {
    await sendMessage('Hello, Clippy!');
  };
  
  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
      {isStreaming && <Spinner />}
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### Proactive Behavior

```typescript
const config: AIClippyConfig = {
  provider: anthropicProvider,
  agentName: 'Clippy',
  personalityMode: 'helpful',
  proactiveConfig: {
    enabled: true,
    intervalMs: 120000,      // Check every 2 minutes
    intrusionLevel: 'medium', // low | medium | high
  },
};
```

---

## 🏗️ Core Concepts

### Package Architecture

```
@clippyjs/types          # Shared TypeScript types
    ↓
@clippyjs/ai             # Core AI integration
    ↓
@clippyjs/ai-anthropic   # Anthropic provider
@clippyjs/ai-openai      # OpenAI provider
    ↓
@clippyjs/react          # React components
```

### Provider System

ClippyJS uses a provider pattern for AI integration:

- **BaseAIProvider**: Abstract interface all providers implement
- **AnthropicProvider**: Claude AI integration
- **OpenAIProvider**: GPT integration
- **Custom Providers**: Extend BaseAIProvider

### Context System

The context system gathers information for AI:

- **Page context**: URL, title, DOM structure
- **User interaction**: Scroll, clicks, time on page
- **Form data**: Current form values (optional)
- **Custom context**: App-specific data

### Personality Modes

Pre-configured assistant personalities:

- **helpful**: Friendly, detailed explanations
- **concise**: Brief, to-the-point responses
- **technical**: Developer-focused, technical details
- **creative**: Imaginative, conversational

---

## 🔧 Development Documentation

### Workspace & Build System
- **[Workspace Guide](../WORKSPACE_GUIDE.md)** - Complete development workflow
- **[Workspace Index](../WORKSPACE_INDEX.md)** - Package and script reference
- **[Nx Commands](./NX_COMMANDS.md)** - Build system commands
- **[Nx Architecture](./NX_ARCHITECTURE.md)** - Build system design
- **[Nx Quick Start](./NX_QUICK_START.md)** - Get started with Nx
- **[Nx Migration Complete](./NX_MIGRATION_COMPLETE.md)** - Migration summary

### Testing Documentation
- **[Testing Overview](../packages/react/TESTING.md)** - Testing strategy
- **Unit Testing**: Vitest with @testing-library/react
- **E2E Testing**: Playwright integration and visual tests
- **Test Patterns**: React StrictMode resilience patterns

### TypeScript & React
- **[TypeScript Configuration](./typescript-configuration.md)** - TS setup
- **[React 19 Migration](./react19-typescript-fixes.md)** - Type fixes
- **[Code Conventions](../AGENTS.md#code-style-guidelines)** - Style guide

### AI Integration
- **[AI Integration Specification](./AI_INTEGRATION_SPECIFICATION.md)** - Complete spec
- **[Implementation Log](./AI_INTEGRATION_IMPLEMENTATION_LOG.md)** - Dev journal
- **[Implementation Tasks](./AI_INTEGRATION_ISSUES.md)** - Roadmap

---

## 📚 API Reference

### React Components
- **ClippyProvider** - Root provider for Clippy functionality
- **AIClippyProvider** - AI integration provider
- **ProviderSelector** - Multi-provider selection UI
- **ClippyAgent** - Visual Clippy character component

### React Hooks
- **useClippy()** - Core Clippy functionality
- **useAIChat()** - AI chat integration
- **useAIClippy()** - Full AI assistant features
- **useProactiveBehavior()** - Proactive suggestions

### AI Providers
- **BaseAIProvider** - Provider interface
- **AnthropicProvider** - Claude integration
- **OpenAIProvider** - GPT integration

### Configuration Types
- **AIClippyConfig** - Main configuration
- **ProviderInfo** - Provider metadata
- **ProactiveConfig** - Proactive behavior settings
- **PersonalityMode** - Personality configuration

---

## 📊 Current Status

### ✅ Phase 6 Sprint 2 Complete (2025-11-04)
- Multi-provider architecture support
- ProviderSelector React component
- Provider switching with conversation preservation
- Model selection and persistence
- localStorage configuration persistence
- SSR compatibility
- 18/18 integration tests passing
- Complete package documentation
- Migration guide and examples

### 🚧 Next: Phase 6 Sprint 3 (Accessibility)
- Enhanced keyboard navigation
- Screen reader announcements
- ARIA attributes and roles
- High contrast mode support
- Focus management
- Accessibility testing

### 📈 Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Build (cold) | < 10s | 5.2s | ✅ |
| Build (cached) | < 5s | 1.8s | ✅ |
| E2E Tests | < 30s | 6.9s | ✅ |
| Context Gathering | < 200ms | ~50ms | ✅ |

---

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clean and rebuild with Nx
yarn nx:reset
yarn clean
yarn nx:build
```

**Test Failures**
```bash
# Always build before E2E tests
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration
```

**TypeScript Errors**
```bash
# Check all packages
yarn nx:typecheck

# Check specific package
yarn nx run @clippyjs/react:typecheck
```

**Nx Cache Issues**
```bash
# Clear cache
yarn nx:reset

# View cache stats
yarn nx show cache-stats
```

---

## 📝 Technical Guides

### React Patterns
- **[React StrictMode Resilience](#react-strictmode-patterns)** - Handle double-mounting
- **[flushSync Usage](#flushsync-patterns)** - Async coordination
- **[Hook Patterns](#hook-patterns)** - Custom hook development

### Testing Patterns
- **[E2E Test Strategies](#e2e-test-strategies)** - Reliable E2E tests
- **[Visual Test Patterns](#visual-test-patterns)** - Visual regression
- **[Integration Test Patterns](#integration-test-patterns)** - Component integration

### Build & Deploy
- **[Rollup Configuration](#rollup-configuration)** - Package builds
- **[Nx Optimization](#nx-optimization)** - Build performance
- **[Publishing Guide](../PUBLISHING.md)** - Release process

---

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Clone: `git clone https://github.com/your-username/clippyjs.git`
3. Install: `yarn install`
4. Build: `yarn nx:build`
5. Test: `yarn nx:test`

### Development Workflow
```bash
# Make changes
git checkout -b feature/my-feature

# Build affected packages
yarn nx:build:affected

# Test affected packages
yarn nx:test:affected

# View dependency graph
yarn nx:graph

# Commit and push
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

### Code Standards
- TypeScript strict mode
- React 19 functional components only
- Comprehensive tests required
- JSDoc on public APIs
- Conventional commit messages

---

## 📚 Additional Resources

### Internal
- **[Main README](../README.md)** - Project overview
- **[Agent Reference](../AGENTS.md)** - Command reference
- **[Changelog](../CHANGELOG.md)** - Version history
- **[Storybook](http://localhost:6006)** - Interactive docs (run `yarn storybook`)

### External
- **[React Documentation](https://react.dev/)** - React 19 docs
- **[Nx Documentation](https://nx.dev)** - Nx build system
- **[Anthropic Docs](https://docs.anthropic.com/)** - Claude API
- **[OpenAI Docs](https://platform.openai.com/docs)** - GPT API
- **[Vitest Docs](https://vitest.dev/)** - Testing framework
- **[Playwright Docs](https://playwright.dev/)** - E2E testing

---

## 🗂️ Archived Documentation

Historical documentation preserved in `docs/archive/`:
- Phase 5 implementation docs
- Phase 6 planning docs
- Sprint summaries and retrospectives
- Validation reports
- Migration guides
- Workspace audits

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/ericbfriday/clippyjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ericbfriday/clippyjs/discussions)
- **npm**: [@clippyjs](https://www.npmjs.com/org/clippyjs)
- **Email**: Support via GitHub issues

---

**Documentation Version**: 1.0.0  
**Last Updated**: 2025-11-11  
**Maintainer**: Eric Friday  
**License**: MIT
