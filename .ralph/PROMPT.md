# Ralph Loop: Browser-Based AI Assistant Implementation

## Mission

Implement the Browser-Based AI Assistant as specified in the PRD and technical documentation located in `docs/prd/`. This is a self-referential development loop - examine your previous work in the files and git history, then continue making progress toward the goal.

## Current State

Review the following to understand where we are:
1. `docs/prd/PRD_BROWSER_AI_ASSISTANT.md` - Product Requirements Document
2. `docs/prd/TECHNICAL_ARCHITECTURE.md` - Technical Architecture
3. `docs/prd/API_SPECIFICATION.md` - API Specifications
4. `docs/prd/UX_DESIGN.md` - UX/UI Design Specifications
5. `.ralph/state/progress.md` - Current progress tracking (if exists)
6. Git history - See what has been done previously

## Primary Objectives

### Phase 1: Foundation (Priority: P0)

1. **Package Structure Setup**
   - Create `packages/browser-assistant/` with Nx configuration
   - Create `packages/browser-parser/` with Nx configuration
   - Create `packages/context-providers/` with Nx configuration
   - Update root `nx.json` and workspace configuration

2. **Core Embedding System**
   - Implement `ClippyEmbedder` class in `packages/browser-assistant/core/`
   - Implement Shadow DOM isolation in `packages/browser-assistant/shadow/`
   - Create CDN bundle configuration

3. **Page Parser**
   - Implement `SemanticExtractor` in `packages/browser-parser/semantic/`
   - Implement `InteractionDetector` in `packages/browser-parser/interaction/`
   - Implement `FormAnalyzer` in `packages/browser-parser/interaction/`

4. **Context Providers**
   - Implement `PageContextProvider` in `packages/context-providers/page-context/`
   - Implement `UserBehaviorProvider` in `packages/context-providers/user-behavior/`

5. **Tests**
   - Unit tests for all new packages
   - Integration tests for embedding
   - E2E tests for basic functionality

## Implementation Guidelines

### Code Standards
- TypeScript strict mode enabled
- All functions must have JSDoc comments
- All public APIs must be exported from index files
- Follow existing codebase patterns (see `@clippyjs/ai` and `@clippyjs/react`)

### Package Structure
```
packages/[package-name]/
├── src/
│   ├── index.ts           # Public exports
│   ├── [module]/
│   │   ├── index.ts
│   │   └── [file].ts
│   └── types/
│       └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── project.json           # Nx configuration
└── README.md
```

### Naming Conventions
- Files: kebab-case (e.g., `page-context-provider.ts`)
- Classes: PascalCase (e.g., `PageContextProvider`)
- Functions: camelCase (e.g., `extractPageContext`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_CONFIG`)

## Verification Steps

After making changes, verify:
1. TypeScript compiles: `yarn nx run [package]:typecheck`
2. Tests pass: `yarn nx run [package]:test`
3. Build succeeds: `yarn nx run [package]:build`
4. No lint errors: `yarn nx run [package]:lint`

## Progress Tracking

Update `.ralph/state/progress.md` with:
- What was completed in this iteration
- What is in progress
- What is blocked
- What is next

## Completion Criteria

Output `<promise>IMPLEMENTATION COMPLETE</promise>` when:
1. All Phase 1 packages are implemented
2. All tests pass
3. Documentation is updated
4. A working demo exists in `apps/browser-demo/`

## Notes

- Do NOT start implementing until you have read and understood the PRD documents
- Check `.ralph/state/progress.md` for current status
- Each iteration should make meaningful progress
- If blocked, document the blocker and try an alternative approach
- Commit your changes after each successful iteration
