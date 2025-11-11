# ClippyJS Workspace Index

**Version**: 1.0.0  
**Last Updated**: 2025-11-10  
**Package Manager**: Yarn 4.9.2

---

## 📋 Table of Contents

1. [Workspace Overview](#workspace-overview)
2. [Package Structure](#package-structure)
3. [Dependency Management](#dependency-management)
4. [Scripts Reference](#scripts-reference)
5. [Documentation](#documentation)
6. [Development Workflow](#development-workflow)
7. [Publishing](#publishing)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ Workspace Overview

ClippyJS is a monorepo containing multiple packages for integrating AI-powered Clippy agents into web applications.

### Quick Stats
- **Packages**: 13 (5 published, 8 internal/demos)
- **Published Packages**: @clippyjs/* on npm
- **Test Framework**: Vitest 3.0.5
- **Build Tool**: Rollup 4.31.0
- **TypeScript**: 5.7.3
- **React**: 19.0.0

---

## 📦 Package Structure

### Published Packages

#### Core Libraries

**[@clippyjs/types](./packages/types)**
- **Version**: 1.0.0
- **Purpose**: Shared TypeScript types and interfaces
- **Dependencies**: None (pure types)
- **Build**: TypeScript compilation only

**[@clippyjs/react](./packages/react)**
- **Version**: 1.0.0
- **Purpose**: React components and hooks for Clippy agents
- **Dependencies**: @clippyjs/types
- **Peer Dependencies**: react ^18.0.0 || ^19.0.0
- **Build**: Rollup (CJS + ESM)
- **Tests**: Vitest (unit) + Playwright (E2E, integration, visual)

**[@clippyjs/ai](./packages/ai)**
- **Version**: 0.4.0
- **Purpose**: Core AI integration layer (provider interface, context, proactive behavior)
- **Dependencies**: @clippyjs/types
- **Peer Dependencies**: react ^18.0.0 || ^19.0.0
- **Build**: Rollup (CJS + ESM)
- **Tests**: Vitest (unit) + Playwright (E2E)

#### AI Provider Implementations

**[@clippyjs/ai-anthropic](./packages/ai-anthropic)**
- **Version**: 1.0.0
- **Purpose**: Anthropic Claude SDK provider
- **Dependencies**: @anthropic-ai/sdk ^0.68.0, @clippyjs/ai (workspace)
- **Build**: Rollup (CJS + ESM)
- **Tests**: Vitest

**[@clippyjs/ai-openai](./packages/ai-openai)**
- **Version**: 0.1.0
- **Purpose**: OpenAI GPT SDK provider
- **Dependencies**: openai ^6.8.1, @clippyjs/ai (workspace)
- **Build**: Rollup (CJS + ESM)
- **Tests**: Vitest

### Internal Packages

**[clippyjs-lib](./packages/clippyjs-lib)**
- **Purpose**: Legacy vanilla JS implementation (pre-React)
- **Status**: Maintenance mode

**[storybook](./packages/storybook)**
- **Purpose**: Component development and documentation
- **Framework**: Storybook 8.x
- **Usage**: `yarn storybook`

**[clippyjs-demo-react](./packages/clippyjs-demo-react)**
- **Purpose**: React demo application
- **Framework**: Vite + React 19
- **Usage**: `yarn demo:react`

**[clippyjs-demo-vanilla](./packages/clippyjs-demo-vanilla)**
- **Purpose**: Vanilla JS demo

**[clippyjs-demo-deno](./packages/clippyjs-demo-deno)**
- **Purpose**: Deno runtime demo

### Templates

**[packages/templates/nextjs-starter](./packages/templates/nextjs-starter)**
- **Purpose**: Next.js App Router starter template
- **Framework**: Next.js 15 + React 19

**[packages/templates/vite-starter](./packages/templates/vite-starter)**
- **Purpose**: Vite + React starter template

---

## 🔗 Dependency Management

### Alignment Status ✅

All packages now use aligned dependency versions (as of 2025-11-10):

| Dependency | Version | Packages |
|------------|---------|----------|
| TypeScript | ^5.7.3 | All |
| React | ^19.0.0 | react, ai, demos |
| React DOM | ^19.0.0 | react, ai, demos |
| Vitest | ^3.0.5 | react, ai, ai-providers |
| Rollup | ^4.31.0 | All build packages |
| @rollup/plugin-commonjs | ^28.0.2 | All build packages |
| @rollup/plugin-node-resolve | ^16.0.0 | All build packages |
| @rollup/plugin-typescript | ^12.1.2 | All build packages |
| @rollup/plugin-terser | ^0.4.4 | All build packages |
| @anthropic-ai/sdk | ^0.68.0 | ai-anthropic |
| openai | ^6.8.1 | ai-openai |

### Recent Updates (2025-11-10)
- ✅ Upgraded @anthropic-ai/sdk: 0.32.1 → 0.68.0
- ✅ Upgraded openai: 4.77.3 → 6.8.1
- ✅ Standardized Vitest: 2.1.8 → 3.0.5 across all packages
- ✅ Aligned Rollup plugins to latest versions

---

## 🛠️ Scripts Reference

### Root Workspace Scripts

#### Build Commands
```bash
yarn build                    # Build AI packages + React (optimized)
yarn build:all               # Build ALL packages (parallel)
yarn build:ai                # Build @clippyjs/ai
yarn build:ai-anthropic      # Build @clippyjs/ai-anthropic
yarn build:ai-openai         # Build @clippyjs/ai-openai
yarn build:react             # Build @clippyjs/react
```

#### Test Commands
```bash
yarn test                    # Test @clippyjs/react (unit)
yarn test:ai                 # Test @clippyjs/ai
yarn test:all                # Test ALL packages (parallel)
```

#### Development Commands
```bash
yarn demo                    # Start vanilla demo (http-server)
yarn demo:react              # Start React demo (Vite dev server)
yarn storybook               # Start Storybook dev server
yarn storybook:build         # Build Storybook static site
```

#### Quality Commands
```bash
yarn lint                    # Lint all packages (parallel)
yarn typecheck               # TypeScript build check
yarn typecheck:watch         # Watch mode type checking
```

#### Clean Commands
```bash
yarn clean                   # Clean build artifacts (ai, ai-anthropic, react)
yarn clean:all               # Clean everything including node_modules
yarn clean:types             # Clean @clippyjs/types build
```

#### Publishing Commands
```bash
yarn publish:types           # Publish @clippyjs/types
yarn publish:react           # Publish @clippyjs/react
yarn publish:ai              # Publish @clippyjs/ai
yarn publish:ai-anthropic    # Publish @clippyjs/ai-anthropic
yarn publish:ai-openai       # Publish @clippyjs/ai-openai
yarn publish:all             # Build and publish all packages
```

#### Versioning Commands
```bash
yarn version:patch           # Bump patch version (all packages)
yarn version:minor           # Bump minor version (all packages)
yarn version:major           # Bump major version (all packages)
```

### Package-Specific Scripts

Run package scripts with: `yarn workspace <package-name> <script>`

Example:
```bash
yarn workspace @clippyjs/react test
yarn workspace @clippyjs/ai build
```

---

## 📚 Documentation

### Main Documentation

**[README.md](./README.md)** - Project overview and quick start

**[docs/README.md](./docs/README.md)** - Comprehensive documentation index
- Getting started guides
- API reference
- Examples and tutorials
- Technical guides

**[CHANGELOG.md](./CHANGELOG.md)** - Version history and release notes

**[WORKSPACE_GUIDE.md](./WORKSPACE_GUIDE.md)** - Workspace management guide

**[AGENTS.md](./AGENTS.md)** - Agent personalities and modes

**[PUBLISHING.md](./PUBLISHING.md)** - Publishing workflow and checklist

### Technical Documentation

**[docs/MODES_GUIDE.md](./docs/MODES_GUIDE.md)** - Personality modes and configuration

**[docs/typescript-configuration.md](./docs/typescript-configuration.md)** - TypeScript setup

**[docs/react19-typescript-fixes.md](./docs/react19-typescript-fixes.md)** - React 19 migration notes

### API Reference

Located in `docs/api-reference/`:
- Agent API
- Hooks API
- Provider API
- Configuration API

### Archived Documentation

**[docs/archive/](./docs/archive/)** - Historical documentation
- Phase 5 implementation docs
- Phase 6 planning docs
- Sprint summaries
- Validation reports

---

## 🔄 Development Workflow

### Initial Setup

```bash
# Clone repository
git clone https://github.com/ericbfriday/clippyjs.git
cd clippyjs

# Install dependencies
yarn install

# Build all packages
yarn build:all

# Verify setup
yarn typecheck
yarn test:all --run
```

### Development Cycle

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes to packages
cd packages/react
# Edit files...

# 3. Build and test
yarn build
yarn test

# 4. Test in Storybook
cd ../..
yarn storybook

# 5. Run full test suite
yarn build:all
yarn test:all --run

# 6. Commit and push
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

### Testing Workflow

```bash
# Unit tests (fast, no build required)
yarn workspace @clippyjs/react test

# E2E tests (requires build first)
yarn build
yarn workspace @clippyjs/react test:integration
yarn workspace @clippyjs/react test:visual

# Full test suite
yarn build:all
yarn test:all --run
```

### Storybook Development

```bash
# Start Storybook
yarn storybook
# Opens http://localhost:6006

# Build Storybook for deployment
yarn storybook:build
# Output: packages/storybook/storybook-static
```

---

## 📤 Publishing

### Pre-Publish Checklist

- [ ] All tests passing (`yarn test:all --run`)
- [ ] TypeScript builds clean (`yarn typecheck`)
- [ ] Lint passes (`yarn lint`)
- [ ] Version bumped appropriately
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if needed)
- [ ] Documentation updated

### Publishing Process

```bash
# 1. Update version
yarn version:patch  # or minor/major

# 2. Update CHANGELOG.md
# Add release notes manually

# 3. Build everything
yarn build:all

# 4. Test everything
yarn test:all --run

# 5. Publish
yarn publish:all

# 6. Create git tag
git tag v1.0.1
git push --tags
```

### Individual Package Publishing

```bash
# Build specific package
yarn workspace @clippyjs/react build

# Publish specific package
yarn publish:react

# Or use npm directly
cd packages/react
npm publish --access public
```

---

## 🐛 Troubleshooting

### Common Issues

#### TypeScript Errors

**Problem**: `error TS5083: Cannot read file 'tsconfig.json'`

**Solution**: Root tsconfig.json was missing, now added. Run:
```bash
yarn typecheck
```

#### Build Failures

**Problem**: Package builds fail with module resolution errors

**Solution**: Ensure dependencies are installed and aligned:
```bash
yarn install
yarn build:all
```

#### Test Failures After Dependency Updates

**Problem**: Tests fail after upgrading Vitest or React

**Solution**: Rebuild packages first:
```bash
yarn clean:all
yarn install
yarn build:all
yarn test:all --run
```

#### Publishing Errors

**Problem**: `403 Forbidden` or `Package not found`

**Solution**: Verify npm authentication and package access:
```bash
npm login
npm whoami
# Check package.json publishConfig.access is "public"
```

### Dependency Issues

#### Misaligned Versions

Check dependency alignment:
```bash
grep -h '"typescript"' packages/*/package.json | sort | uniq -c
grep -h '"vitest"' packages/*/package.json | sort | uniq -c
```

Should show consistent versions across all packages.

#### Peer Dependency Warnings

Some peer dependency warnings are expected:
- `@testing-library/dom` in clippyjs-demo-react (testing library quirk)
- Workspace peer dependencies with pnpm linker (yarn limitation)

These warnings don't affect functionality.

### Workspace Issues

#### yarn workspaces foreach not working

Ensure you're using Yarn 4.9.2 or later:
```bash
yarn --version
# Should show: 4.9.2
```

#### Packages not building in correct order

Use `yarn build:all` which runs builds in parallel with proper dependency resolution:
```bash
yarn build:all
```

---

## �� Workspace Health

### Metrics (as of 2025-11-10)

| Metric | Status | Notes |
|--------|--------|-------|
| Dependency Alignment | ✅ | All packages aligned |
| Build System | ✅ | All packages build successfully |
| TypeScript | ✅ | Clean build with project references |
| Test Suite | ⚠️ | Some tests failing after vitest upgrade |
| Documentation | ✅ | Up to date and organized |
| Package Publishing | ✅ | All published packages on npm |

### Recent Maintenance

- **2025-11-10**: Dependency version alignment
  - Standardized Vitest to v3.0.5
  - Updated Rollup plugins to latest
  - Upgraded SDK versions (Anthropic, OpenAI)
  - Created root tsconfig.json for project references
  - Archived legacy documentation
  
---

## 🎯 Next Steps

### Immediate
- [ ] Fix failing tests after Vitest 3.0.5 upgrade
- [ ] Update test mocks for new Vitest API

### Short-term  
- [ ] Phase 6 Sprint 3: Enhanced Accessibility
- [ ] Complete E2E test coverage to 100%
- [ ] Add visual regression testing

### Long-term
- [ ] Version 1.0.0 release
- [ ] Additional AI provider support
- [ ] Multi-agent coordination
- [ ] Voice input/output capabilities

---

## 📞 Support and Resources

### Internal Resources
- **Documentation**: `/docs/`
- **Examples**: `/packages/storybook/stories/`
- **Templates**: `/packages/templates/`
- **Issues**: GitHub Issues (workspace)

### External Resources
- **npm Organization**: [@clippyjs](https://www.npmjs.com/org/clippyjs)
- **Repository**: https://github.com/ericbfriday/clippyjs
- **Website**: Coming soon

### Team Contacts
- **Maintainer**: Eric Friday
- **License**: MIT

---

**Workspace Index Version**: 1.0.0  
**Generated**: 2025-11-10  
**Next Review**: 2025-12-10
