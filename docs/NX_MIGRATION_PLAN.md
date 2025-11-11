# ClippyJS → Nx Monorepo Migration Plan

**Version:** 1.0  
**Date:** November 10, 2025  
**Status:** 📋 PLANNING  
**Target Nx Version:** 21.1+ (Latest)

---

## Executive Summary

This document outlines the comprehensive plan to migrate the ClippyJS Yarn workspace to an Nx-powered monorepo while preserving all existing functionality and minimizing disruption to the development workflow.

### Why Nx?

**Current Pain Points:**
- Manual task orchestration across packages
- No computation caching (rebuild everything every time)
- Difficult to visualize package dependencies
- No "affected" testing (run all tests even if only one package changed)
- Manual TypeScript project references setup

**Nx Benefits:**
- ⚡ **Massive speed improvements** through intelligent caching
- 🎯 **Affected commands** - only build/test what changed
- 📊 **Dependency graph visualization** - understand package relationships
- 🔧 **Automated TypeScript project references** - performance boost
- 📦 **Better publishing workflow** with Nx Release
- 🚀 **Minimal disruption** - layers on top of existing workspace

### Migration Approach

**Strategy:** Incremental, non-breaking adoption  
**Risk Level:** 🟢 LOW (all existing workflows preserved)  
**Timeline:** 1-2 days (6-8 hours of focused work)  
**Rollback:** Simple (delete nx.json, remove Nx packages)

---

## Current Workspace Analysis

### Package Structure

```
clippyjs/
├── packages/
│   ├── types/              # @clippyjs/types - Base types (no dependencies)
│   ├── react/              # @clippyjs/react - Main library (depends on types)
│   ├── ai/                 # @clippyjs/ai - AI framework (depends on types)
│   ├── ai-anthropic/       # @clippyjs/ai-anthropic - Claude SDK (depends on ai)
│   ├── ai-openai/          # @clippyjs/ai-openai - OpenAI SDK (depends on ai)
│   ├── clippyjs-lib/       # clippyjs - Legacy package
│   ├── storybook/          # @clippyjs/storybook - Component showcase
│   ├── clippyjs-demo-react/    # React demo app
│   ├── clippyjs-demo-vanilla/  # Vanilla JS demo
│   └── templates/
│       ├── nextjs-starter/     # Next.js template
│       └── vite-starter/       # Vite template
```

### Dependency Graph

```
@clippyjs/types (foundation)
    ↓
@clippyjs/react
    ↓
@clippyjs/ai
    ↓ ↓
@clippyjs/ai-anthropic   @clippyjs/ai-openai
    ↓
Storybook, Demos, Templates
```

### Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Package Manager | Yarn Workspaces | 4.9.2 |
| Language | TypeScript | 5.7.3 |
| Framework | React | 19.0.0 |
| Build (Libraries) | Rollup | 4.31.0 |
| Build (Apps) | Vite | 6.0.11 |
| Testing | Vitest | 3.0.5 |
| E2E Testing | Playwright | 1.49.1 |
| Linting | ESLint | 9.18.0 |

### Current Scripts

**Root level:**
- `build`, `build:all` - Build all packages
- `clean` - Clean dist directories
- `test`, `test:all` - Run tests
- `lint` - Lint all packages
- `typecheck` - TypeScript compilation check

**Package level:** (Standardized as of 2025-11-10)
- `build` - Build package
- `clean` - Clean dist
- `typecheck` - Type checking
- `test`, `test:watch`, `test:coverage` - Testing
- `prepublishOnly` - Build before publish

---

## Nx Migration Strategy

### Phase Overview

| Phase | Description | Risk | Duration |
|-------|-------------|------|----------|
| 1. Preparation | Branch, install, init | 🟢 Low | 30 min |
| 2. Core Setup | Configure nx.json | 🟢 Low | 1 hour |
| 3. Task Configuration | Create project.json files | 🟡 Medium | 2 hours |
| 4. Testing Integration | Migrate test executors | 🟡 Medium | 1 hour |
| 5. Optimization | Enable caching, affected | 🟢 Low | 1 hour |
| 6. Publishing Setup | Configure Nx Release | 🟢 Low | 1 hour |

**Total Estimated Time:** 6.5 hours

---

## Phase 1: Preparation

### 1.1 Create Feature Branch

```bash
git checkout -b feature/nx-migration
git push -u origin feature/nx-migration
```

### 1.2 Document Baseline

```bash
# Capture current build times
time yarn build:all 2>&1 | tee baseline-build-times.txt

# Capture workspace structure
yarn workspaces list --json > baseline-workspaces.json

# Verify all scripts work
yarn clean
yarn build:all
yarn test:all
yarn typecheck
```

### 1.3 Install Nx Dependencies

```bash
# Core Nx
yarn add -D nx@latest

# Nx Plugins
yarn add -D @nx/js@latest          # JavaScript/TypeScript support
yarn add -D @nx/vite@latest        # Vite integration
yarn add -D @nx/rollup@latest      # Rollup executor
yarn add -D @nx/react@latest       # React utilities
yarn add -D @nx/playwright@latest  # Playwright integration
yarn add -D @nx/eslint@latest      # ESLint integration
```

**Expected:** ~50MB node_modules increase

### 1.4 Initialize Nx

```bash
npx nx init --workspaces
```

**What this does:**
- Creates `nx.json` (workspace configuration)
- Creates `.nxignore` (ignored paths for Nx)
- Preserves all existing package.json files
- Preserves all existing scripts
- NO breaking changes to current workflow

### 1.5 Verify Non-Disruption

```bash
# All existing commands should still work
yarn build
yarn test
yarn clean

# Nx commands now also available
npx nx list  # List installed Nx plugins
```

---

## Phase 2: Core Setup

### 2.1 Configure nx.json

Create comprehensive `nx.json`:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "workspaceLayout": {
    "appsDir": "packages",
    "libsDir": "packages"
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production", "{workspaceRoot}/jest.config.js"]
    },
    "lint": {
      "cache": true,
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"]
    },
    "typecheck": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["default", "^production"]
    },
    "clean": {
      "cache": false
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/.eslintrc.json"
    ],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  },
  "generators": {
    "@nx/react": {
      "application": {
        "style": "css",
        "linter": "eslint",
        "bundler": "vite"
      },
      "component": {
        "style": "css"
      },
      "library": {
        "style": "css",
        "linter": "eslint",
        "unitTestRunner": "vitest"
      }
    }
  },
  "plugins": [
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    }
  ]
}
```

### 2.2 Configure .nxignore

```
# Build outputs
**/dist
**/.next
**/storybook-static
**/.cache

# Dependencies
**/node_modules

# Logs
**/*.log

# Environment
**/.env
**/.env.local
```

### 2.3 Create TypeScript Base Config

Create `tsconfig.base.json` (root level):

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "bundler",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@clippyjs/types": ["packages/types/src/index.ts"],
      "@clippyjs/react": ["packages/react/src/index.ts"],
      "@clippyjs/ai": ["packages/ai/src/index.ts"],
      "@clippyjs/ai-anthropic": ["packages/ai-anthropic/src/index.ts"],
      "@clippyjs/ai-openai": ["packages/ai-openai/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp"]
}
```

### 2.4 Enable TypeScript Project References

Nx will automatically generate these based on package dependencies. Manual verification:

```bash
npx nx sync
```

This creates `tsconfig.json` references in each package pointing to dependencies.

---

## Phase 3: Task Configuration

### 3.1 Create Project Configurations

For each package, create `project.json`. Example for `@clippyjs/react`:

**File:** `packages/react/project.json`

```json
{
  "name": "@clippyjs/react",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/react/src",
  "projectType": "library",
  "tags": ["type:lib", "scope:react", "platform:web"],
  "targets": {
    "build": {
      "executor": "@nx/rollup:rollup",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "outputPath": "packages/react/dist",
        "main": "packages/react/src/index.ts",
        "tsConfig": "packages/react/tsconfig.lib.json",
        "project": "packages/react/package.json",
        "compiler": "tsc",
        "format": ["cjs", "esm"],
        "generateExportsField": true,
        "assets": [
          {
            "glob": "packages/react/README.md",
            "input": ".",
            "output": "."
          },
          {
            "glob": "packages/react/assets/**/*",
            "input": ".",
            "output": "./assets"
          }
        ]
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{workspaceRoot}/coverage/packages/react"],
      "options": {
        "config": "packages/react/vite.config.ts",
        "passWithNoTests": false,
        "reportsDirectory": "../../coverage/packages/react"
      }
    },
    "test:integration": {
      "executor": "@nx/playwright:playwright",
      "outputs": ["{workspaceRoot}/playwright-report"],
      "options": {
        "config": "packages/react/playwright.config.ts"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["packages/react/**/*.{ts,tsx,js,jsx}"]
      }
    },
    "typecheck": {
      "executor": "@nx/js:tsc",
      "outputs": [],
      "options": {
        "tsConfig": "packages/react/tsconfig.json",
        "noEmit": true
      }
    },
    "clean": {
      "executor": "nx:run-commands",
      "options": {
        "command": "rm -rf packages/react/dist"
      }
    }
  }
}
```

### 3.2 Project Configuration Matrix

| Package | Build Executor | Test Executor | Special Notes |
|---------|---------------|---------------|---------------|
| @clippyjs/types | @nx/js:tsc | N/A | Types only |
| @clippyjs/react | @nx/rollup:rollup | @nx/vite:test | Also has Playwright |
| @clippyjs/ai | @nx/rollup:rollup | @nx/vite:test | Also has Playwright |
| @clippyjs/ai-anthropic | @nx/rollup:rollup | @nx/vite:test | Simple SDK wrapper |
| @clippyjs/ai-openai | @nx/rollup:rollup | @nx/vite:test | Simple SDK wrapper |
| @clippyjs/storybook | @nx/storybook:build | N/A | Storybook specific |
| Demos/Templates | @nx/vite:build | N/A | App builds |

### 3.3 Batch Create Project Files

Create all project.json files for remaining packages following the same pattern.

---

## Phase 4: Testing Integration

### 4.1 Configure Vitest Integration

Ensure each package's `vite.config.ts` is Nx-compatible:

```typescript
/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/react',
  
  plugins: [react(), nxViteTsPaths()],
  
  test: {
    globals: true,
    cache: { dir: '../../node_modules/.vitest' },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/react',
      provider: 'v8'
    }
  }
});
```

### 4.2 Configure Playwright Integration

Update `playwright.config.ts` for Nx:

```typescript
import { defineConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './tests' }),
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx nx serve demo-react',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
  },
});
```

### 4.3 Validate Test Execution

```bash
# Test individual package
npx nx test @clippyjs/react

# Test all packages
npx nx run-many --target=test --all

# Test only affected
npx nx affected:test
```

---

## Phase 5: Optimization

### 5.1 Enable Advanced Caching

Configure cache inputs/outputs precisely in nx.json:

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "typecheck"],
        "parallel": 3,
        "cacheDirectory": "node_modules/.cache/nx"
      }
    }
  }
}
```

### 5.2 Test Cache Performance

```bash
# First build (cold cache)
npx nx reset  # Clear cache
time npx nx run-many --target=build --all

# Second build (warm cache - should be instant)
time npx nx run-many --target=build --all
```

**Expected:** 100-1000x faster on cache hit

### 5.3 Configure Affected Commands

```bash
# Build only what changed
npx nx affected:build --base=origin/master

# Test only affected
npx nx affected:test --base=origin/master

# Lint only affected
npx nx affected:lint --base=origin/master
```

### 5.4 Visualize Dependency Graph

```bash
npx nx graph
```

Opens browser with interactive dependency visualization.

### 5.5 Update Root Package.json Scripts

Add Nx convenience commands:

```json
{
  "scripts": {
    "nx": "nx",
    "affected:build": "nx affected --target=build",
    "affected:test": "nx affected --target=test",
    "affected:lint": "nx affected --target=lint",
    "graph": "nx graph",
    "reset": "nx reset"
  }
}
```

---

## Phase 6: Publishing Integration

### 6.1 Configure Nx Release

Add to nx.json:

```json
{
  "release": {
    "projectsRelationship": "independent",
    "projects": [
      "packages/types",
      "packages/react",
      "packages/ai",
      "packages/ai-anthropic",
      "packages/ai-openai"
    ],
    "version": {
      "generatorOptions": {
        "packageRoot": "{projectRoot}",
        "currentVersionResolver": "git-tag"
      }
    },
    "changelog": {
      "automaticFromRef": true,
      "projectChangelogs": {
        "createRelease": "github",
        "renderOptions": {
          "authors": true,
          "mapAuthorsToGitHubUsernames": true
        }
      }
    },
    "git": {
      "commit": true,
      "tag": true,
      "commitMessage": "chore(release): publish {version}"
    }
  }
}
```

### 6.2 Test Publishing Workflow

```bash
# Dry run - see what would happen
npx nx release --dry-run

# Publish specific package
npx nx release publish @clippyjs/react --dry-run

# Publish all changed packages
npx nx release --dry-run
```

### 6.3 Update CI/CD Integration

Add to CI workflow (e.g., GitHub Actions):

```yaml
- name: Build affected packages
  run: npx nx affected --target=build --base=origin/master

- name: Test affected packages
  run: npx nx affected --target=test --base=origin/master

- name: Publish packages
  if: github.ref == 'refs/heads/master'
  run: npx nx release
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Validation Checklist

### ✅ Functional Validation

- [ ] All packages build successfully with Nx
- [ ] Build outputs identical to Yarn workspace builds
- [ ] All tests pass with Nx executors
- [ ] TypeScript compilation works
- [ ] Linting works across all packages
- [ ] Publishing dry-run succeeds

### ✅ Performance Validation

- [ ] First build time measured
- [ ] Cached build is >10x faster
- [ ] Affected commands only build changed packages
- [ ] Parallel execution working (check logs)
- [ ] TypeScript project references improving typecheck speed

### ✅ Developer Experience

- [ ] Dependency graph visualization working
- [ ] Existing yarn commands still work
- [ ] New Nx commands documented
- [ ] Team can run Nx commands
- [ ] Nx Console extension installed (VSCode)

### ✅ Documentation

- [ ] Migration completed (this document)
- [ ] Architecture documented (NX_ARCHITECTURE.md)
- [ ] Command reference created (NX_COMMANDS.md)
- [ ] Validation results recorded (MIGRATION_VALIDATION.md)

---

## Rollback Plan

If issues arise, rollback is simple and non-destructive:

### Quick Rollback

```bash
# 1. Remove Nx dependencies
yarn remove nx @nx/js @nx/vite @nx/rollup @nx/react @nx/playwright @nx/eslint

# 2. Delete Nx configuration
rm nx.json
rm .nxignore
rm -rf node_modules/.cache/nx

# 3. Delete project.json files (if created)
find packages -name "project.json" -delete

# 4. Reset to previous commit
git reset --hard HEAD~1  # If already committed
```

### Workspace continues to function identically with just Yarn.

---

## Success Metrics

| Metric | Baseline (Yarn) | Target (Nx) | Actual |
|--------|-----------------|-------------|--------|
| Full build time | ? | -20% to -50% | |
| Cached build time | N/A | <5 seconds | |
| Test execution | ? | Affected only | |
| Developer onboarding | Manual docs | Nx graph visualization | |
| Publishing workflow | Manual | Automated with Nx Release | |

**Fill in baselines during Phase 1.**

---

## Next Steps After Migration

1. **Nx Cloud** (Optional)
   - Distributed caching across team
   - Remote task execution
   - Analytics and insights

2. **Advanced Generators**
   - Custom generators for new packages
   - Consistent package structure enforcement

3. **CI/CD Optimization**
   - Only build/test affected projects
   - Distributed task execution
   - Automatic parallelization

4. **Nx Console**
   - VS Code extension for Nx
   - Visual task runner
   - Dependency graph explorer

---

## Timeline

**Estimated Duration:** 6-8 hours

| Day | Tasks | Duration |
|-----|-------|----------|
| Day 1 AM | Phase 1-2 (Preparation & Core Setup) | 2 hours |
| Day 1 PM | Phase 3 (Task Configuration) | 2-3 hours |
| Day 2 AM | Phase 4-5 (Testing & Optimization) | 2 hours |
| Day 2 PM | Phase 6 & Validation | 1-2 hours |

**Buffer:** +2 hours for unexpected issues

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Build output changes | High | Low | Compare outputs before committing |
| Performance regression | Medium | Very Low | Measure before/after |
| Team adoption friction | Low | Medium | Thorough documentation |
| Existing workflow breaks | High | Very Low | Non-breaking migration strategy |
| Rollback needed | Medium | Very Low | Simple rollback procedure |

**Overall Risk:** 🟢 **LOW**

---

## Conclusion

This migration plan provides a comprehensive, low-risk path to adopting Nx in the ClippyJS workspace. The incremental approach ensures:

- ✅ Zero disruption to existing workflows
- ✅ Significant performance improvements
- ✅ Better developer experience
- ✅ Simple rollback if needed
- ✅ Foundation for future enhancements

**Recommendation:** Proceed with migration on feature branch with full validation before merging to master.

---

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**Next Review:** After Phase 1 completion
