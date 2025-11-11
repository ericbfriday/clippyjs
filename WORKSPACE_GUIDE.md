# ClippyJS Workspace Guide

**Last Updated**: 2025-11-11
**Workspace Manager**: Yarn 4 with PnP + Nx
**Build System**: Nx 22.0.3 with intelligent caching

## 📦 Workspace Structure

```
clippyjs/
├── packages/
│   ├── types/                   @clippyjs/types (Foundation)
│   ├── ai/                      @clippyjs/ai (AI integration)
│   ├── ai-anthropic/            @clippyjs/ai-anthropic (Anthropic provider)
│   ├── ai-openai/               @clippyjs/ai-openai (OpenAI provider)
│   ├── react/                   @clippyjs/react (React components)
│   ├── storybook/               @clippyjs/storybook (Component docs)
│   ├── clippyjs-lib/            clippyjs (Legacy library)
│   ├── clippyjs-demo-react/     React demo app
│   ├── clippyjs-demo-vanilla/   Vanilla JS demo
│   └── templates/
│       ├── nextjs-starter/      Next.js 15 + ClippyJS starter
│       └── vite-starter/        Vite + ClippyJS starter
├── nx.json                      Nx workspace configuration
├── tsconfig.base.json          TypeScript path mappings
└── package.json                Root workspace configuration
```

## 🎯 Package Purposes

### Production Packages (Publishable)

**@clippyjs/react** - Primary React library
- Modern React 19 hooks and components
- TypeScript support
- SSR compatible
- Comprehensive testing suite

**@clippyjs/core** - Core library (DEPRECATED)
- Legacy vanilla JS implementation
- Kept for backward compatibility
- Use @clippyjs/react for new projects

### Development Packages (Private)

**@clippyjs/storybook** - Interactive documentation
- Component playground
- Visual testing reference
- Development environment

**Demos** - Example implementations
- `clippyjs-demo-react`: React demo app
- `clippyjs-demo-vanilla`: Vanilla JS demo

**Templates** - Starter projects
- `clippyjs-nextjs-starter`: Next.js 15 template
- `clippyjs-vite-starter`: Vite template

## 🚀 Root Commands

### Nx Build Commands (Recommended - with caching!)
```bash
# Build all packages with intelligent caching
yarn nx:build

# Build only packages that changed
yarn nx:build:affected

# Build specific package
yarn nx run @clippyjs/react:build
yarn nx run @clippyjs/types:build

# Traditional Yarn commands still work
yarn build
yarn build:all
```

### Nx Test Commands (with caching!)
```bash
# Test all packages
yarn nx:test

# Test only changed packages
yarn nx:test:affected

# Test specific package
yarn nx run @clippyjs/react:test
```

### Nx Typecheck Commands (with caching!)
```bash
# Typecheck all packages
yarn nx:typecheck

# Typecheck only changed packages
yarn nx:typecheck:affected

# Traditional typecheck still works
yarn typecheck
```

### Nx Utility Commands
```bash
# Visualize dependency graph
yarn nx:graph

# Clear Nx cache
yarn nx:reset

# Run any Nx command
yarn nx <command>
```

### Development Commands
```bash
# Start Storybook
yarn storybook

# Build Storybook for deployment
yarn storybook:build

# Run React demo
yarn demo:react

# Serve static demo files
yarn demo
```

### Testing Commands
```bash
# Run @clippyjs/react tests
yarn test

# Run all tests (integration + visual)
yarn test:all

# Lint all packages
yarn lint

# Type check all packages
yarn typecheck
```

### Workspace Management
```bash
# List all workspaces
yarn workspaces list

# Run command in specific workspace
yarn workspace @clippyjs/react <command>

# Run command across all workspaces
yarn workspaces foreach -Apt run <command>

# Install dependencies for all workspaces
yarn install
```

## 🎯 Performance Benefits

### Nx Caching
- **Cold build**: ~6.5s (20% faster than Yarn alone)
- **Cached build**: ~2.3s (72% faster, 3x speedup!)
- **Cached typecheck**: ~0.8s (~84% faster)

### Affected Commands
- Only builds/tests changed packages and their dependents
- Typical time savings: 40-60% for focused changes

### Example Workflow
```bash
# First build (cache miss)
yarn nx:build              # 6.5s

# Rebuild without changes (cache hit)
yarn nx:build              # 2.3s (3x faster!)

# Change only @clippyjs/react
yarn nx:build:affected     # Only builds react + dependents
```

## 📋 Package-Specific Commands

### @clippyjs/types (Foundation Package)
```bash
# Nx commands (with caching)
yarn nx run @clippyjs/types:build
yarn nx run @clippyjs/types:typecheck
yarn nx run @clippyjs/types:clean

# Traditional Yarn (still works)
yarn workspace @clippyjs/types build
```

### @clippyjs/ai (AI Integration)
```bash
# Nx commands
yarn nx run @clippyjs/ai:build
yarn nx run @clippyjs/ai:test
yarn nx run @clippyjs/ai:typecheck

# Yarn workspace
yarn workspace @clippyjs/ai build
yarn workspace @clippyjs/ai test
```

### @clippyjs/react
```bash
# Nx commands (recommended)
yarn nx run @clippyjs/react:build
yarn nx run @clippyjs/react:test
yarn nx run @clippyjs/react:test:integration
yarn nx run @clippyjs/react:typecheck

# Yarn workspace (still works)
yarn workspace @clippyjs/react build
yarn workspace @clippyjs/react test
yarn workspace @clippyjs/react test:ui
yarn workspace @clippyjs/react test:coverage
yarn workspace @clippyjs/react test:ci
```

### @clippyjs/ai-anthropic / @clippyjs/ai-openai
```bash
# Nx commands
yarn nx run @clippyjs/ai-anthropic:build
yarn nx run @clippyjs/ai-anthropic:test
yarn nx run @clippyjs/ai-openai:build
yarn nx run @clippyjs/ai-openai:test

# Yarn workspace
yarn workspace @clippyjs/ai-anthropic build
yarn workspace @clippyjs/ai-openai build
```

## 🔗 Dependency Graph

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

**View interactive graph:**
```bash
yarn nx:graph
```

## 🛠️ Development Workflow

### Nx-Enhanced Workflow (Recommended)
```bash
# 1. Make changes to any package
# 2. Build only what changed
yarn nx:build:affected

# 3. Test only what's affected
yarn nx:test:affected

# 4. Typecheck affected packages
yarn nx:typecheck:affected

# 5. Visualize what's affected
yarn nx affected --target=build --dry-run
```

### Making Changes to @clippyjs/react
```bash
# 1. Make code changes
# 2. Build with caching (Nx automatically rebuilds dependencies)
yarn nx run @clippyjs/react:build

# 3. Test changes
yarn nx run @clippyjs/react:test

# 4. Test in Storybook
yarn storybook

# 5. Optional: Test in demo
yarn demo:react
```

### Working on Multiple Packages
```bash
# Change @clippyjs/types and @clippyjs/react
# Nx automatically handles dependency order
yarn nx:build:affected

# Or build specific packages in order
yarn nx run @clippyjs/types:build
yarn nx run @clippyjs/react:build  # Uses types from cache
```

## ⚙️ Nx Configuration

### Caching Strategy
- **Build**: Caches compiled outputs, invalidates on source changes
- **Test**: Caches test results, invalidates on code/test changes
- **Typecheck**: Caches validation results

### Cache Location
```bash
node_modules/.cache/nx
```

### Clear Cache
```bash
yarn nx:reset
```

### View Cache Stats
```bash
yarn nx show cache-stats
```

## 🔍 Troubleshooting

### TypeScript Output Directory Issues

**Problem**: TypeScript files compiled to `dist/src/` instead of `dist/`

**Root Cause**: Nx `@nx/js:tsc` executor may not respect `rootDir` configuration in `tsconfig.json` when it conflicts with `tsconfig.base.json`.

**Solution**: Use `nx:run-commands` executor instead:

```json
// packages/types/project.json
{
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "command": "yarn workspace @clippyjs/types build"
      }
    }
  }
}
```

**tsconfig.json Configuration**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "target": "ES2020"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### TypeScript Project References Validation Errors

**Problem**: Error TS6305: "Output file has not been built from source file"

**Root Cause**: TypeScript project references validate that `.d.ts` files were actually built from their source `.ts` files.

**Solution Steps**:
1. Ensure dependency packages are built first
2. Clean incremental build cache: `rm -f tsconfig.tsbuildinfo`
3. Build dependencies without cache: `yarn nx run @clippyjs/types:build --skip-nx-cache`
4. Verify output structure matches expectations

### Stale Build Artifacts

**Problem**: Inconsistent build outputs or reference errors

**Solution**:
```bash
# Remove incremental build info files
find . -name "tsconfig.tsbuildinfo" -delete

# Clean and rebuild
yarn nx run @clippyjs/types:clean
yarn nx run @clippyjs/types:build
```

### Demo or Storybook Won't Start

**Problem**: Demo or Storybook fails to load or shows errors

**Solutions**:
1. Verify build: `yarn nx run @clippyjs/react:build`
2. Check console: Open browser DevTools
3. Verify server: Ensure demo is running on correct port
4. Clear cache: Hard refresh (⌘+Shift+R or Ctrl+Shift+R)

**For Storybook specifically**:
```bash
# Known issue: Yarn PnP resolution with Storybook
# Workaround: Use React demo instead
yarn demo:react
```

### "Cannot find module" errors
```bash
# Reinstall dependencies
yarn install
```

### Cache Issues
```bash
# Clear Nx cache
yarn nx:reset

# Clear and rebuild
yarn nx:reset && yarn nx:build
```

### Build failures
```bash
# Clean and rebuild with Nx
yarn clean
yarn nx:build

# Or with traditional Yarn
yarn clean
yarn build
```

### "Tasks not run because dependencies failed"
This is expected when a dependency has build errors. Nx won't run dependent tasks if upstream tasks fail. Fix the dependency first.

### Performance seems slow
```bash
# Check if cache is being used
yarn nx:build --verbose

# View cache statistics
yarn nx show cache-stats
```

**For detailed troubleshooting**, see [NX_COMMANDS.md](./docs/NX_COMMANDS.md#troubleshooting)

## 📚 Additional Resources

- [Yarn Workspaces Documentation](https://yarnpkg.com/features/workspaces)
- [Nx Documentation](https://nx.dev)
- [Nx Commands Reference](./docs/NX_COMMANDS.md)
- [Nx Architecture](./docs/NX_ARCHITECTURE.md)
- [Migration Validation](./docs/MIGRATION_VALIDATION.md)
- [ClippyJS Documentation](./docs/)
- [Testing Guide](./packages/react/TESTING.md)

## ✅ Quick Health Check

```bash
# Verify workspace setup
yarn workspaces list

# Should show 12 workspaces + root
```

```bash
# Test Nx commands
yarn nx:build          # Should build all packages with caching
yarn nx:test           # Should run tests with caching
yarn nx:graph          # Should open dependency visualization
```

```bash
# Verify caching works
yarn nx:reset          # Clear cache
yarn nx:build          # First run: ~6.5s
yarn nx:build          # Second run: ~2.3s (cached!)
```

## 🎉 Nx Migration Complete!

**Workspace is now enhanced with Nx:**
- ✅ Intelligent build caching (20-72% faster)
- ✅ Affected-based commands (build only what changed)
- ✅ Dependency graph visualization
- ✅ All existing Yarn commands still work
- ✅ Zero breaking changes
- ✅ Production ready

**Quick Start with Nx:**
```bash
# See the speed difference
yarn nx:build              # Uses cache
yarn nx:build:affected     # Only changed packages
yarn nx:graph              # Visualize dependencies
```

**All traditional commands still work:**
```bash
yarn build
yarn test
yarn typecheck
```

For detailed Nx usage, see [NX_COMMANDS.md](./docs/NX_COMMANDS.md)