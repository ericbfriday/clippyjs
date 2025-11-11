# GitHub Copilot Instructions

## Project Context

This project uses **AGENTS.md** as the primary source of project conventions, guidelines, and architecture documentation.

**Before making any code suggestions, please review AGENTS.md** at the root of this repository.

## Key Guidelines from AGENTS.md

### TypeScript Standards
- Strict mode enabled
- ES2020 target
- Use explicit `type` imports for types only
- No JavaScript files in source

### React Standards
- Functional components with hooks only
- No class components
- Explicit interface definitions for all component props

### Testing Standards
- Vitest for unit tests with @testing-library/react
- Playwright for e2e and visual regression tests
- Maintain high test coverage for public APIs

### Naming Conventions
- camelCase: variables and functions
- PascalCase: components and interfaces
- kebab-case: utility files

### Workspace Management
- Use workspace references (`workspace:*`) for internal dependencies
- Run linter before committing
- Clear, descriptive commit messages

## Available Commands

See AGENTS.md for complete list of build, test, and lint commands.

Quick reference:
- Build: `yarn build`
- Test: `yarn test:all`
- Lint: `yarn lint`
- Type check: `yarn typecheck`
