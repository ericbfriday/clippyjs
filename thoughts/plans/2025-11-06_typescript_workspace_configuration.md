# TypeScript Workspace Configuration Standardization Implementation Plan

## Overview

Standardize TypeScript configuration across ClippyJS monorepo by creating a unified inheritance hierarchy with tsconfig.base.json, framework-specific base configs, project references, and a shared types package. This will eliminate configuration duplication, ensure type safety across packages, and improve developer experience.

## Current State Analysis

### What Exists Now
- 10 independent tsconfig.json files with duplicated settings
- TypeScript version 5.7.3 in most packages, but 4.9.5 in demo-react
- No inheritance hierarchy or project references (except vite-starter)
- Rollup-based builds with TypeScript plugin handling compilation
- Deprecated @clippyjs/core package duplicating react configuration
- No shared types package - types duplicated between core and clippyjs-lib

### What's Missing
- Base configuration for inheritance
- Project references for cross-package type checking
- Shared types package
- Standardized path mappings
- Composite and incremental builds
- TypeScript in root package.json

### Key Discoveries:
- `packages/react/src/index.ts:15` - Re-exports all types from @clippyjs/core
- `packages/core/src/types.ts:1-89` - Contains all core agent types (Agent, AgentConfig, etc.)
- `packages/ai/src/conversation/HistoryStore.ts:8-17` - Defines ConversationMessage and ConversationHistory interfaces
- Only `tsconfig.demo.json:26-29` and `packages/templates/nextjs-starter/tsconfig.json:21-23` have path mappings
- `packages/react/src/useAgent.ts:6` - Only direct import of @clippyjs/core found

## Desired End State

A unified TypeScript configuration structure where:
1. All packages extend from tsconfig.base.json with framework-specific overrides
2. TypeScript 5.7.3 is consistent across workspace
3. Project references enable cross-package type checking
4. @clippyjs/types provides shared interfaces
5. @clippyjs/core is deleted with functionality migrated to appropriate packages
6. All packages use @/* path mapping convention
7. CI/CD runs type checking across entire workspace

## What We're NOT Doing

- Enabling type-aware linting (marked as long-term goal in ticket)
- Migrating Deno demo (marked as low priority)
- Changing build output format from current dual CJS/ESM
- Modifying external dependency constraints in ai-anthropic/ai-openai

## Implementation Approach

Create foundation first (base configs and shared types), then migrate all packages in one coordinated change, finally clean up deprecated package and update CI/CD. This ensures no breaking changes during migration and maintains build integrity throughout.

## Phase 1: Foundation Setup

### Overview
Create the base configuration structure and shared types package that all other packages will inherit from.

### Changes Required:

#### 1. Create @clippyjs/types Package
**Directory**: `packages/types/`
**Purpose**: Internal package for shared interfaces and types (not published)

**package.json**:
```json
{
  "name": "@clippyjs/types",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "tslib": "^2.8.1"
  }
}
```

**tsconfig.json**:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**src/index.ts** - Export shared types from core:
```typescript
// Re-export core types that need to be shared
export type {
  Point, Size, Frame, Branch, Animation, AgentData,
  SoundMap, AnimationState, AnimatorStates,
  ClippyOptions, AgentConfig, Direction, QueueCallback,
  BalloonOptions, LoadOptions, AgentName
} from '@clippyjs/core';

// AI-specific types
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationHistory {
  messages: ConversationMessage[];
  lastUpdated: Date;
}

// React-specific types
export interface UseAgentOptions {
  agentName?: AgentName;
  autoStart?: boolean;
}

export interface UseAgentReturn {
  agent: any; // Will be typed properly when core is migrated
  isLoading: boolean;
  error: Error | null;
}
```

#### 2. Create tsconfig.base.json
**File**: `tsconfig.base.json` (root)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@clippyjs/types": ["./packages/types/src"],
      "@clippyjs/core": ["./packages/core/src"],
      "@clippyjs/react": ["./packages/react/src"],
      "@clippyjs/ai": ["./packages/ai/src"]
    },
    "incremental": true,
    "composite": true
  },
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

#### 3. Create Framework-Specific Base Configs

**tsconfig.react.json** (root):
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  },
  "references": [
    { "path": "./packages/types" }
  ]
}
```

**tsconfig.node.json** (root):
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "node"
  },
  "references": [
    { "path": "./packages/types" }
  ]
}
```

#### 4. Update Root package.json
**File**: `package.json` (root)

Add to devDependencies:
```json
{
  "devDependencies": {
    "typescript": "^5.7.3",
    // ... existing devDependencies
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] New packages build: `yarn workspace @clippyjs/types build`
- [ ] Base configs are valid JSON: `cat tsconfig.base.json | jq .`
- [ ] TypeScript compiles types package: `yarn workspace @clippyjs/types typecheck`

#### Manual Verification:
- [ ] Types package exports are accessible
- [ ] Path mappings resolve correctly in IDE

---

## Phase 2: Package Migration

### Overview
Update all packages to use the new configuration inheritance structure with standardized settings and project references.

### Changes Required:

#### 1. Update Library Packages

**packages/react/tsconfig.json**:
```json
{
  "extends": "../../tsconfig.react.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**packages/ai/tsconfig.json**:
```json
{
  "extends": "../../tsconfig.react.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

**packages/ai-openai/tsconfig.json**:
```json
{
  "extends": "../../tsconfig.react.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" },
    { "path": "../ai" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**packages/ai-anthropic/tsconfig.json**:
```json
{
  "extends": "../../tsconfig.react.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" },
    { "path": "../ai" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 2. Update Package Dependencies

**packages/react/package.json**:
```json
{
  "dependencies": {
    "@clippyjs/types": "workspace:*"
    // ... existing dependencies
  }
}
```

**packages/ai/package.json**:
```json
{
  "dependencies": {
    "@clippyjs/types": "workspace:*"
    // ... existing dependencies
  }
}
```

**packages/ai-openai/package.json** and **packages/ai-anthropic/package.json**:
```json
{
  "dependencies": {
    "@clippyjs/types": "workspace:*"
    // ... existing dependencies
  }
}
```

#### 3. Update Demo Projects

**packages/clippyjs-demo-react/package.json**:
- Update TypeScript version: `"typescript": "^5.7.3"`

**packages/clippyjs-demo-react/tsconfig.json**:
```json
{
  "extends": "../../tsconfig.react.json",
  "compilerOptions": {
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "references": [
    { "path": "../types" },
    { "path": "../react" }
  ],
  "include": ["src"]
}
```

#### 4. Update Template Projects

**packages/templates/nextjs-starter/tsconfig.json**:
```json
{
  "extends": "../../../tsconfig.react.json",
  "compilerOptions": {
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"],
  "references": [
    { "path": "../../../packages/types" },
    { "path": "../../../packages/react" }
  ]
}
```

**packages/templates/vite-starter/tsconfig.json**:
```json
{
  "extends": "../../../tsconfig.react.json",
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "references": [
    { "path": "../../../packages/types" },
    { "path": "../../../packages/react" }
  ],
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 5. Update Storybook

**packages/storybook/tsconfig.json** (create new file):
```json
{
  "extends": "../../tsconfig.react.json",
  "compilerOptions": {
    "noEmit": true
  },
  "references": [
    { "path": "../types" },
    { "path": "../react" },
    { "path": "../ai" },
    { "path": "../ai-anthropic" }
  ],
  "include": [".storybook/**/*", "stories/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 6. Update Import Statements

**packages/react/src/index.ts**:
```typescript
// Re-export types from shared types package
export type * from "@clippyjs/types";

// Context and Provider
export { ClippyProvider, useClippy } from "./ClippyProvider";

// Hooks
export { useAgent } from "./useAgent";

// Components
export { Clippy } from "./Clippy";
```

**packages/react/src/useAgent.ts**:
```typescript
import type { UseAgentOptions, UseAgentReturn, AgentName } from "@clippyjs/types";
// ... rest of file
```

### Success Criteria:

#### Automated Verification:
- [ ] All packages build: `yarn build`
- [ ] TypeScript compiles across workspace: `yarn typecheck`
- [ ] Project references resolve: `tsc --build`
- [ ] All packages use TypeScript 5.7.3: `grep -r '"typescript.*5\.7\.3' packages/`

#### Manual Verification:
- [ ] IDE resolves @/* paths correctly
- [ ] IntelliSense works across package boundaries
- [ ] Demo projects run without errors
- [ ] Templates build successfully

---

## Phase 3: Cleanup & Integration

### Overview
Remove deprecated core package, update all references, and integrate with CI/CD pipeline.

### Changes Required:

#### 1. Migrate Core Functionality

**packages/react/src/Agent.ts** (create new file):
```typescript
// Migrate essential Agent class from core
export class Agent {
  // ... migrate core Agent functionality
}
```

**packages/react/src/Animator.ts** (create new file):
```typescript
// Migrate Animator class from core
export class Animator {
  // ... migrate core Animator functionality
}
```

**packages/react/src/Balloon.ts** (create new file):
```typescript
// Migrate Balloon class from core
export class Balloon {
  // ... migrate core Balloon functionality
}
```

**packages/react/src/index.ts** (update):
```typescript
// Export migrated classes
export { Agent, Animator, Balloon } from "./Agent";
export { Agent, Animator, Balloon } from "./Animator";
export { Agent, Animator, Balloon } from "./Balloon";

// Context and Provider
export { ClippyProvider, useClippy } from "./ClippyProvider";

// Hooks
export { useAgent } from "./useAgent";

// Components
export { Clippy } from "./Clippy";

// Re-export types
export type * from "@clippyjs/types";
```

#### 2. Delete Core Package

**Commands**:
```bash
rm -rf packages/core
```

**Update workspace references**:
- Remove from any remaining package.json dependencies
- Update documentation

#### 3. Update CI/CD Configuration

**.github/workflows/test.yml** (update build job):
```yaml
- name: Build Check
  run: |
    yarn install --frozen-lockfile
    yarn build
    yarn typecheck
    tsc --build --verbose
```

**Add new typecheck job**:
```yaml
- name: Full Workspace Type Check
  run: |
    yarn install --frozen-lockfile
    tsc --build --force
```

#### 4. Update Root Scripts

**package.json** (update scripts):
```json
{
  "scripts": {
    "typecheck": "tsc --build",
    "typecheck:watch": "tsc --build --watch",
    "clean:types": "yarn workspace @clippyjs/types clean",
    // ... existing scripts
  }
}
```

#### 5. Update Documentation

**Create docs/typescript-configuration.md**:
```markdown
# TypeScript Configuration

This document explains the TypeScript configuration structure used in ClippyJS monorepo.

## Configuration Hierarchy

- `tsconfig.base.json` - Base configuration for all packages
- `tsconfig.react.json` - React-specific extensions
- `tsconfig.node.json` - Node.js-specific extensions

## Path Mappings

- `@/*` - Package-local src directory
- `@clippyjs/types` - Shared types package
- `@clippyjs/react` - React package
- `@clippyjs/ai` - AI package

## Project References

All packages use TypeScript project references for improved type checking and incremental builds.
```

### Success Criteria:

#### Automated Verification:
- [ ] CI/CD builds pass: `yarn build`
- [ ] Full workspace type check passes: `yarn typecheck`
- [ ] No references to @clippyjs/core remain: `grep -r "@clippyjs/core" packages/ --exclude-dir=node_modules`
- [ ] All project references resolve: `tsc --build --dry`

#### Manual Verification:
- [ ] Documentation is accurate and helpful
- [ ] No regressions in functionality
- [ ] Developer experience is improved

---

## Testing Strategy

### Unit Tests:
- Verify all packages compile with new configuration
- Test project references resolve correctly
- Validate path mappings work as expected

### Integration Tests:
- Build entire workspace from clean state
- Test cross-package type checking
- Verify demo projects run correctly

### Manual Testing Steps:
1. Clone repository fresh
2. Run `yarn install`
3. Run `yarn build` - should succeed
4. Run `yarn typecheck` - should pass
5. Open in IDE - verify IntelliSense and path resolution
6. Run demo projects - verify they work
7. Build templates - verify they generate correctly

## Performance Considerations

- **Incremental builds**: Enabled via composite projects
- **Project references**: Reduce rebuild scope
- **Type checking**: Faster due to shared types
- **IDE performance**: Improved with proper path mappings

## Migration Notes

### Breaking Changes:
- Direct imports from @clippyjs/core will need updating
- Some type imports may need to use @clippyjs/types
- Build scripts may need adjustment for project references

### Rollback Strategy:
- Keep branch with current configuration
- Document migration steps clearly
- Test thoroughly before merging

## References

- Original ticket: `thoughts/tickets/debt_typescript_workspace_configuration.md`
- Related research: `thoughts/research/2025-11-06_typescript_workspace_configuration.md`
- TypeScript project references: https://www.typescriptlang.org/docs/handbook/project-references.html
- Yarn workspaces: https://yarnpkg.com/features/workspaces