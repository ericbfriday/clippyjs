# Nx Commands Reference

Quick reference guide for common Nx commands in the ClippyJS workspace.

## Table of Contents
- [Build Commands](#build-commands)
- [Test Commands](#test-commands)
- [Typecheck Commands](#typecheck-commands)
- [Cache Management](#cache-management)
- [Visualization](#visualization)
- [Affected Commands](#affected-commands)
- [Workspace Operations](#workspace-operations)

## Build Commands

### Build All Packages
```bash
yarn nx:build
# or
yarn nx run-many --target=build --all
```

### Build Specific Package
```bash
yarn nx run @clippyjs/react:build
yarn nx run @clippyjs/types:build
yarn nx run @clippyjs/ai:build
```

### Build Only Changed Packages
```bash
yarn nx:build:affected
# or
yarn nx affected --target=build
```

### Build with Verbose Output
```bash
yarn nx run-many --target=build --all --verbose
```

## Test Commands

### Test All Packages
```bash
yarn nx:test
# or
yarn nx run-many --target=test --all
```

### Test Specific Package
```bash
yarn nx run @clippyjs/react:test
yarn nx run @clippyjs/react:test:integration
```

### Test Only Changed Packages
```bash
yarn nx:test:affected
# or
yarn nx affected --target=test
```

**Note**: The @nx/vite:test executor requires vitest as a dependency. Tests currently run via existing Yarn workspace scripts.

## Typecheck Commands

### Typecheck All Packages
```bash
yarn nx:typecheck
# or
yarn nx run-many --target=typecheck --all
```

### Typecheck Specific Package
```bash
yarn nx run @clippyjs/types:typecheck
yarn nx run @clippyjs/react:typecheck
```

### Typecheck Only Changed Packages
```bash
yarn nx:typecheck:affected
# or
yarn nx affected --target=typecheck
```

## Cache Management

### View Cache Statistics
```bash
yarn nx show cache-stats
```

### Clear Nx Cache
```bash
yarn nx:reset
# or
yarn nx reset
```

### Skip Cache for Single Command
```bash
yarn nx run @clippyjs/react:build --skip-nx-cache
```

### Clear and Rebuild
```bash
yarn nx:reset && yarn nx:build
```

## Visualization

### View Dependency Graph
```bash
yarn nx:graph
# or
yarn nx graph
```

This opens an interactive visualization in your browser showing:
- Package dependencies
- Task dependencies
- Affected packages for changes

### Generate Static Graph
```bash
yarn nx graph --file=graph.html
```

### View Affected Graph
```bash
yarn nx affected:graph
```

## Affected Commands

Nx's "affected" commands only run targets for packages that have changed since a base commit.

### Compare Against Master
```bash
yarn nx affected --target=build --base=master
yarn nx affected --target=test --base=master
yarn nx affected --target=typecheck --base=master
```

### Compare Against Specific Commit
```bash
yarn nx affected --target=build --base=HEAD~1
yarn nx affected --target=build --base=abc123
```

### Compare Range
```bash
yarn nx affected --target=build --base=origin/master --head=HEAD
```

### View What's Affected
```bash
yarn nx affected --target=build --dry-run
```

## Workspace Operations

### Run Multiple Targets in Sequence
```bash
yarn nx run-many --target=build,test,typecheck --all
```

### Parallel Execution Control
```bash
# Limit parallel processes
yarn nx run-many --target=build --all --parallel=5

# Use maximum parallelism
yarn nx run-many --target=build --all --parallel
```

### Clean Specific Package
```bash
yarn nx run @clippyjs/types:clean
yarn nx run @clippyjs/react:clean
```

### View Project Configuration
```bash
yarn nx show project @clippyjs/react
yarn nx show project @clippyjs/types
```

### List All Projects
```bash
yarn nx show projects
```

### Show Project Graph
```bash
yarn nx graph --focus=@clippyjs/react
```

## Advanced Usage

### Run with Configuration
```bash
yarn nx run @clippyjs/react:build:production
```

### Watch Mode
```bash
yarn nx watch --all -- yarn nx affected --target=build
```

### Generate Reports
```bash
yarn nx run-many --target=build --all --output-style=stream
```

### Debug Performance
```bash
NX_PROFILE=profile.json yarn nx run-many --target=build --all
```

## Environment Variables

### Daemon Control
```bash
# Disable Nx daemon
NX_DAEMON=false yarn nx:build

# Skip Nx cloud
NX_SKIP_NX_CLOUD=true yarn nx:build
```

### Cache Directory
```bash
# Custom cache location
NX_CACHE_DIRECTORY=.custom-cache yarn nx:build
```

## Comparing Yarn vs Nx Commands

| Yarn Command | Nx Equivalent | Benefit |
|--------------|---------------|---------|
| `yarn build:all` | `yarn nx:build` | Caching, parallelization |
| `yarn test:all` | `yarn nx:test` | Only test affected packages |
| `yarn typecheck` | `yarn nx:typecheck` | Faster with cache |
| Manual dependency order | `yarn nx:build` | Automatic dependency resolution |

## Migration Tips

### Gradual Adoption
You can use both Yarn and Nx commands side-by-side:
- Continue using existing Yarn workspace scripts
- Add Nx commands for better performance
- Gradually migrate workflows to Nx

### Cache Benefits
First run after cache clear:
```bash
yarn nx:reset
yarn nx:build  # 6.476s
```

Subsequent runs with cache:
```bash
yarn nx:build  # 2.252s (3x faster!)
```

### Affected Benefits
Only build what changed:
```bash
# Make changes to @clippyjs/react
yarn nx:build:affected  # Only builds react + dependents
```

## Performance Tips

1. **Use affected commands** when working on specific features
2. **Clear cache** when switching branches with major changes
3. **Limit parallelism** on resource-constrained systems
4. **Use --verbose** when debugging build issues
5. **Check cache stats** to verify caching is working

## Troubleshooting

### Cache Not Working
```bash
# Reset cache and verify
yarn nx:reset
yarn nx:build --verbose
```

### Build Order Issues
```bash
# View task graph
yarn nx graph --focus=@clippyjs/react
```

### Slow Builds
```bash
# Profile execution
NX_PROFILE=profile.json yarn nx:build
```

### Affected Not Detecting Changes
```bash
# Check base comparison
yarn nx affected --target=build --base=master --dry-run
```

## Related Documentation

- [NX_ARCHITECTURE.md](./NX_ARCHITECTURE.md) - Architecture decisions and patterns
- [NX_IMPLEMENTATION_WORKFLOW.md](./NX_IMPLEMENTATION_WORKFLOW.md) - Implementation details
- [Official Nx Documentation](https://nx.dev/getting-started/intro)
