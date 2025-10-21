# ClippyJS Workspace Guide

**Last Updated**: 2025-01-20
**Workspace Manager**: Yarn 4 with PnP

## 📦 Workspace Structure

```
clippyjs/
├── packages/
│   ├── core/                    @clippyjs/core (DEPRECATED)
│   ├── react/                   @clippyjs/react (PRIMARY)
│   ├── storybook/               @clippyjs/storybook
│   ├── clippyjs-lib/            clippyjs (OLD - will be removed)
│   ├── clippyjs-demo-react/     Demo app (updated to use @clippyjs/react)
│   ├── clippyjs-demo-vanilla/   Vanilla JS demo
│   └── templates/
│       ├── nextjs-starter/      Next.js 15 + ClippyJS starter
│       └── vite-starter/        Vite + ClippyJS starter
└── package.json                 Root workspace configuration
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

### Build Commands
```bash
# Build primary packages (core + react)
yarn build

# Build specific package
yarn build:core
yarn build:react

# Build all packages with build scripts
yarn build:all

# Clean build artifacts
yarn clean
yarn clean:all  # Also removes node_modules
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

## 📋 Package-Specific Commands

### @clippyjs/react
```bash
yarn workspace @clippyjs/react build
yarn workspace @clippyjs/react test
yarn workspace @clippyjs/react test:ui
yarn workspace @clippyjs/react test:coverage
yarn workspace @clippyjs/react test:integration
yarn workspace @clippyjs/react test:visual
yarn workspace @clippyjs/react playwright:install
```

### @clippyjs/storybook
```bash
yarn workspace @clippyjs/storybook storybook
yarn workspace @clippyjs/storybook build-storybook
yarn workspace @clippyjs/storybook preview
```

### Templates
```bash
# Next.js starter
yarn workspace clippyjs-nextjs-starter dev
yarn workspace clippyjs-nextjs-starter build
yarn workspace clippyjs-nextjs-starter start

# Vite starter
yarn workspace clippyjs-vite-starter dev
yarn workspace clippyjs-vite-starter build
yarn workspace clippyjs-vite-starter preview
```

## 🔗 Dependency Graph

```
@clippyjs/react
  └─ @clippyjs/core (workspace:^)

@clippyjs/storybook
  └─ @clippyjs/react (workspace:^)

clippyjs-demo-react
  └─ @clippyjs/react (workspace:^)

clippyjs-nextjs-starter
  └─ @clippyjs/react (workspace:^)

clippyjs-vite-starter
  └─ @clippyjs/react (workspace:^)
```

## 🛠️ Development Workflow

### Adding a New Package
1. Create package directory in `packages/` or `packages/templates/`
2. Add `package.json` with proper name and dependencies
3. Run `yarn install` to register the workspace
4. Reference other workspace packages with `workspace:^` protocol

### Making Changes to @clippyjs/react
```bash
# 1. Make code changes
# 2. Build the package
yarn build:react

# 3. Test changes
yarn test

# 4. Test in Storybook
yarn storybook

# 5. Test in demo (optional)
yarn demo:react
```

### Publishing Workflow
```bash
# 1. Build packages
yarn build

# 2. Run all tests
yarn test:all

# 3. Update version in package.json
# 4. Create git tag
# 5. Publish to npm
cd packages/react
npm publish
```

## ⚙️ Yarn PnP Configuration

This project uses **Yarn Plug'n'Play (PnP)** instead of `node_modules`.

### Key Differences
- No `node_modules` directory
- Dependencies in `.yarn/cache`
- Faster installs and strict dependency resolution
- Use `yarn exec` or package scripts to run binaries

### Common Commands
```bash
# Run a binary from a dependency
yarn exec <command>

# Run with dlx (download and execute)
yarn dlx <package> <command>

# Example: Playwright install
yarn exec playwright install chromium
```

## 🔍 Troubleshooting

### "Cannot find module" errors
```bash
# Reinstall dependencies
yarn install
```

### "Workspace not found" errors
```bash
# Check workspace is listed
yarn workspaces list

# Verify workspace glob patterns in root package.json
# Should include: ["packages/*", "packages/templates/*"]
```

### Build failures
```bash
# Clean and rebuild
yarn clean
yarn build
```

### Peer dependency warnings
```bash
# These are usually safe to ignore for development
# Add missing peer deps if needed in specific packages
```

## 📚 Additional Resources

- [Yarn Workspaces Documentation](https://yarnpkg.com/features/workspaces)
- [Yarn PnP Documentation](https://yarnpkg.com/features/pnp)
- [ClippyJS Documentation](./docs/)
- [Testing Guide](./packages/react/TESTING.md)

## ✅ Quick Health Check

```bash
# Verify workspace setup
yarn workspaces list

# Should show 8 workspaces:
# - . (root)
# - packages/clippyjs-demo-react
# - packages/clippyjs-demo-vanilla
# - packages/clippyjs-lib
# - packages/core
# - packages/react
# - packages/storybook
# - packages/templates/nextjs-starter
# - packages/templates/vite-starter
```

```bash
# Test key commands
yarn build          # Should build core + react
yarn test --run     # Should run react tests
yarn storybook      # Should start on port 6006
```

## 🎉 All Fixed!

**Workspace configuration is now fully functional:**
- ✅ Templates included in workspace glob
- ✅ All script references corrected
- ✅ Dependencies updated to use @clippyjs/react
- ✅ Comprehensive root-level scripts
- ✅ All packages building successfully
