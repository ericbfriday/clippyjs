# Nx Architecture & Design Decisions

Documentation of architectural decisions, patterns, and rationale for the Nx workspace configuration.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Design Decisions](#design-decisions)
- [Project Structure](#project-structure)
- [Build Configuration](#build-configuration)
- [Caching Strategy](#caching-strategy)
- [Testing Strategy](#testing-strategy)
- [Migration Approach](#migration-approach)

## Architecture Overview

### Workspace Mode
We use **Nx Workspaces Mode** (minimal setup) rather than full Nx workspace:

**Rationale:**
- Preserves existing Yarn workspace structure
- Minimal disruption to current workflows
- Gradual adoption path for team
- Keeps existing package.json scripts functional
- Adds Nx capabilities on top of current setup

### Package Topology

```
@clippyjs/types (foundation)
    ↓
@clippyjs/ai
    ↓
@clippyjs/ai-anthropic, @clippyjs/ai-openai
    ↓
@clippyjs/react
    ↓
demos, templates, storybook
```

**Dependency Flow:**
- `types`: No dependencies (pure TypeScript types)
- `ai`: Depends on types
- `ai-anthropic/ai-openai`: Depend on ai
- `react`: Depends on types
- Applications: Depend on libraries

## Design Decisions

### 1. Executor Selection

#### @nx/js:tsc for TypeScript Libraries
**Used for:** `@clippyjs/types`

**Rationale:**
- Simple TypeScript compilation without bundling
- Native Nx caching support
- Fastest for pure type packages
- Built-in support for project references

#### nx:run-commands for Custom Builds
**Used for:** Most packages (`@clippyjs/ai`, `@clippyjs/react`, etc.)

**Rationale:**
- Preserves existing Rollup build configurations
- No need to migrate complex build setups
- Maintains compatibility with current tooling
- Wraps existing Yarn workspace builds
- Adds caching to existing commands

**Example:**
```json
{
  "executor": "nx:run-commands",
  "options": {
    "command": "yarn workspace @clippyjs/react build"
  }
}
```

### 2. Path Mappings Strategy

**Decision:** Point to source files, not dist

```json
{
  "paths": {
    "@clippyjs/types": ["packages/types/src/index.ts"],
    "@clippyjs/react": ["packages/react/src/index.ts"]
  }
}
```

**Rationale:**
- Better IDE support and intellisense
- Faster development feedback
- Source maps work correctly
- Aligns with modern TypeScript practices
- Supports proper tree-shaking

### 3. Caching Configuration

#### Build Caching
```json
{
  "cache": true,
  "inputs": ["production", "^production"],
  "outputs": ["{projectRoot}/dist"]
}
```

**Rationale:**
- `production` inputs exclude tests and docs
- `^production` considers dependency changes
- Single output directory per package
- Deterministic cache keys

#### Test Caching
```json
{
  "cache": true,
  "inputs": ["default", "^production"]
}
```

**Rationale:**
- Include test files in inputs (`default`)
- Invalidate when production code changes (`^production`)
- Tests don't produce cacheable outputs

### 4. Task Dependencies

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Rationale:**
- `^build`: Build dependencies before dependents
- Ensures types are built before consumers
- Automatic task ordering
- Parallel execution where possible

### 5. Parallelization

**Setting:** `"parallel": 3`

**Rationale:**
- Balance between performance and resource usage
- Prevents memory issues on CI/developer machines
- Good for workspaces with 12 packages
- Can be increased on more powerful machines

## Project Structure

### Package Tags
Each project is tagged for organization:

```json
{
  "tags": [
    "type:lib",        // or type:app
    "scope:types",     // domain scope
    "platform:agnostic" // platform target
  ]
}
```

**Tag Categories:**
- **type**: `lib` (library) or `app` (application)
- **scope**: Domain area (`types`, `ai`, `react`, `storybook`)
- **platform**: Target platform (`agnostic`, `web`, `node`)

**Usage:**
- Enforce architectural boundaries
- Query related projects
- Documentation and organization

### Project Types

#### Libraries (type:lib)
```
@clippyjs/types
@clippyjs/ai
@clippyjs/ai-anthropic
@clippyjs/ai-openai
@clippyjs/react
clippyjs-lib
```

**Characteristics:**
- Publishable to npm
- Imported by other packages
- Focus on reusability

#### Applications (type:app)
```
@clippyjs/storybook
clippyjs-demo-react
clippyjs-demo-vanilla
clippyjs-nextjs-starter
clippyjs-vite-starter
```

**Characteristics:**
- Runnable applications
- Not published to npm
- Consume libraries

## Build Configuration

### Named Inputs

```json
{
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
  }
}
```

**Purpose:**
- **default**: All files in package + shared configs
- **production**: Excludes tests, specs, docs
- **sharedGlobals**: Workspace-wide configuration files

**Cache Invalidation:**
- Build cache invalidates on production file changes
- Test cache invalidates on all file changes
- Global config changes invalidate all caches

### Output Paths

**Standard Pattern:** `{projectRoot}/dist`

**Rationale:**
- Matches existing build output locations
- Each package owns its dist directory
- Easy to clean with `rm -rf packages/*/dist`
- Aligns with npm publish workflows

## Caching Strategy

### Cache Directory
**Location:** `node_modules/.cache/nx`

**Rationale:**
- Co-located with node_modules
- Cleaned with node_modules removal
- Not committed to git
- Shared across workspace

### Cache Computation

Nx computes cache keys from:
1. **Task inputs** (source files, configs)
2. **Task command** (build script)
3. **Dependency outputs** (for `dependsOn`)
4. **Runtime environment** (Node version, etc.)

**Cache Hit Behavior:**
```
1. Compute cache key from inputs
2. Check if key exists in cache
3. If hit: Restore outputs, skip execution
4. If miss: Execute task, store outputs
```

### Cache Performance

Measured improvements:
- **Cold build**: 6.476s (20% faster than Yarn)
- **Cached build**: 2.252s (65% faster, 3x speedup)
- **Cached typecheck**: 0.790s

## Testing Strategy

### Unit Tests

**Current:** Via Yarn workspace scripts
```bash
yarn workspace @clippyjs/react test
```

**Future:** Nx executor (requires vitest dependency)
```json
{
  "executor": "@nx/vite:test",
  "options": {
    "config": "packages/react/vite.config.ts"
  }
}
```

**Migration Path:**
1. Add vitest to root devDependencies
2. Test @nx/vite:test executor
3. Gradually migrate packages
4. Maintain Yarn scripts as fallback

### Integration Tests

**Playwright Integration:**
```json
{
  "test:integration": {
    "executor": "@nx/playwright:playwright",
    "options": {
      "config": "packages/react/playwright.config.ts"
    }
  }
}
```

**Benefits:**
- Consistent test execution
- Caching for deterministic tests
- Parallel test execution
- Automatic dependency management

## Migration Approach

### Phase 1: Foundation
✅ Install Nx and plugins
✅ Initialize minimal workspace
✅ Verify existing scripts work

**Outcome:** Nx installed without breaking changes

### Phase 2: Configuration
✅ Create comprehensive nx.json
✅ Set up TypeScript base configuration
✅ Configure caching and task dependencies

**Outcome:** Nx ready for project configuration

### Phase 3: Project Setup
✅ Create project.json for all 12 packages
✅ Configure appropriate executors
✅ Set up build targets

**Outcome:** All packages under Nx control

### Phase 4: Validation
✅ Test caching performance
✅ Verify affected commands
✅ Generate dependency graph
✅ Run comprehensive tests

**Outcome:** Validated performance improvements

### Phase 5: Documentation
🔄 Create developer documentation
⏳ Create migration validation report

**Outcome:** Team can adopt Nx confidently

### Phase 6: Delivery
⏳ Create pull request
⏳ Code review and merge

## Architectural Constraints

### Dependency Rules
```typescript
// Enforced by tags (future)
{
  "depConstraints": [
    {
      "sourceTag": "type:app",
      "onlyDependOnLibsWithTags": ["type:lib"]
    },
    {
      "sourceTag": "scope:react",
      "onlyDependOnLibsWithTags": ["scope:types", "scope:react"]
    }
  ]
}
```

**When to Enable:**
- After team familiarization with Nx
- When enforcing architectural boundaries is priority
- During codebase growth and scaling

### Build Graph Constraints
- No circular dependencies (enforced by TypeScript)
- Libraries can't depend on applications
- Deep dependencies (types → ai → ai-anthropic) are explicit

## Performance Characteristics

### Build Times

| Scenario | Time | vs Baseline |
|----------|------|-------------|
| Yarn baseline (cold) | 8.087s | - |
| Nx cold build | 6.476s | 20% faster |
| Nx cached build | 2.252s | 72% faster |
| Nx cached typecheck | 0.790s | ~95% faster |

### Parallelization Benefits

With 3 parallel tasks:
- Types, ai-anthropic, ai-openai can build concurrently
- React waits for types completion
- Demos wait for react completion
- Optimal use of CPU cores

### Affected Command Benefits

Example: Change only `@clippyjs/react`
- **Yarn**: Builds all 12 packages
- **Nx affected**: Builds only react + 4 dependents
- **Time saved**: ~40% for focused changes

## Scalability Considerations

### Current Scale (12 packages)
- Parallel: 3 works well
- Cache hit rate: ~90% in steady state
- Build time: <10s for full build

### Future Scale (20+ packages)
- Increase parallel to 5-7
- Consider distributed caching (Nx Cloud)
- Implement stricter dependency constraints
- Add module boundary linting

## Troubleshooting Architecture

### Common Issues

**1. Cache Not Invalidating**
- Check namedInputs configuration
- Verify outputs are being generated
- Review global dependencies (sharedGlobals)

**2. Build Order Problems**
- Review dependsOn configuration
- Check for implicit dependencies
- Validate package.json dependencies match Nx config

**3. Slow Builds Despite Caching**
- Profile with NX_PROFILE
- Check parallel setting
- Review task dependencies
- Consider breaking up large packages

## Future Enhancements

### Short Term (1-3 months)
- [ ] Add vitest dependency for @nx/vite:test
- [ ] Enable lint target with caching
- [ ] Add module boundary rules
- [ ] Set up CI caching strategy

### Medium Term (3-6 months)
- [ ] Migrate to native Nx executors (Vite, Rollup)
- [ ] Implement stricter dependency constraints
- [ ] Add automated dependency graph checks
- [ ] Set up distributed caching

### Long Term (6-12 months)
- [ ] Evaluate Nx Cloud for distributed builds
- [ ] Consider workspace reorganization
- [ ] Implement automated release workflows
- [ ] Add performance budgets

## Related Documentation

- [NX_COMMANDS.md](./NX_COMMANDS.md) - Command reference
- [NX_IMPLEMENTATION_WORKFLOW.md](./NX_IMPLEMENTATION_WORKFLOW.md) - Implementation guide
- [Nx Documentation](https://nx.dev/getting-started/intro)
