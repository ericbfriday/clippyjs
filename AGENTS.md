# AGENTS.md

## Project Overview

Modern TypeScript React library for adding Clippy agents to websites. This is a modern rewrite of the classic `Clippy.js` library in TypeScript, with React implementation and AI integration capabilities.

**Architecture**: Monorepo with packages:
- **@clippyjs/react**: Main React components and hooks for Clippy agents
- **@clippyjs/ai**: Core AI integration abstractions
- **@clippyjs/ai-anthropic**: Claude AI provider integration
- **@clippyjs/ai-openai**: OpenAI provider integration
- **@clippyjs/lib** (deprecated): Legacy package, use @clippyjs/react instead

**Bundling**: Uses rollup.js with three output formats:
- ESM: `dist/index.esm.js`
- CommonJS: `dist/index.js`
- UMD: `dist/clippy.min.js`

**Testing**: Vitest for unit tests, Playwright for e2e and visual regression

## Build/Lint/Test Commands

### Build Commands
- Build all packages: `yarn build`
- Build specific package: `yarn workspace @clippyjs/react build`
- Clean and rebuild: `yarn clean && yarn build`

### Demo Commands
- Browser demo: `yarn demo`
- React demo: `yarn demo:react`
- Demos run at `http://localhost:8080/demo/`

### Lint/Type Commands
- Lint all: `yarn lint`
- Type check all: `yarn typecheck`

### Test Commands
- Test all packages: `yarn test:all`
- Test specific package: `yarn workspace @clippyjs/react test`
- Test single file: `yarn workspace @clippyjs/react test path/to/file.test.ts`
- Coverage report: `yarn workspace @clippyjs/react test:coverage`
- Integration tests: `yarn workspace @clippyjs/react test:integration`
- Visual regression: `yarn workspace @clippyjs/react test:visual`

## Code Style Guidelines

### TypeScript Standards
- **Strict Mode**: TypeScript strict mode enabled
- **Target**: ES2020
- **JSX Transform**: react-jsx
- **Type Imports**: Use explicit `type` imports for types only
- **All code must be TypeScript**: No JavaScript files in source

### React Standards
- **Components**: Functional components with hooks only, no class components
- **Imports**: React import required in JSX files
- **State Management**: Use hooks (useState, useEffect, useContext, etc.)
- **Props**: Explicit interface definitions for all component props

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

### Error Handling
- **Try-Catch**: Proper error typing, avoid `any`
- **React**: Use Error Boundaries for component-level error handling
- **Async**: Proper promise rejection handling

### Documentation
- **JSDoc**: Required on all public exports
- **Interfaces**: Clear documentation of purpose and usage
- **Examples**: Provide usage examples for complex APIs

### Workspace Management
- **Dependencies**: Use workspace references (`workspace:*`) for internal packages
- **Commits**: Clear, descriptive commit messages
- **Linting**: Run linter before committing changes

## Available Agents

The library includes these nostalgic agents:
- Clippy (default)
- Bonzi
- Rover
- Merlin
- And other classic assistants

## AI Integration

The library supports AI-powered agents through provider packages:
- **Anthropic**: Claude integration via @clippyjs/ai-anthropic
- **OpenAI**: GPT integration via @clippyjs/ai-openai
- **Custom**: Extend BaseAIProvider for custom providers
