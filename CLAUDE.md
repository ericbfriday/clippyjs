# ClippyJS - Claude Code Context

**Last Updated**: 2025-11-11  
**Version**: 1.0.0 (Phase 6 Sprint 2 Complete)  
**Build System**: Nx 22.0.3 + Yarn 4.9.2

---

## Project Summary

ClippyJS is a modern TypeScript React library bringing AI-powered Clippy agents to web applications. Built as an Nx-powered monorepo with intelligent caching, it provides React components, hooks, and AI integrations for creating nostalgic yet modern assistant experiences.

**Key Technologies**:
- React 19.0.0 (with concurrent features)
- TypeScript 5.7.3 (strict mode)
- Nx 22.0.3 (intelligent build caching)
- Yarn 4.9.2 (Plug'n'Play)
- Vitest 3.0.5 (unit testing)
- Playwright (E2E, integration, visual testing)
- Rollup 4.31.0 (CJS + ESM + UMD builds)

---

## Quick Command Reference

### Nx Commands (Recommended - 20-72% Faster)

```bash
# Build (intelligent caching)
yarn nx:build                    # Build all packages
yarn nx:build:affected           # Build only changed packages
yarn nx run @clippyjs/react:build  # Build specific package

# Test (with caching)
yarn nx:test                     # Test all packages
yarn nx:test:affected            # Test only affected packages
yarn nx run @clippyjs/react:test    # Test specific package

# TypeCheck (with caching)
yarn nx:typecheck                # TypeCheck all packages
yarn nx:typecheck:affected       # TypeCheck affected packages

# Utilities
yarn nx:graph                    # View dependency graph
yarn nx:reset                    # Clear Nx cache
yarn nx show cache-stats         # View cache statistics
```

### Traditional Yarn Commands (Still Supported)

```bash
# Build
yarn build              # Build AI + React (optimized)
yarn build:all          # Build ALL packages (parallel)

# Test
yarn test               # Test @clippyjs/react
yarn test:all           # Test all packages

# Quality
yarn lint               # Lint all packages
yarn typecheck          # TypeScript check

# Clean
yarn clean              # Clean build artifacts
yarn clean:all          # Clean including node_modules
```

### Development Commands

```bash
# Demos
yarn demo               # Vanilla JS demo (http-server)
yarn demo:react         # React demo (Vite dev server)

# Documentation
yarn storybook          # Start Storybook dev server
yarn storybook:build    # Build Storybook static site
```

---

## Workspace Structure

```
clippyjs/
├── packages/
│   ├── types/                   # @clippyjs/types - Shared TypeScript types
│   ├── react/                   # @clippyjs/react - React components & hooks
│   ├── ai/                      # @clippyjs/ai - Core AI integration
│   ├── ai-anthropic/            # @clippyjs/ai-anthropic - Claude provider
│   ├── ai-openai/               # @clippyjs/ai-openai - GPT provider
│   ├── storybook/               # Component documentation
│   ├── clippyjs-lib/            # Legacy library (deprecated)
│   ├── clippyjs-demo-react/     # React demo app
│   ├── clippyjs-demo-vanilla/   # Vanilla JS demo
│   └── templates/
│       ├── nextjs-starter/      # Next.js 15 starter
│       └── vite-starter/        # Vite starter
├── docs/                        # Comprehensive documentation
│   ├── README.md                # Documentation index
│   ├── NX_COMMANDS.md           # Nx command reference
│   ├── NX_ARCHITECTURE.md       # Build system architecture
│   ├── MODES_GUIDE.md           # AI personality modes
│   ├── api-reference/           # API documentation
│   ├── getting-started/         # Tutorial guides
│   ├── examples/                # Code examples
│   └── archive/                 # Historical documentation
├── nx.json                      # Nx workspace configuration
├── tsconfig.base.json           # TypeScript workspace config
└── package.json                 # Root workspace package
```

---

## Package Dependency Graph

```
@clippyjs/types (foundation)
    ↓
@clippyjs/ai (core AI integration)
    ↓
@clippyjs/ai-anthropic, @clippyjs/ai-openai (provider implementations)
    ↓
@clippyjs/react (React components)
    ↓
demos, templates, storybook (development packages)
```

**View Interactive Graph**: `yarn nx:graph`

---

## Development Workflow

### Standard Development Cycle

```bash
# 1. Make changes to any package

# 2. Build only affected packages (Nx handles dependencies)
yarn nx:build:affected

# 3. Test only affected packages
yarn nx:test:affected

# 4. View what's affected (optional)
yarn nx affected --target=build --dry-run

# 5. Full build and test before commit
yarn nx:build
yarn nx:test
```

### Performance Example

```bash
# First build (cache miss)
yarn nx:build                    # 6.5s

# Rebuild without changes (cache hit)
yarn nx:build                    # 1.8s (72% faster!)

# Change only @clippyjs/react
yarn nx:build:affected           # Only builds react + dependents
```

### Testing Workflow

```bash
# Unit tests (fast, with caching)
yarn nx run @clippyjs/react:test

# E2E tests (requires build first)
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration
yarn workspace @clippyjs/react test:visual

# Full test suite
yarn nx:test
```

---

## Key Code Patterns

### React StrictMode Resilience

All React code must handle StrictMode double-mounting:

```typescript
// ✅ Correct: Lazy state initialization
const [manager] = useState(() => new ProactiveBehaviorEngine());

// ✅ Correct: useLayoutEffect for subscriptions
useLayoutEffect(() => {
  const unsubscribe = context.subscribe(listener);
  return () => unsubscribe();
}, []);

// ❌ Wrong: Async initialization (races with double-mount)
useEffect(() => {
  const manager = new ProactiveBehaviorEngine();
  setManager(manager);
}, []);
```

### flushSync for Async Coordination

Use `flushSync` to ensure UI updates complete before async work:

```typescript
import { flushSync } from 'react-dom';

// ✅ Correct: Force rendering before async work
flushSync(() => {
  setMessages(prev => [...prev, newMessage]);
});
await someAsyncOperation();

// ❌ Wrong: UI might not update before async work starts
setMessages(prev => [...prev, newMessage]);
await someAsyncOperation();
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

---

## Testing Guidelines

### Before Running E2E Tests

```bash
# ALWAYS build first - tests use compiled output
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration
```

### Test Organization

- **Unit Tests**: Vitest (`*.test.ts`, `*.test.tsx`)
- **Integration Tests**: Playwright (`tests/integration/*.spec.ts`)
- **Visual Tests**: Playwright (`tests/visual/*.spec.ts`)
- **E2E Tests**: Playwright (`tests/e2e/*.spec.ts`)

### Test Standards

- All tests must pass in React StrictMode
- E2E tests must use proper selectors (split compound selectors, avoid whitespace issues)
- Visual tests must account for timing and animation
- Integration tests must clean up resources

---

## Code Style Standards

### TypeScript

- Strict mode enabled
- Explicit type imports: `import type { Foo } from './types'`
- No `any` types (use `unknown` and type guards)
- Comprehensive JSDoc on public APIs

### React

- Functional components only (no class components)
- Hooks for all state management
- Explicit prop interfaces
- Error boundaries for error handling

### Naming

- **Variables/Functions**: camelCase
- **Components/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case (utils), PascalCase (components)

### Commits

Follow Conventional Commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Test additions/changes
- `refactor:` - Code refactoring

---

## Documentation Structure

### Main Documentation
- **[README.md](./README.md)** - Project overview
- **[AGENTS.md](./AGENTS.md)** - Agent types and command reference
- **[WORKSPACE_GUIDE.md](./WORKSPACE_GUIDE.md)** - Development workflow
- **[WORKSPACE_INDEX.md](./WORKSPACE_INDEX.md)** - Complete reference
- **[PUBLISHING.md](./PUBLISHING.md)** - Publishing workflow
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history

### Technical Docs
- **[docs/README.md](./docs/README.md)** - Documentation index
- **[docs/NX_COMMANDS.md](./docs/NX_COMMANDS.md)** - Nx reference
- **[docs/NX_ARCHITECTURE.md](./docs/NX_ARCHITECTURE.md)** - Build system
- **[docs/MODES_GUIDE.md](./docs/MODES_GUIDE.md)** - Personality modes
- **[docs/api-reference/](./docs/api-reference/)** - API docs
- **[docs/getting-started/](./docs/getting-started/)** - Tutorials
- **[docs/examples/](./docs/examples/)** - Code examples

### Package Documentation
- **[packages/react/README.md](./packages/react/README.md)** - React package
- **[packages/ai/README.md](./packages/ai/README.md)** - AI package
- **[packages/types/README.md](./packages/types/README.md)** - Types package

---

## Common Issues & Solutions

### TypeScript Build Output Directory Issues

**Problem**: TypeScript compiling to `dist/src/` instead of `dist/`

**Root Cause**: Nx `@nx/js:tsc` executor doesn't respect `rootDir` when `tsconfig.base.json` has conflicting settings

**Solution**: Use `nx:run-commands` executor to delegate to yarn workspace commands

```json
// packages/*/project.json
{
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "command": "yarn workspace @clippyjs/[package] build"
      }
    }
  }
}
```

**Key tsconfig.json settings**:
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDeclarationOnly": false
  }
}
```

### TypeScript Project References Validation (TS6305)

**Problem**: "Output file has not been built from source file"

**Solution**:
```bash
# Clean incremental build cache
rm -f tsconfig.tsbuildinfo

# Build dependency without cache
yarn nx run @clippyjs/types:build --skip-nx-cache

# Then build dependent package
yarn nx run @clippyjs/react:build
```

### Storybook Yarn PnP Resolution Issues

**Problem**: `Cannot find module '@storybook/react-vite/preset'`

**Known Issue**: Yarn PnP module resolution with Storybook packages

**Workaround**: Use React demo for testing and screenshots
```bash
yarn demo:react  # http://localhost:5173
```

### Screenshot Capture

**Methods**:
1. **Chrome DevTools MCP** (recommended): Use MCP tools for programmatic capture
2. **TypeScript Script**: `scripts/capture-screenshots.ts` with Playwright
3. **Manual**: Browser DevTools or OS screenshot tools

**See**: [SCREENSHOTS.md](./docs/SCREENSHOTS.md) for complete guide

### Nx Cache Not Working

```bash
# Clear cache and rebuild
yarn nx:reset
yarn nx:build
```

### Build Failures

```bash
# Clean and rebuild
yarn clean
yarn nx:build
```

### "Cannot find module" Errors

```bash
# Reinstall and rebuild
yarn install
yarn nx:build
```

### Tests Failing

```bash
# Build before running E2E tests
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration
```

### TypeScript Errors

```bash
# Check all packages
yarn nx:typecheck

# Check specific package
yarn nx run @clippyjs/react:typecheck
```

**For detailed troubleshooting**, see:
- [NX_COMMANDS.md](./docs/NX_COMMANDS.md#troubleshooting)
- [WORKSPACE_GUIDE.md](./WORKSPACE_GUIDE.md#troubleshooting)

---

## Current Status (Phase 6 Sprint 2)

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

### 📊 Performance Metrics
- **Build Performance**: 20-72% faster with Nx caching
- **Cold Build**: 5.2s (down from 6.5s)
- **Cached Build**: 1.8s (72% faster!)
- **E2E Tests**: ~6.9s (100% passing)
- **Test Coverage**: >90% on core packages

---

## AI Integration Features

### Supported Providers
- **Anthropic Claude**: claude-3-5-sonnet-20241022, claude-3-opus-20240229
- **OpenAI GPT**: gpt-4o, gpt-4-turbo
- **Custom**: Extend `BaseAIProvider` for additional providers

### AI Capabilities
- Streaming chat responses with progress
- Conversation history management
- Context-aware suggestions
- Proactive behavior triggers
- Personality mode adaptation
- Provider/model switching
- Tool use support (future)
- Vision support (future)

### Configuration

```typescript
const config: AIClippyConfig = {
  providers: [
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      models: ['claude-3-5-sonnet-20241022'],
      instance: anthropicProvider,
    },
  ],
  defaultProvider: 'anthropic',
  agentName: 'Clippy',
  personalityMode: 'helpful',
  proactiveConfig: {
    enabled: true,
    intervalMs: 120000,
    intrusionLevel: 'medium',
  },
};
```

---

## Useful Nx Features

### Visualize Dependencies
```bash
yarn nx:graph
```

### See Affected Projects
```bash
yarn nx affected --target=build --dry-run
```

### Cache Statistics
```bash
yarn nx show cache-stats
```

### Clear Cache
```bash
yarn nx:reset
```

### Run Specific Target
```bash
yarn nx run @clippyjs/react:build
yarn nx run @clippyjs/react:test
yarn nx run @clippyjs/react:typecheck
```

---

## Publishing Workflow

### Pre-Publish Checklist
- [ ] All tests passing: `yarn nx:test`
- [ ] TypeScript clean: `yarn nx:typecheck`
- [ ] Linting passes: `yarn lint`
- [ ] Version bumped: `yarn version:patch|minor|major`
- [ ] CHANGELOG.md updated
- [ ] Documentation updated

### Publish Commands
```bash
# Build everything
yarn nx:build

# Publish specific package
yarn publish:react
yarn publish:ai
yarn publish:ai-anthropic
yarn publish:ai-openai

# Or publish all
yarn publish:all
```

---

## Resources

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

**Workspace Version**: 1.0.0  
**Last Updated**: 2025-11-11  
**Maintainer**: Eric Friday  
**License**: MIT
