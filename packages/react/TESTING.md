# Testing ClippyJS React - Quick Start

## 🎯 Recommended Configuration Summary

**Three-Tier Testing Strategy** for animation-heavy, visually intensive library:

| Tier | Tool | Purpose | Speed | Count |
|------|------|---------|-------|-------|
| 1 | Vitest | Hook logic & utilities | ⚡ Fast (ms) | 50-100 tests |
| 2 | Playwright | User workflows & integration | ⚙️ Medium (s) | 20-30 tests |
| 3 | Playwright | Visual regression | 🐌 Slow (screenshots) | 5-10 critical |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
yarn install
```

### 2. Run Tests Locally

```bash
# Unit tests (watch mode)
yarn test

# Integration tests (requires Storybook)
yarn workspace @clippyjs/storybook storybook  # Terminal 1
yarn test:integration                          # Terminal 2

# Visual tests
yarn test:visual

# Everything
yarn test:all
```

### 3. First-Time Setup for Playwright
```bash
# Install browsers
yarn playwright install chromium --with-deps

# Generate visual baselines (first run)
yarn test:visual
```

## 📋 Test Commands

```bash
# Development
yarn test              # Unit tests (watch)
yarn test:ui           # Unit tests (UI)
yarn test:coverage     # Unit tests (coverage)
yarn test:integration  # Integration tests
yarn test:visual       # Visual regression
yarn test:all          # All tests

# CI/CD
yarn test:ci           # All tests (no watch)
```

## 📁 What Was Created

```
packages/react/
├── playwright.config.ts          # Playwright configuration
├── vitest.config.ts              # Vitest configuration
├── tests/
│   ├── setup.ts                  # Global test setup
│   ├── helpers/
│   │   └── test-utils.tsx        # Test utilities
│   ├── unit/                     # Vitest unit tests
│   │   ├── useAgent.test.ts
│   │   └── ClippyProvider.test.tsx
│   ├── integration/              # Playwright integration
│   │   ├── agent-loading.spec.ts
│   │   └── animations.spec.ts
│   └── visual/                   # Playwright visual
│       └── agent-rendering.critical.spec.ts
└── package.json                  # Updated with test scripts & deps

.github/workflows/
└── test.yml                      # CI/CD workflow
```

## 🎭 Browser Coverage

- **Local Development**: Chromium only (fast)
- **CI/CD**: Chromium (all tests) + Firefox/WebKit (critical tests only)

Critical tests use `.critical.spec.ts` naming convention.

## 📸 Visual Testing Workflow

```bash
# 1. Run visual tests (creates baselines first time)
yarn test:visual

# 2. Make code changes
# ... edit components ...

# 3. Re-run tests (detects visual diffs)
yarn test:visual

# 4. Review diffs
yarn playwright show-report

# 5a. If intentional changes → Update baselines
yarn playwright test --update-snapshots

# 5b. If bugs → Fix code and re-test
```

## 🔧 Key Configurations

### Vitest (Unit Tests)
- **Environment**: jsdom (simulated browser)
- **Coverage**: v8 provider, HTML reports
- **Setup**: Auto cleanup, jest-dom matchers
- **Scope**: `tests/unit/**/*.test.ts`

### Playwright (Integration + Visual)
- **Base URL**: http://localhost:6006 (Storybook)
- **Auto-start**: Storybook dev server
- **Retries**: 2 on CI, 0 locally
- **Artifacts**: Screenshots on failure, videos on failure
- **Scope**: `tests/integration/**/*.spec.ts`, `tests/visual/**/*.spec.ts`

## 📊 Testing Strategy

### Unit Tests (Tier 1) - Vitest
**Test**:
- Hook return values and state
- Error handling
- SSR compatibility
- Context provider config

**Don't Test**:
- Visual rendering
- Real browser behavior
- Animation playback

### Integration Tests (Tier 2) - Playwright
**Test**:
- Agent loading workflows
- User interactions (click → load → speak)
- DOM manipulation
- Animation state transitions

**Don't Test**:
- Visual accuracy (use visual tests)
- Hook internals (use unit tests)

### Visual Tests (Tier 3) - Playwright
**Test**:
- Sprite rendering accuracy
- Speech bubble positioning
- Animation frame correctness
- Cross-browser visual consistency

**Don't Test**:
- Mid-animation frames (flaky)
- Trivial visual elements

## 🚦 CI/CD Pipeline

GitHub Actions workflow runs on push/PR:

1. **Unit Tests** (fastest) → Fail fast feedback
2. **Integration Tests** (Chromium) → Workflow validation
3. **Visual Tests** (multi-browser, critical only) → Rendering validation
4. **Build Check** → TypeScript compilation

## 💡 Best Practices

### Writing Tests
- ✅ Test behavior, not implementation
- ✅ Use semantic selectors (`button:has-text("Load")`)
- ✅ Wait for async operations (`await expect().toBeVisible()`)
- ✅ One concept per test
- ❌ Don't over-mock (use real components)
- ❌ Don't test implementation details
- ❌ Don't use brittle CSS selectors

### Visual Testing
- ✅ Test idle states, not mid-animation
- ✅ Set `maxDiffPixels` for tolerance
- ✅ Wait for animations to complete
- ✅ Test critical viewports
- ❌ Don't test every tiny visual detail
- ❌ Don't screenshot mid-animation (flaky)

### Performance
- ✅ Run unit tests in watch mode during development
- ✅ Run integration tests before committing
- ✅ Run visual tests weekly or before releases
- ✅ Use `.only` for focused debugging (remove before commit)

## 🐛 Troubleshooting

**Tests timing out?**
- Increase timeout: `{ timeout: 10000 }`
- Check if Storybook is running
- Verify network isn't blocking asset loads

**Visual tests failing?**
- Check if changes are intentional → update baselines
- Run in Docker for platform consistency
- Add wait before screenshots for animations

**"Cannot find module @clippyjs/react"?**
- Run `yarn build` in packages/react first

**Tests flaky?**
- Add explicit waits for animations
- Use `waitFor` for async state changes
- Avoid testing mid-animation states

## 📚 Full Documentation

See `tests/README.md` for comprehensive testing guide with:
- Detailed test type explanations
- Advanced debugging techniques
- Test helper documentation
- Coverage goals and metrics
- Contributing guidelines

## 🔗 Resources

- [Vitest](https://vitest.dev)
- [Playwright](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [Visual Testing Guide](https://playwright.dev/docs/test-snapshots)
