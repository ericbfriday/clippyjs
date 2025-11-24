# Nx Quick Start Guide - ClippyJS

**Quick reference for developers working with the Nx-powered ClippyJS monorepo**

---

## Essential Nx Commands

### Building

```bash
# Build single package
nx build @clippyjs/react

# Build all packages
nx run-many --target=build --all

# Build only what changed since master
nx affected:build --base=master

# Build with verbose output
nx build @clippyjs/react --verbose
```

### Testing

```bash
# Test single package
nx test @clippyjs/react

# Test all packages
nx run-many --target=test --all

# Test only affected packages
nx affected:test --base=master

# Test with coverage
nx test @clippyjs/react --coverage
```

### Type Checking

```bash
# Typecheck single package
nx typecheck @clippyjs/react

# Typecheck all
nx run-many --target=typecheck --all

# Typecheck affected
nx affected:typecheck --base=master
```

### Linting

```bash
# Lint single package
nx lint @clippyjs/react

# Lint all packages
nx run-many --target=lint --all

# Lint affected
nx affected:lint --base=master
```

### Cleaning

```bash
# Clean single package
nx clean @clippyjs/react

# Clean all packages
nx run-many --target=clean --all
```

---

## Caching

### View Cache Status

```bash
# Show cache info
nx show project @clippyjs/react --web

# Clear cache
nx reset
```

### Understanding Cache

Nx caches task outputs based on inputs. When nothing changes, tasks complete instantly.

**First run:** Executes normally, stores result in cache  
**Second run:** Retrieves from cache (< 1 second)

---

## Affected Commands

Affected commands only run tasks on packages that changed:

```bash
# What's affected since master?
nx affected:graph --base=master

# Build affected
nx affected:build --base=master

# Test affected
nx affected:test --base=master

# Run affected with custom base
nx affected:build --base=HEAD~3
```

---

## Dependency Graph

### Visualize Dependencies

```bash
# Open interactive graph
nx graph

# Show affected in graph
nx affected:graph --base=master

# Export graph as JSON
nx graph --file=graph.json
```

The dependency graph shows:
- Package dependencies
- Build order
- Affected packages
- Task dependencies

---

## Workspace Analysis

### List Projects

```bash
# List all projects
nx show projects

# List affected projects
nx show projects --affected --base=master

# Show project details
nx show project @clippyjs/react
```

### Show Configuration

```bash
# Show Nx configuration
nx show projects --with-target=build

# Show project.json for package
cat packages/react/project.json
```

---

## Development Workflow

### Standard Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes to packages/react/src/...

# 3. Build affected
nx affected:build --base=master

# 4. Test affected
nx affected:test --base=master

# 5. Commit changes
git add .
git commit -m "feat(react): add new feature"

# 6. Push
git push origin feature/my-feature
```

### Fast Development Loop

```bash
# Watch mode for tests (if configured)
nx test @clippyjs/react --watch

# Build on file change (if watch configured)
nx build @clippyjs/react --watch
```

---

## Publishing Workflow

### Dry Run

```bash
# See what would be published
nx release --dry-run

# Publish specific package (dry run)
nx release publish @clippyjs/react --dry-run
```

### Actual Publishing

```bash
# Version and publish
nx release

# Publish without versioning
nx release publish

# Skip version prompt
nx release --version=minor
```

---

## Parallel Execution

Nx runs tasks in parallel when possible:

```bash
# Run with max parallelism
nx run-many --target=build --all --parallel=10

# Run sequentially
nx run-many --target=build --all --parallel=1

# Use default (configured in nx.json)
nx run-many --target=build --all
```

---

## Advanced Usage

### Run Specific Target Configuration

```bash
# Run production build
nx build @clippyjs/react --configuration=production

# Run with custom options
nx build @clippyjs/react --watch --verbose
```

### Skip Cache

```bash
# Force rebuild (ignore cache)
nx build @clippyjs/react --skip-nx-cache

# Run without cache globally
NX_SKIP_NX_CACHE=true nx build @clippyjs/react
```

### Debug Mode

```bash
# Verbose logging
nx build @clippyjs/react --verbose

# Show task graph
nx show projects --affected --with-target=build --base=master
```

---

## Common Patterns

### Before Committing

```bash
# Build affected packages
nx affected:build --base=master

# Test affected packages
nx affected:test --base=master

# Typecheck affected
nx affected:typecheck --base=master

# Lint affected
nx affected:lint --base=master
```

### After Pulling Changes

```bash
# Rebuild affected (since last pull)
nx affected:build --base=origin/master

# Or rebuild everything (fast with cache)
nx run-many --target=build --all
```

### Working on Dependent Packages

```bash
# Build package and all dependencies
nx build @clippyjs/ai-anthropic --with-deps

# Test with dependencies
nx test @clippyjs/ai-anthropic --with-deps
```

---

## Performance Tips

1. **Use affected commands** - Only build what changed
2. **Trust the cache** - Second runs are instant
3. **Parallel execution** - Let Nx run tasks in parallel
4. **Keep dependencies clean** - Reduces affected packages
5. **Use Nx Console** - VS Code extension for visual task running

---

## Troubleshooting

### Cache Issues

```bash
# Clear cache and rebuild
nx reset
nx run-many --target=build --all
```

### Dependency Issues

```bash
# Visualize dependency graph
nx graph

# Show affected packages
nx affected:graph --base=master
```

### Build Issues

```bash
# Run with verbose output
nx build @clippyjs/react --verbose

# Skip cache to force rebuild
nx build @clippyjs/react --skip-nx-cache

# Clean and rebuild
nx clean @clippyjs/react
nx build @clippyjs/react
```

---

## VS Code Integration

Install **Nx Console** extension for:
- Visual task runner
- Interactive dependency graph
- Project explorer
- Quick commands

```bash
# Open Nx Console in VS Code
code --install-extension nrwl.angular-console
```

---

## Cheat Sheet

| Task | Command |
|------|---------|
| Build one | `nx build <project>` |
| Build all | `nx run-many --target=build --all` |
| Build affected | `nx affected:build` |
| Test one | `nx test <project>` |
| Test affected | `nx affected:test` |
| Show graph | `nx graph` |
| Clear cache | `nx reset` |
| List projects | `nx show projects` |
| Publish (dry) | `nx release --dry-run` |

---

## Getting Help

```bash
# Show Nx help
nx help

# Show command help
nx build --help

# Show project details
nx show project <project>

# List available plugins
nx list
```

---

## Migrating from Yarn

| Yarn Command | Nx Equivalent |
|--------------|---------------|
| `yarn build` | `nx run-many --target=build --all` |
| `yarn workspace X build` | `nx build X` |
| `yarn test` | `nx run-many --target=test --all` |
| `yarn clean` | `nx run-many --target=clean --all` |

**Note:** All `yarn` commands still work! Nx is additive.

---

## Additional Resources

- **Nx Documentation:** https://nx.dev
- **Migration Plan:** docs/NX_MIGRATION_PLAN.md
- **Implementation Workflow:** docs/NX_IMPLEMENTATION_WORKFLOW.md
- **Nx Graph:** http://localhost:4211 (when running `nx graph`)

---

**Last Updated:** November 10, 2025  
**Nx Version:** 21.1+
