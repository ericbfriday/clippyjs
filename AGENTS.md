# AGENTS.md

## Project Overview

Modern TypeScript React library for adding AI-powered Clippy agents to websites. This is a modern rewrite of the classic `Clippy.js` library in TypeScript, with React implementation and AI integration capabilities.

**Architecture**: Nx-powered monorepo with packages:
- **@clippyjs/types**: Shared TypeScript types and interfaces
- **@clippyjs/react**: React components and hooks for Clippy agents
- **@clippyjs/ai**: Core AI integration abstractions
- **@clippyjs/ai-anthropic**: Claude AI provider integration
- **@clippyjs/ai-openai**: OpenAI GPT provider integration
- **@clippyjs/storybook**: Component development and documentation
- **clippyjs-lib** (legacy): Deprecated - use @clippyjs/react instead

**Build System**: 
- **Primary**: Nx 22.0.3 with intelligent caching (20-72% faster builds)
- **Traditional**: Rollup 4.31.0 (ESM, CommonJS, UMD outputs)
- **Package Manager**: Yarn 4.9.2 with Plug'n'Play

**Testing**: 
- Vitest 3.0.5 for unit tests
- Playwright for E2E, integration, and visual regression testing

## Build/Lint/Test Commands

### Nx Commands (Recommended - Intelligent Caching)

#### Build Commands
```bash
# Build all packages with caching (72% faster on cache hit)
yarn nx:build

# Build only changed packages and dependencies
yarn nx:build:affected

# Build specific package
yarn nx run @clippyjs/react:build
yarn nx run @clippyjs/ai:build
yarn nx run @clippyjs/types:build
```

#### Test Commands
```bash
# Test all packages with caching
yarn nx:test

# Test only affected packages
yarn nx:test:affected

# Test specific package
yarn nx run @clippyjs/react:test
yarn nx run @clippyjs/ai:test
```

#### TypeCheck Commands
```bash
# TypeCheck all packages with caching
yarn nx:typecheck

# TypeCheck only affected packages
yarn nx:typecheck:affected

# TypeCheck specific package
yarn nx run @clippyjs/react:typecheck
```

#### Utility Commands
```bash
# View interactive dependency graph
yarn nx:graph

# Show affected projects
yarn nx affected --target=build --dry-run

# Clear Nx cache
yarn nx:reset

# View Nx cache statistics
yarn nx show cache-stats
```

### Traditional Yarn Commands (Still Supported)

#### Build Commands
```bash
# Build AI packages + React (optimized)
yarn build

# Build ALL packages (parallel)
yarn build:all

# Build specific packages
yarn build:ai
yarn build:ai-anthropic
yarn build:ai-openai
yarn build:react
yarn build:types
```

#### Demo Commands
```bash
# Browser demo (vanilla JS)
yarn demo

# React demo (Vite dev server)
yarn demo:react

# Component documentation
yarn storybook
yarn storybook:build
```

#### Test Commands
```bash
# Test @clippyjs/react
yarn test

# Test all packages
yarn test:all

# Test specific package
yarn workspace @clippyjs/react test
yarn workspace @clippyjs/ai test

# Test with coverage
yarn workspace @clippyjs/react test:coverage

# Integration and visual tests
yarn workspace @clippyjs/react test:integration
yarn workspace @clippyjs/react test:visual
```

#### Quality Commands
```bash
# Lint all packages
yarn lint

# TypeScript type checking
yarn typecheck
yarn typecheck:watch
```

#### Clean Commands
```bash
# Clean build artifacts
yarn clean

# Clean everything including node_modules
yarn clean:all
```

## Performance Benefits (Nx)

### Build Performance
- **Cold build**: 6.5s → 5.2s (20% faster)
- **Cached build**: 6.5s → 1.8s (72% faster, 3x speedup!)
- **Affected builds**: Only builds changed packages

### Real-World Workflow
```bash
# First build (cache miss)
yarn nx:build              # 6.5s

# Rebuild without changes (cache hit)
yarn nx:build              # 1.8s (72% faster!)

# Change only @clippyjs/react
yarn nx:build:affected     # Only builds react + dependents
```

## Code Style Guidelines

### TypeScript Standards
- **Strict Mode**: TypeScript strict mode enabled
- **Target**: ES2020
- **JSX Transform**: react-jsx
- **Type Imports**: Use explicit `type` imports for types only
- **All code must be TypeScript**: No JavaScript files in source

### React Standards
- **Version**: React 19.0.0 with concurrent features
- **Components**: Functional components with hooks only, no class components
- **State Management**: Use hooks (useState, useEffect, useContext, etc.)
- **Props**: Explicit interface definitions for all component props
- **StrictMode**: All code must be resilient to React.StrictMode double-mounting

### Naming Conventions
- **Variables/Functions**: camelCase
- **Components/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case for utilities, PascalCase for components

### Testing Standards
- **Unit Tests**: Vitest with @testing-library/react
- **E2E Tests**: Playwright for end-to-end scenarios
- **Visual Tests**: Playwright for visual regression testing
- **Coverage**: Maintain high test coverage for public APIs
- **Build First**: Always run `yarn build` before E2E tests

### Error Handling
- **Try-Catch**: Proper error typing, avoid `any`
- **React**: Use Error Boundaries for component-level error handling
- **Async**: Proper promise rejection handling

### Documentation
- **JSDoc**: Required on all public exports
- **Interfaces**: Clear documentation of purpose and usage
- **Examples**: Provide usage examples for complex APIs
- **Inline Comments**: Explain complex logic and business rules

### Workspace Management
- **Dependencies**: Use workspace references (`workspace:*`) for internal packages
- **Commits**: Clear, descriptive commit messages (Conventional Commits)
- **Linting**: Run linter before committing changes
- **Nx Cache**: Leverage Nx caching for faster development cycles

## Available Agents

The library includes these nostalgic agents:
- Clippy (default) - The iconic paperclip assistant
- Bonzi - The purple gorilla
- Rover - The friendly dog
- Merlin - The wise wizard
- And other classic assistants

## AI Integration

The library supports AI-powered agents through provider packages:
- **Anthropic**: Claude integration via @clippyjs/ai-anthropic
- **OpenAI**: GPT integration via @clippyjs/ai-openai
- **Multi-Provider**: Support for multiple AI providers simultaneously
- **Custom**: Extend BaseAIProvider for custom providers

### AI Features
- Streaming chat responses
- Conversation history management
- Proactive behavior engine with configurable triggers
- Context gathering and analysis
- Personality modes (helpful, concise, technical, creative)
- Provider switching with conversation preservation
- Model selection and configuration persistence

## Nx Migration Benefits

### What Changed (2025-11-11)
- ✅ Integrated Nx 22.0.3 for intelligent build caching
- ✅ Added `project.json` to all 12 packages
- ✅ 20-72% faster builds with intelligent caching
- ✅ Affected-based commands (build only what changed)
- ✅ Interactive dependency graph visualization
- ✅ Zero breaking changes - all Yarn commands still work

### Quick Start with Nx
```bash
# See the speed difference
yarn nx:build              # Uses cache (72% faster on hit)
yarn nx:build:affected     # Only changed packages
yarn nx:graph              # Visualize dependencies
yarn nx:reset              # Clear cache if needed
```

### When to Use Each Command
- **Use Nx commands** for development (faster with caching)
- **Use Yarn commands** for CI/CD or when you need traditional behavior
- **Both work identically** - choose based on preference

## Documentation

### Main Documentation
- **[README.md](./README.md)** - Project overview and quick start
- **[WORKSPACE_GUIDE.md](./WORKSPACE_GUIDE.md)** - Development workflow and commands
- **[WORKSPACE_INDEX.md](./WORKSPACE_INDEX.md)** - Complete package and script reference
- **[PUBLISHING.md](./PUBLISHING.md)** - Publishing workflow and checklist
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and release notes

### Technical Documentation
- **[docs/README.md](./docs/README.md)** - Comprehensive documentation index
- **[docs/NX_COMMANDS.md](./docs/NX_COMMANDS.md)** - Nx command reference
- **[docs/NX_ARCHITECTURE.md](./docs/NX_ARCHITECTURE.md)** - Build system architecture
- **[docs/MODES_GUIDE.md](./docs/MODES_GUIDE.md)** - AI personality modes
- **[docs/typescript-configuration.md](./docs/typescript-configuration.md)** - TypeScript setup
- **[docs/react19-typescript-fixes.md](./docs/react19-typescript-fixes.md)** - React 19 migration notes

### API Reference
Located in `docs/api-reference/`:
- Agent API
- Hooks API  
- Provider API
- Configuration API

## Development Workflow

### Initial Setup
```bash
# Clone and setup
git clone https://github.com/ericbfriday/clippyjs.git
cd clippyjs
yarn install

# Build with Nx (uses caching)
yarn nx:build

# Verify setup
yarn nx:typecheck
yarn nx:test
```

### Development Cycle
```bash
# Make changes
# Build affected packages (faster)
yarn nx:build:affected

# Test affected packages
yarn nx:test:affected

# Visualize what changed
yarn nx:graph

# Full build and test before commit
yarn nx:build
yarn nx:test
```

### Testing Workflow
```bash
# Unit tests (fast, with caching)
yarn nx run @clippyjs/react:test

# E2E tests (requires build first)
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration

# Full test suite
yarn nx:test
```

## Troubleshooting

### Nx Cache Issues
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
# Reinstall dependencies
yarn install
yarn nx:build
```

### Tests Failing After Changes
```bash
# Always build before E2E tests
yarn nx run @clippyjs/react:build
yarn workspace @clippyjs/react test:integration
```

## Support

- **GitHub**: [github.com/ericbfriday/clippyjs](https://github.com/ericbfriday/clippyjs)
- **npm**: [@clippyjs](https://www.npmjs.com/org/clippyjs)
- **Documentation**: [./docs/](./docs/)
- **License**: MIT


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->