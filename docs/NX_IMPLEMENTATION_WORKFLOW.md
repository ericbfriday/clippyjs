# Nx Migration Implementation Workflow

**Project:** ClippyJS → Nx Monorepo  
**Status:** 📋 Ready for Execution  
**Estimated Time:** 6-8 hours  
**Risk Level:** 🟢 LOW

---

## Pre-Flight Checklist

Before beginning migration, verify:

- [ ] Current branch: `master`
- [ ] Working tree clean: `git status`
- [ ] All builds passing: `yarn build:all`
- [ ] All tests passing: `yarn test:all`
- [ ] Recent backup/commit: Latest workspace script fixes committed
- [ ] Documentation read: NX_MIGRATION_PLAN.md reviewed
- [ ] Time allocated: 6-8 hours available

---

## Workflow Execution Steps

### Step 1: Create Feature Branch (5 min)

```bash
# Ensure on master with latest changes
git checkout master
git pull origin master

# Create and push feature branch
git checkout -b feature/nx-migration
git push -u origin feature/nx-migration

# Verify branch
git branch --show-current  # Should show: feature/nx-migration
```

**Validation:** Branch created and pushed to remote ✅

---

### Step 2: Capture Baseline Metrics (10 min)

```bash
# Create metrics directory
mkdir -p docs/nx-migration-metrics

# Measure build performance
echo "=== Cold Build Baseline ===" | tee docs/nx-migration-metrics/baseline.txt
yarn clean
time yarn build:all 2>&1 | tee -a docs/nx-migration-metrics/baseline.txt

# Measure test performance  
echo -e "\n=== Test Baseline ===" | tee -a docs/nx-migration-metrics/baseline.txt
time yarn test:all 2>&1 | tee -a docs/nx-migration-metrics/baseline.txt

# Document workspace state
yarn workspaces list --json > docs/nx-migration-metrics/workspaces-before.json

# Capture package dependency sizes
du -sh packages/* > docs/nx-migration-metrics/package-sizes-before.txt

# Commit baseline
git add docs/nx-migration-metrics/
git commit -m "docs(nx): capture baseline metrics before migration"
git push
```

**Validation:** Baseline metrics captured ✅

---

### Step 3: Install Nx Dependencies (15 min)

```bash
# Install core Nx
yarn add -D nx@latest

# Install Nx plugins
yarn add -D @nx/js@latest
yarn add -D @nx/vite@latest
yarn add -D @nx/rollup@latest
yarn add -D @nx/react@latest
yarn add -D @nx/playwright@latest
yarn add -D @nx/eslint@latest

# Verify installation
npx nx --version

# Commit dependencies
git add package.json yarn.lock
git commit -m "chore(nx): install Nx and official plugins"
git push
```

**Expected Changes:**
- `package.json`: ~7 new devDependencies
- `yarn.lock`: Updated with Nx packages
- `node_modules`: +~50MB

**Validation:** Nx installed successfully ✅

---

### Step 4: Initialize Nx Workspace (10 min)

```bash
# Initialize Nx with workspaces mode
npx nx init --workspaces

# This creates:
# - nx.json (minimal config)
# - .nxignore (ignore patterns)

# Verify files created
ls -la nx.json .nxignore

# Test that existing scripts still work
yarn build
yarn test

# Commit Nx initialization
git add nx.json .nxignore .gitignore
git commit -m "chore(nx): initialize Nx workspace with --workspaces mode"
git push
```

**Validation:** Nx initialized, existing scripts work ✅

---

### Step 5: Configure nx.json (20 min)

Replace the minimal nx.json created by init with comprehensive configuration:

```bash
# Create comprehensive nx.json
cat > nx.json << 'EOF'
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
      "inputs": ["default", "^production"]
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
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/.eslintrc.json",
      "!{projectRoot}/**/*.md"
    ],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  },
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
EOF

# Update .nxignore
cat > .nxignore << 'EOF'
# Build outputs
**/dist
**/.next
**/storybook-static
**/.cache

# Dependencies
**/node_modules

# Logs
**/*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
**/.env
**/.env.local
**/.env.*.local

# Testing
**/coverage
**/.nyc_output

# Misc
**/.DS_Store
EOF

# Commit configuration
git add nx.json .nxignore
git commit -m "chore(nx): configure comprehensive nx.json with caching and task dependencies"
git push
```

**Validation:** nx.json configured ✅

---

### Step 6: Create TypeScript Base Configuration (15 min)

```bash
# Create tsconfig.base.json at workspace root
cat > tsconfig.base.json << 'EOF'
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
EOF

# Sync TypeScript project references
npx nx sync

# Commit
git add tsconfig.base.json
git commit -m "chore(nx): create TypeScript base configuration with path mappings"
git push
```

**Validation:** tsconfig.base.json created, paths configured ✅

---

### Step 7: Create Project Configurations - @clippyjs/types (20 min)

```bash
# Create project.json for types package
cat > packages/types/project.json << 'EOF'
{
  "name": "@clippyjs/types",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/types/src",
  "projectType": "library",
  "tags": ["type:lib", "scope:types", "platform:agnostic"],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "outputPath": "packages/types/dist",
        "main": "packages/types/src/index.ts",
        "tsConfig": "packages/types/tsconfig.json",
        "assets": [
          {
            "glob": "packages/types/README.md",
            "input": ".",
            "output": "."
          }
        ]
      }
    },
    "typecheck": {
      "executor": "@nx/js:tsc",
      "outputs": [],
      "options": {
        "tsConfig": "packages/types/tsconfig.json",
        "noEmit": true
      }
    },
    "clean": {
      "executor": "nx:run-commands",
      "options": {
        "command": "rm -rf packages/types/dist"
      }
    }
  }
}
EOF

# Test build
npx nx build @clippyjs/types

# Verify output matches yarn build
yarn workspace @clippyjs/types build
ls -la packages/types/dist/

# Commit
git add packages/types/project.json
git commit -m "feat(nx): add project configuration for @clippyjs/types"
git push
```

**Validation:** @clippyjs/types builds with Nx ✅

---

### Step 8: Create Project Configurations - @clippyjs/react (30 min)

```bash
# Create project.json for react package
cat > packages/react/project.json << 'EOF'
{
  "name": "@clippyjs/react",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/react/src",
  "projectType": "library",
  "tags": ["type:lib", "scope:react", "platform:web"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "command": "yarn workspace @clippyjs/react build"
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
      "executor": "nx:run-commands",
      "options": {
        "command": "echo 'Lint not configured yet'"
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
EOF

# Test all targets
npx nx build @clippyjs/react
npx nx test @clippyjs/react
npx nx typecheck @clippyjs/react
npx nx clean @clippyjs/react

# Commit
git add packages/react/project.json
git commit -m "feat(nx): add project configuration for @clippyjs/react"
git push
```

**Validation:** @clippyjs/react all targets work ✅

---

### Step 9: Create Remaining Project Configurations (60 min)

Create project.json files for remaining packages:
- @clippyjs/ai
- @clippyjs/ai-anthropic
- @clippyjs/ai-openai
- @clippyjs/storybook
- Demo apps
- Templates

**Pattern:** Follow the same structure as react package, adapting for each package's specific needs.

```bash
# Use batch script to create all configurations
# (Detailed configurations provided in NX_MIGRATION_PLAN.md Phase 3)

# After creating all project.json files, test:
npx nx run-many --target=build --all
npx nx run-many --target=test --all

# Commit all project configurations
git add packages/*/project.json packages/templates/*/project.json
git commit -m "feat(nx): add project configurations for all packages"
git push
```

**Validation:** All packages configured ✅

---

### Step 10: Test Caching (15 min)

```bash
# Clear Nx cache
npx nx reset

# First build (cold cache) - measure time
echo "=== Cold Build with Nx ===" | tee docs/nx-migration-metrics/nx-performance.txt
time npx nx run-many --target=build --all 2>&1 | tee -a docs/nx-migration-metrics/nx-performance.txt

# Second build (warm cache) - should be instant
echo -e "\n=== Cached Build with Nx ===" | tee -a docs/nx-migration-metrics/nx-performance.txt
time npx nx run-many --target=build --all 2>&1 | tee -a docs/nx-migration-metrics/nx-performance.txt

# Test affected commands
echo -e "\n=== Affected Build Test ===" | tee -a docs/nx-migration-metrics/nx-performance.txt
npx nx affected:build --base=master 2>&1 | tee -a docs/nx-migration-metrics/nx-performance.txt

# Commit metrics
git add docs/nx-migration-metrics/nx-performance.txt
git commit -m "docs(nx): record Nx performance metrics"
git push
```

**Expected:** Second build should be <5 seconds ✅

---

### Step 11: Update Root Package.json Scripts (10 min)

```bash
# Add Nx convenience scripts to root package.json
# Edit package.json to add after existing scripts:

{
  "scripts": {
    // ... existing scripts ...
    
    "nx": "nx",
    "nx:graph": "nx graph",
    "nx:reset": "nx reset",
    "nx:affected:build": "nx affected --target=build",
    "nx:affected:test": "nx affected --target=test",
    "nx:affected:lint": "nx affected --target=lint",
    "nx:build:all": "nx run-many --target=build --all",
    "nx:test:all": "nx run-many --target=test --all",
    "nx:clean:all": "nx run-many --target=clean --all"
  }
}

# Commit
git add package.json
git commit -m "chore(nx): add Nx convenience scripts to root package.json"
git push
```

**Validation:** Nx scripts added to root ✅

---

### Step 12: Visualize Dependency Graph (5 min)

```bash
# Generate and open dependency graph
npx nx graph

# Take screenshot and save to docs
# (Opens browser with interactive graph visualization)

# Document in metrics
echo "Dependency graph available at: http://localhost:4211" > docs/nx-migration-metrics/graph-url.txt

# Commit
git add docs/nx-migration-metrics/graph-url.txt
git commit -m "docs(nx): add dependency graph visualization"
git push
```

**Validation:** Dependency graph visualizes correctly ✅

---

### Step 13: Comprehensive Testing (30 min)

```bash
# Run full test suite
npx nx run-many --target=test --all

# Run builds
npx nx run-many --target=build --all

# Run typechecks
npx nx run-many --target=typecheck --all

# Test affected commands with dummy change
echo "// Test comment" >> packages/types/src/index.ts
git add packages/types/src/index.ts
git commit -m "test: dummy change to test affected commands"

# Build affected (should only build types and dependents)
npx nx affected:build --base=master~1

# Reset test change
git reset --soft HEAD~1
git checkout packages/types/src/index.ts
```

**Validation:** All tests pass, affected commands work ✅

---

### Step 14: Create Documentation (20 min)

Create additional documentation files:

```bash
# NX_COMMANDS.md - Command reference
# NX_ARCHITECTURE.md - Architecture documentation
# MIGRATION_VALIDATION.md - Validation results

# (Content provided separately)

# Commit docs
git add docs/NX_*.md docs/MIGRATION_VALIDATION.md
git commit -m "docs(nx): add comprehensive Nx documentation"
git push
```

**Validation:** Documentation complete ✅

---

### Step 15: Final Validation & Metrics Comparison (20 min)

```bash
# Create validation report
cat > docs/MIGRATION_VALIDATION.md << 'EOF'
# Nx Migration Validation Report

## Date: [Current Date]
## Migration Branch: feature/nx-migration

## Performance Comparison

### Build Times
- Yarn (Cold): [from baseline.txt]
- Nx (Cold): [from nx-performance.txt]
- Nx (Cached): [from nx-performance.txt]

### Improvement
- Cold build: X% faster/slower
- Cached build: ~100x faster

## Functional Validation

- [x] All packages build successfully
- [x] Build outputs identical to Yarn builds
- [x] All tests pass
- [x] TypeScript compilation works
- [x] Caching works correctly
- [x] Affected commands work
- [x] Dependency graph accurate

## Conclusion

Migration successful. Nx provides:
- Improved build performance
- Intelligent caching
- Better developer experience
- Foundation for future optimizations

Recommendation: Merge to master
EOF

# Fill in actual metrics
# Commit
git add docs/MIGRATION_VALIDATION.md
git commit -m "docs(nx): add migration validation report"
git push
```

**Validation:** Migration validated successfully ✅

---

### Step 16: Create Pull Request (10 min)

```bash
# Push all changes
git push origin feature/nx-migration

# Create PR via GitHub CLI or web interface
gh pr create \
  --title "feat(workspace): Migrate to Nx monorepo" \
  --body "$(cat docs/NX_MIGRATION_PLAN.md | head -100)" \
  --base master \
  --head feature/nx-migration

# Or create manually at:
# https://github.com/ericbfriday/clippyjs/compare/master...feature/nx-migration
```

**Validation:** PR created ✅

---

## Post-Migration Tasks

After merging to master:

1. **Team Onboarding**
   - Share NX_COMMANDS.md with team
   - Install Nx Console VS Code extension
   - Walkthrough dependency graph

2. **CI/CD Updates**
   - Update CI to use affected commands
   - Configure Nx Cloud (optional)
   - Update deployment scripts

3. **Optimization**
   - Monitor cache performance
   - Tune parallel execution
   - Configure Nx Release for publishing

---

## Troubleshooting

### Build Outputs Different

```bash
# Compare outputs
diff -r packages/react/dist-yarn packages/react/dist-nx

# Check rollup config matches
# Adjust Nx executor options if needed
```

### Cache Not Working

```bash
# Clear and rebuild
npx nx reset
npx nx run-many --target=build --all --skip-nx-cache

# Check nx.json cacheableOperations
# Verify outputs are correctly specified
```

### Affected Commands Not Working

```bash
# Ensure git history preserved
git log --oneline

# Check base ref
npx nx affected:build --base=master --head=HEAD

# Verify project.json tags and dependencies
```

---

## Completion Checklist

- [ ] All 16 steps completed
- [ ] All validations passed
- [ ] Documentation created
- [ ] Metrics recorded
- [ ] PR created and reviewed
- [ ] Migration merged to master
- [ ] Team notified
- [ ] CI/CD updated

---

**Estimated Total Time:** 6-8 hours  
**Actual Time:** [To be filled during execution]

**Status:** Ready for execution on new branch
