# ClippyJS Suggested Commands

**Last Updated**: 2025-11-11
**Build System**: Nx 22.0.3 + Yarn 4 Workspaces

## Quick Reference

### Most Common Commands (Nx-Enhanced)
```bash
# Build (with intelligent caching!)
yarn nx:build              # Build all packages
yarn nx:build:affected     # Build only changed packages

# Test (with caching!)
yarn nx:test               # Test all packages
yarn nx:test:affected      # Test only changed packages

# Typecheck (with caching!)
yarn nx:typecheck          # Typecheck all packages

# Utilities
yarn nx:graph              # Visualize dependencies
yarn nx:reset              # Clear cache
```

## Nx Build Commands (Recommended)

### Build All Packages
```bash
yarn nx:build              # All packages with caching (2-6s)
yarn nx run-many --target=build --all
```

### Build Affected (Changed) Packages
```bash
yarn nx:build:affected     # Only changed + dependents
yarn nx affected --target=build --base=master
```

### Build Specific Package
```bash
yarn nx run @clippyjs/types:build
yarn nx run @clippyjs/react:build
yarn nx run @clippyjs/ai:build
yarn nx run @clippyjs/ai-anthropic:build
yarn nx run @clippyjs/ai-openai:build
```

## Nx Test Commands

### Test All Packages
```bash
yarn nx:test               # All tests with caching
yarn nx run-many --target=test --all
```

### Test Affected Packages
```bash
yarn nx:test:affected      # Only changed + dependents
yarn nx affected --target=test --base=master
```

### Test Specific Package
```bash
yarn nx run @clippyjs/react:test
yarn nx run @clippyjs/ai:test
yarn nx run @clippyjs/ai-anthropic:test
```

## Nx Typecheck Commands

### Typecheck All
```bash
yarn nx:typecheck          # All packages with caching
yarn nx run-many --target=typecheck --all
```

### Typecheck Affected
```bash
yarn nx:typecheck:affected  # Only changed packages
yarn nx affected --target=typecheck --base=master
```

## Nx Utility Commands

### Dependency Graph
```bash
yarn nx:graph              # Interactive visualization in browser
yarn nx graph --focus=@clippyjs/react  # Focus on specific package
```

### Cache Management
```bash
yarn nx:reset              # Clear Nx cache
yarn nx show cache-stats   # View cache statistics
```

### Dry Run / Affected Preview
```bash
yarn nx affected --target=build --dry-run  # See what would run
yarn nx affected:graph     # Visualize affected packages
```

## Traditional Yarn Commands (Still Work!)

### Package Management
```bash
yarn install               # Install all workspace dependencies
yarn workspaces list       # List all workspaces
```

### Build Commands (Non-Cached)
```bash
yarn build                 # Build primary packages
yarn build:all             # Build all with scripts
yarn workspace @clippyjs/react build  # Build specific package
```

### Clean Commands
```bash
yarn clean                 # Clean dist directories
yarn clean:all             # Clean + remove node_modules
```

## Development Commands

### Demo Applications
```bash
yarn demo                  # Start vanilla JS demo (HTTP server)
yarn demo:react            # Start React demo app (Vite)
```

### Storybook
```bash
yarn storybook             # Start Storybook dev server
yarn storybook:build       # Build static Storybook
```

## Package-Specific Commands

### @clippyjs/types
```bash
# Nx (recommended)
yarn nx run @clippyjs/types:build
yarn nx run @clippyjs/types:typecheck
yarn nx run @clippyjs/types:clean

# Yarn workspace
yarn workspace @clippyjs/types build
```

### @clippyjs/ai
```bash
# Nx
yarn nx run @clippyjs/ai:build
yarn nx run @clippyjs/ai:test
yarn nx run @clippyjs/ai:typecheck

# Yarn
yarn workspace @clippyjs/ai build
yarn workspace @clippyjs/ai test
```

### @clippyjs/react
```bash
# Nx (caching + faster)
yarn nx run @clippyjs/react:build
yarn nx run @clippyjs/react:test
yarn nx run @clippyjs/react:test:integration
yarn nx run @clippyjs/react:typecheck

# Yarn workspace
yarn workspace @clippyjs/react build
yarn workspace @clippyjs/react test
yarn workspace @clippyjs/react test:ui
yarn workspace @clippyjs/react test:coverage
```

### @clippyjs/ai-anthropic / @clippyjs/ai-openai
```bash
# Nx
yarn nx run @clippyjs/ai-anthropic:build
yarn nx run @clippyjs/ai-openai:build

# Yarn
yarn workspace @clippyjs/ai-anthropic build
yarn workspace @clippyjs/ai-openai build
```

## Git Commands (macOS/Darwin)

### Status and Branches
```bash
git status                 # Check working tree
git branch                 # List branches
git log --oneline -10      # Recent commits
```

### Common Workflows
```bash
git checkout -b feature/name  # Create feature branch
git add .                  # Stage changes
git commit -m "message"    # Commit
git push origin branch     # Push to remote
```

## Performance Comparison

### Nx vs Yarn Performance
```bash
# Cold build
yarn build:all             # ~8.1s
yarn nx:build              # ~6.5s (20% faster)

# Cached build
yarn build:all             # ~8.1s (always rebuilds)
yarn nx:build              # ~2.3s (72% faster, 3x speedup!)

# Affected build (when only 1 package changed)
yarn build:all             # ~8.1s (rebuilds everything)
yarn nx:build:affected     # ~3-4s (40% time savings)
```

## Common Workflows

### Full Development Cycle (Nx-Enhanced)
```bash
# 1. Make changes to any package
# 2. Build affected packages only
yarn nx:build:affected

# 3. Test affected packages
yarn nx:test:affected

# 4. Typecheck
yarn nx:typecheck:affected

# 5. View dependency graph
yarn nx:graph

# 6. Commit changes
git add .
git commit -m "feat: description"
```

### Pre-Commit Checklist (Nx-Optimized)
```bash
yarn nx:build:affected     # Build changed packages
yarn nx:test:affected      # Test changed packages
yarn nx:typecheck:affected # Typecheck changed packages
```

### Full Clean and Rebuild
```bash
yarn clean:all             # Remove artifacts
yarn install               # Reinstall dependencies
yarn nx:reset              # Clear Nx cache
yarn nx:build              # Build with fresh cache
```

## Troubleshooting Commands

### Cache Issues
```bash
yarn nx:reset              # Clear Nx cache
yarn nx:build --verbose    # Build with detailed output
yarn nx show cache-stats   # View cache statistics
```

### Build Failures
```bash
# Clear everything and rebuild
yarn clean
yarn nx:reset
yarn nx:build

# Build with more information
yarn nx:build --verbose
```

### View What's Affected
```bash
yarn nx affected --target=build --dry-run
yarn nx affected:graph
```

## Performance Tips

### Maximize Caching Benefits
```bash
# Use affected commands for focused changes
yarn nx:build:affected  # Instead of yarn nx:build

# Clear cache when switching major branches
git checkout main
yarn nx:reset
yarn nx:build
```

### View Build Performance
```bash
# Profile a build
NX_PROFILE=profile.json yarn nx:build

# Check cache statistics
yarn nx show cache-stats
```

## System Utilities (macOS/Darwin)

### File Operations
```bash
ls -la                     # List files
find . -name "pattern"     # Find files
grep -r "pattern" src/     # Search in files
```

### Directory Navigation
```bash
pwd                        # Current directory
cd path/to/dir             # Change directory
cd ..                      # Go up one level
```

## Quick Reference Card

### When to Use Nx vs Yarn
```bash
# Use Nx commands (faster with caching):
yarn nx:build              # ✅ Much faster with cache
yarn nx:test               # ✅ Caches test results
yarn nx:typecheck          # ✅ Caches validation
yarn nx:build:affected     # ✅ Only build changed code

# Traditional Yarn still works (no caching):
yarn build                 # ⚠️ Always rebuilds everything
yarn test                  # ⚠️ Always runs all tests
```

### Common Gotchas
```bash
# DON'T: Run full build when only one package changed
yarn build:all             # Rebuilds everything unnecessarily

# DO: Use affected commands
yarn nx:build:affected     # Only rebuilds what changed

# DON'T: Clear cache unnecessarily
yarn nx:reset && yarn nx:build  # Only when troubleshooting

# DO: Let cache work for you
yarn nx:build              # Uses cache automatically
```

## Documentation Links

- [NX_COMMANDS.md](./docs/NX_COMMANDS.md) - Complete Nx command reference
- [NX_ARCHITECTURE.md](./docs/NX_ARCHITECTURE.md) - How Nx is configured
- [WORKSPACE_GUIDE.md](./WORKSPACE_GUIDE.md) - Complete workspace guide
- [Nx Documentation](https://nx.dev) - Official Nx docs