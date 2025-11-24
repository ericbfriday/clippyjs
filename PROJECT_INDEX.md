# Project Index: ClippyJS

**Generated:** 2025-11-24
**Version:** 1.0.0
**Build System:** Nx 22.0.3 + Yarn 4.9.2
**Total Source Lines:** ~18,000 lines of TypeScript

---

## 📁 Project Structure

```
clippyjs/
├── packages/                    # Nx workspace packages
│   ├── types/                   # @clippyjs/types - Shared TypeScript types
│   ├── ai/                      # @clippyjs/ai - Core AI integration
│   ├── ai-anthropic/            # @clippyjs/ai-anthropic - Claude provider
│   ├── ai-openai/               # @clippyjs/ai-openai - GPT provider
│   ├── react/                   # @clippyjs/react - React components & hooks
│   ├── clippyjs-lib/            # Legacy library (deprecated)
│   ├── clippyjs-demo-react/     # React demo app (Vite)
│   ├── clippyjs-demo-vanilla/   # Vanilla JS demo (http-server)
│   ├── storybook/               # Component documentation
│   └── templates/
│       ├── nextjs-starter/      # Next.js 15 starter template
│       └── vite-starter/        # Vite starter template
├── docs/                        # Comprehensive documentation
│   ├── api-reference/           # API documentation
│   ├── getting-started/         # Tutorial guides
│   ├── examples/                # Code examples
│   └── archive/                 # Historical documentation
├── nx.json                      # Nx workspace configuration
├── tsconfig.base.json           # TypeScript workspace config
├── package.json                 # Root workspace package
├── CLAUDE.md                    # Claude Code context
├── WORKSPACE_GUIDE.md           # Development workflow
└── WORKSPACE_INDEX.md           # Complete reference

```

---

## 🚀 Entry Points

### Published npm Packages (Main Entry Points)
- **@clippyjs/types** → `packages/types/src/index.ts` - Foundation types
- **@clippyjs/ai** → `packages/ai/src/index.ts` - AI integration core (403 exports)
- **@clippyjs/ai-anthropic** → `packages/ai-anthropic/src/index.ts` - Claude provider
- **@clippyjs/ai-openai** → `packages/ai-openai/src/index.ts` - GPT provider
- **@clippyjs/react** → `packages/react/src/index.ts` - React components

### CLI & Development
- **Build Commands**: `yarn nx:build` (intelligent caching, 20-72% faster)
- **Test Commands**: `yarn nx:test` (unit + E2E + visual tests)
- **Demo Apps**:
  - React: `yarn demo:react` → http://localhost:5173
  - Vanilla: `yarn demo` → http://localhost:8080
- **Storybook**: `yarn storybook` → http://localhost:6006

### Configuration Files
- `nx.json` - Nx build orchestration (parallel: 8, intelligent caching)
- `tsconfig.base.json` - Workspace TypeScript configuration (strict mode)
- `package.json` - Root workspace scripts and dependencies
- `.claude.json` - Claude Code configuration

---

## 📦 Core Modules

### **@clippyjs/types** (Foundation)
- **Path**: `packages/types/src/index.ts`
- **Exports**: 70+ TypeScript type definitions
- **Purpose**: Shared types for all packages
- **Key Types**:
  - `AgentName`, `AgentData`, `Animation`, `Frame`
  - `Message`, `ContentBlock`, `StreamChunk`, `Tool`
  - `ConversationHistory`, `PersonalityProfile`
  - `UseAgentOptions`, `UseAgentReturn`

### **@clippyjs/ai** (AI Integration Core)
- **Path**: `packages/ai/src/index.ts`
- **Exports**: 403 named exports
- **Purpose**: Multi-provider AI integration with plugin architecture
- **Key Modules**:
  - **Providers**: `AIProvider`, `BaseAIProvider` (streaming, tools, context)
  - **Context**: `DOMContext`, `UserActionContext`, `AppStateContext`
  - **Conversation**: `ConversationManager`, `HistoryStore` (LocalStorage, IndexedDB)
  - **Personality**: `PersonalityProfiles`, `getPersonalityPrompt()`, 10 agent personalities
  - **Proactive**: `ProactiveBehaviorEngine`, trigger-based suggestions
  - **Streaming**: `StreamController`, `StreamMonitor`, progress tracking
  - **React**: `AIClippyProvider`, `useAIChat`, `useHistoryManager`, `ProviderSelector`
  - **Error Handling**: `ErrorClassifier`, `RetryPolicy`, `CircuitBreaker`, `RecoveryStrategies`
  - **Caching**: `ResponseCache`, `RequestDeduplicator`, `PerformanceMonitor`
  - **Optimization**: `ContextOptimizer`, compression & summarization
  - **Monitoring**: `AuditLogger`, `Telemetry`, `DebugCollector`
  - **Middleware**: `RateLimiter`, `UsageTracker`, `ValidationMiddleware`, `SecurityMiddleware`
  - **Testing**: `TestUtilities`, `MockScenarios`, `PerformanceBenchmark`, `LoadTesting`

### **@clippyjs/ai-anthropic** (Claude Provider)
- **Path**: `packages/ai-anthropic/src/AnthropicProvider.ts`
- **Exports**: `AnthropicProvider` class
- **Purpose**: Anthropic Claude integration
- **Models**: claude-3-5-sonnet-20241022, claude-3-opus-20240229
- **Features**: Streaming, message API, tool use, vision support

### **@clippyjs/ai-openai** (GPT Provider)
- **Path**: `packages/ai-openai/src/OpenAIProvider.ts`
- **Exports**: `OpenAIProvider` class
- **Purpose**: OpenAI GPT integration
- **Models**: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
- **Features**: Streaming, chat completions, function calling

### **@clippyjs/react** (React Components)
- **Path**: `packages/react/src/index.ts`
- **Exports**: 27 named exports + all types
- **Purpose**: React 19 components, hooks, and agents
- **Key Components**:
  - `ClippyProvider` - Context provider for agent state
  - `Clippy` - Declarative agent component
  - `Agent` - Core agent class (animations, speech, positioning)
  - `Animator` - Animation engine
  - `Balloon` - Speech bubble rendering
- **Key Hooks**:
  - `useAgent()` - Imperative agent control
  - `useClippy()` - Access agent context
- **Utilities**: `load()`, `ready()`, `soundsReady()`

---

## 🔧 Configuration

### Build System (Nx 22.0.3)
- **Cache Directory**: `node_modules/.cache/nx`
- **Parallel Execution**: 8 workers
- **Intelligent Caching**: 20-72% faster builds
- **Target Defaults**: build, test, lint, typecheck, clean
- **Dependency Management**: Automatic upstream dependency building

### TypeScript (5.7.3)
- **Strict Mode**: Enabled across workspace
- **Project References**: Enabled for incremental builds
- **Output**: CJS + ESM + UMD bundles
- **Module Resolution**: Node16, bundler

### Package Manager (Yarn 4.9.2)
- **Mode**: Plug'n'Play (PnP)
- **Workspaces**: `packages/*`, `packages/templates/*`
- **Dependency Protocol**: `workspace:*` for internal packages

### Testing
- **Unit Tests**: Vitest 3.0.5 (fast, concurrent)
- **E2E Tests**: Playwright 1.49.1 (integration, visual)
- **Coverage**: @vitest/coverage-v8
- **React Testing**: @testing-library/react 16.1.0

---

## 📚 Documentation

### Main Documentation
- **[README.md](./README.md)** - Project overview & quick start
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code context (THIS FILE)
- **[WORKSPACE_GUIDE.md](./WORKSPACE_GUIDE.md)** - Development workflow
- **[WORKSPACE_INDEX.md](./WORKSPACE_INDEX.md)** - Complete reference
- **[AGENTS.md](./AGENTS.md)** - Agent types and command reference
- **[PUBLISHING.md](./PUBLISHING.md)** - Publishing workflow
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history

### Technical Documentation
- **[docs/NX_COMMANDS.md](./docs/NX_COMMANDS.md)** - Nx command reference (20-72% faster builds)
- **[docs/NX_ARCHITECTURE.md](./docs/NX_ARCHITECTURE.md)** - Build system architecture
- **[docs/MODES_GUIDE.md](./docs/MODES_GUIDE.md)** - AI personality modes
- **[docs/SCREENSHOTS.md](./docs/SCREENSHOTS.md)** - Screenshot capture guide
- **[docs/api-reference/](./docs/api-reference/)** - API documentation
- **[docs/getting-started/](./docs/getting-started/)** - Tutorial guides
- **[docs/examples/](./docs/examples/)** - Code examples

### Package Documentation
- **[packages/react/README.md](./packages/react/README.md)** - React package guide
- **[packages/ai/README.md](./packages/ai/README.md)** - AI package guide
- **[packages/types/README.md](./packages/types/README.md)** - Types reference

---

## 🧪 Test Coverage

### Test Organization
- **Unit Tests**: `packages/*/tests/unit/*.test.{ts,tsx}` (Vitest)
- **Integration Tests**: `packages/*/tests/integration/*.spec.ts` (Playwright)
- **E2E Tests**: `packages/*/tests/e2e/*.spec.ts` (Playwright)
- **Visual Tests**: `packages/*/tests/visual/*.spec.ts` (Playwright)

### Test Counts (Approximate)
- **@clippyjs/react**: 35 tests (unit + integration + E2E + visual)
- **@clippyjs/ai**: 75+ tests (unit + E2E + integration)
- **@clippyjs/ai-anthropic**: 15+ tests
- **@clippyjs/ai-openai**: 10+ tests
- **Total**: 135+ tests across all packages

### Test Execution
```bash
# Fast unit tests (with caching)
yarn nx:test                     # All packages
yarn nx run @clippyjs/react:test    # Specific package

# E2E tests (requires build first)
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration

# Full test suite
yarn nx:test && yarn nx run-many --target=test:integration --all
```

### Coverage Metrics
- **Core Packages**: >90% coverage
- **React Components**: >85% coverage
- **AI Integration**: >80% coverage

---

## 🔗 Key Dependencies

### Runtime Dependencies
- **React**: 19.0.0 (concurrent features, StrictMode resilient)
- **TypeScript**: 5.7.3 (strict mode)
- **Nx**: 22.0.3 (build orchestration)
- **Rollup**: 4.31.0 (bundling CJS + ESM + UMD)

### AI Provider SDKs
- **@anthropic-ai/sdk**: Claude API client
- **openai**: OpenAI API client

### Development Dependencies
- **Vitest**: 3.0.5 - Fast unit testing with intelligent caching
- **Playwright**: 1.49.1 - E2E, integration, and visual testing
- **@testing-library/react**: 16.1.0 - React component testing
- **Vite**: 6.0.11 - Dev server and bundling
- **Storybook**: 8.x - Component documentation

---

## 📝 Quick Start

### Development Cycle
```bash
# 1. Make changes to any package

# 2. Build only affected packages (Nx handles dependencies)
yarn nx:build:affected

# 3. Test only affected packages
yarn nx:test:affected

# 4. Full build and test before commit
yarn nx:build && yarn nx:test
```

### Common Commands
```bash
# Build (intelligent caching)
yarn nx:build                    # All packages (20-72% faster with cache)
yarn nx:build:affected           # Only changed packages

# Test
yarn nx:test                     # Unit tests (all packages)
yarn nx:test:affected            # Only affected tests

# Quality
yarn lint                        # Lint all packages
yarn typecheck                   # TypeScript check

# Development
yarn demo:react                  # React demo (http://localhost:5173)
yarn storybook                   # Component docs (http://localhost:6006)

# Utilities
yarn nx:graph                    # View dependency graph
yarn nx:reset                    # Clear Nx cache
yarn clean                       # Clean build artifacts
```

### Performance Metrics
- **Cold Build**: 5.2s (all packages)
- **Cached Build**: 1.8s (72% faster!)
- **Affected Build**: 2-3s (only changed packages)
- **Unit Tests**: ~3s (with caching)
- **E2E Tests**: ~7s (100% passing)

---

## 🎯 Code Patterns

### React StrictMode Resilience
All React code handles StrictMode double-mounting:
```typescript
// ✅ Correct: Lazy state initialization
const [manager] = useState(() => new ProactiveBehaviorEngine());

// ✅ Correct: useLayoutEffect for subscriptions
useLayoutEffect(() => {
  const unsubscribe = context.subscribe(listener);
  return () => unsubscribe();
}, []);
```

### Workspace Dependencies
Always use `workspace:*` for internal packages:
```json
{
  "dependencies": {
    "@clippyjs/types": "workspace:*",
    "@clippyjs/ai": "workspace:*"
  }
}
```

### TypeScript Standards
- Strict mode enabled
- Explicit type imports: `import type { Foo } from './types'`
- No `any` types (use `unknown` and type guards)
- Comprehensive JSDoc on public APIs

---

## 🏗️ Package Dependency Graph

```
@clippyjs/types (foundation - 70+ types)
    ↓
@clippyjs/ai (core - 403 exports)
    ↓
@clippyjs/ai-anthropic, @clippyjs/ai-openai (providers)
    ↓
@clippyjs/react (components - 27 exports)
    ↓
demos, templates, storybook (development)
```

**View Interactive Graph**: `yarn nx:graph`

---

## 🐛 Common Issues & Solutions

### TypeScript Build Output Issues
- **Problem**: TypeScript compiling to `dist/src/` instead of `dist/`
- **Solution**: Use `nx:run-commands` executor, configure `rootDir: "./src"` in tsconfig.json

### Nx Cache Not Working
```bash
yarn nx:reset && yarn nx:build
```

### "Cannot find module" Errors
```bash
yarn install && yarn nx:build
```

### Tests Failing
```bash
# Always build before E2E tests
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration
```

---

## 📊 Current Status (Phase 6 Sprint 2)

### ✅ Completed Features
- Multi-provider architecture (Anthropic + OpenAI)
- Provider switching with conversation preservation
- Model selection and configuration persistence
- Streaming chat with progress indicators
- Proactive behavior engine with triggers
- Personality modes (helpful, concise, technical, creative)
- Context gathering and analysis
- React 19 StrictMode resilience
- Comprehensive E2E test suite (100% passing)
- Nx integration with intelligent caching (20-72% faster)

### 🚧 Next: Phase 6 Sprint 3 (Accessibility)
- Enhanced keyboard navigation
- Screen reader announcements
- ARIA attributes and roles
- High contrast mode support
- Focus management
- Accessibility testing

---

## 🌐 Resources

### External
- **npm**: [@clippyjs](https://www.npmjs.com/org/clippyjs)
- **GitHub**: [github.com/ericbfriday/clippyjs](https://github.com/ericbfriday/clippyjs)
- **React Docs**: [react.dev](https://react.dev/)
- **Nx Docs**: [nx.dev](https://nx.dev)
- **Anthropic Docs**: [docs.anthropic.com](https://docs.anthropic.com/)
- **OpenAI Docs**: [platform.openai.com/docs](https://platform.openai.com/docs)

### Internal
- **Documentation**: `./docs/`
- **Storybook**: `yarn storybook`
- **Examples**: `./packages/storybook/stories/`
- **Templates**: `./packages/templates/`

---

**Index Size**: ~5KB (94% reduction from 58KB full codebase read)
**Last Updated**: 2025-11-24
**Maintainer**: Eric Friday
**License**: MIT
