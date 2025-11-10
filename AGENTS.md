# AGENTS.md

## Project Overview

Modern TypeScript React library for adding Clippy agents to websites. Monorepo with packages: core (deprecated), react, ai, ai-anthropic, ai-openai. Uses rollup.js bundling, Vitest testing, Playwright e2e.

## Build/Lint/Test Commands

- Build all: `yarn build` | Build specific: `yarn workspace @clippyjs/react build`
- Lint all: `yarn lint` | Type check all: `yarn typecheck`
- Test all: `yarn test:all` | Test package: `yarn workspace @clippyjs/react test`
- Test single file: `yarn workspace @clippyjs/react test path/to/file.test.ts`
- Coverage: `yarn workspace @clippyjs/react test:coverage`
- Integration: `yarn workspace @clippyjs/react test:integration`
- Visual tests: `yarn workspace @clippyjs/react test:visual`

## Code Style Guidelines

- **TypeScript**: Strict mode, ES2020 target, react-jsx transform, explicit type imports
- **Imports**: React import required in JSX files, use `type` imports for types only
- **Components**: Functional components with hooks only, no class components
- **Naming**: camelCase for variables/functions, PascalCase for components/interfaces
- **Testing**: Vitest unit tests with @testing-library, Playwright for e2e/visual
- **Error Handling**: Try-catch with proper error typing, use Error boundaries in React
- **Exports**: JSDoc comments on all public exports, clear interface documentation
- **Workspace**: Use workspace references (workspace:*) for internal dependencies