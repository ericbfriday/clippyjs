# ClippyJS React Testing Guide

Comprehensive testing strategy for the ClippyJS React library using a three-tier approach.

## 🎯 Testing Philosophy

ClippyJS is an **animation-heavy, visually intensive** library. Our testing strategy balances:
- **Speed**: Fast unit tests for rapid feedback
- **Reliability**: Integration tests for behavior validation
- **Visual Confidence**: Screenshot comparisons for critical rendering

## 📁 Test Structure

```
tests/
├── unit/                    # Vitest unit tests (fast)
│   ├── useAgent.test.ts
│   └── ClippyProvider.test.tsx
├── integration/             # Playwright integration tests (medium)
│   ├── agent-loading.spec.ts
│   └── animations.spec.ts
├── visual/                  # Playwright visual regression (slow)
│   └── agent-rendering.critical.spec.ts
├── helpers/                 # Test utilities
│   └── test-utils.tsx
└── setup.ts                 # Vitest global setup
```

## 🧪 Test Types

### Tier 1: Unit Tests (Vitest)
**Purpose**: Test hook logic and component behavior in isolation

**Run**: `yarn test`

**Coverage**:
- Hook return values and state management
- Error handling and edge cases
- SSR compatibility
- Context provider configuration

**Speed**: Milliseconds per test

**Example**:
```typescript
it('returns correct initial state', () => {
  const { result } = renderHook(() => useAgent('Clippy'), { wrapper });
  expect(result.current.agent).toBeNull();
  expect(result.current.loading).toBe(false);
});
```

### Tier 2: Integration Tests (Playwright)
**Purpose**: Test real browser behavior and user workflows

**Run**: `yarn test:integration`

**Coverage**:
- Agent loading and asset fetching
- Animation playback and state transitions
- User interaction flows (click → load → speak → animate)
- Multi-agent coordination
- DOM manipulation and positioning

**Speed**: Seconds per test

**Example**:
```typescript
test('loads agent when Load Agent button is clicked', async ({ page }) => {
  await page.goto('/iframe.html?id=useagent-basic--load-and-speak');
  await page.click('button:has-text("Load Agent")');
  await expect(page.locator('.clippy')).toBeVisible({ timeout: 5000 });
});
```

### Tier 3: Visual Regression Tests (Playwright)
**Purpose**: Ensure animations and rendering remain visually consistent

**Run**: `yarn test:visual`

**Coverage**:
- Agent sprite rendering accuracy
- Speech bubble display and positioning
- Animation frame correctness
- Multi-agent layout without overlap
- Responsive positioning across viewports

**Speed**: Slow (screenshot capture and comparison)

**Example**:
```typescript
test('clippy renders correctly at idle', async ({ page }) => {
  await page.goto('/iframe.html?id=useagent-basic--load-and-speak');
  await page.click('button:has-text("Load Agent")');
  const agent = page.locator('.clippy');
  await expect(agent).toHaveScreenshot('clippy-idle.png', {
    maxDiffPixels: 100,
  });
});
```

## 🚀 Running Tests

### Local Development

```bash
# Run all unit tests (watch mode)
yarn test

# Run unit tests with UI
yarn test:ui

# Run unit tests with coverage
yarn test:coverage

# Run integration tests (requires Storybook running)
yarn test:integration

# Run visual regression tests
yarn test:visual

# Run everything
yarn test:all
```

### CI/CD

```bash
# Run all tests once (no watch mode)
yarn test:ci
```

## 🛠️ Test Configuration

### Vitest (`vitest.config.ts`)
- **Environment**: jsdom (simulated browser)
- **Globals**: true (no need to import `describe`, `it`, `expect`)
- **Setup**: Automatic React Testing Library cleanup
- **Coverage**: v8 provider with HTML reports

### Playwright (`playwright.config.ts`)
- **Base URL**: http://localhost:6006 (Storybook)
- **Browsers**: Chromium (local), +Firefox +WebKit (CI critical tests)
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure only
- **Video**: Retained on failure
- **Web Server**: Auto-starts Storybook before tests

## 📸 Visual Testing Workflow

### 1. Generate Initial Baselines
```bash
# First time running visual tests
yarn test:visual
```

This creates baseline screenshots in `tests/visual/*-snapshots/`.

### 2. Review Visual Diffs
When tests fail due to visual changes:

```bash
# View the HTML report
yarn playwright show-report
```

### 3. Update Baselines (Intentional Changes)
```bash
# Update all screenshots
yarn playwright test --update-snapshots

# Update specific test
yarn playwright test agent-rendering --update-snapshots
```

### 4. Visual Test Best Practices
- **Wait for animations**: Use `page.waitForTimeout()` for animation completion
- **Stable elements**: Test idle states, not mid-animation frames
- **Tolerance**: Set `maxDiffPixels` to handle minor rendering differences
- **Viewports**: Test critical viewports (desktop, mobile)

## 🔧 Test Helpers

### `renderWithProvider()`
Custom render function that wraps components with ClippyProvider:

```typescript
import { renderWithProvider } from '../helpers/test-utils';

it('renders with provider', () => {
  renderWithProvider(<MyComponent />, {
    providerProps: { maxAgents: 5 }
  });
});
```

### `createMockAgent()`
Generate mock agent instances for testing:

```typescript
import { createMockAgent } from '../helpers/test-utils';

const mockAgent = createMockAgent();
mockAgent.speak.mockResolvedValue(undefined);
```

### `waitForAnimation()`
Wait for animations to complete:

```typescript
import { waitForAnimation } from '../helpers/test-utils';

await waitForAnimation(1000); // Wait 1 second
```

## 🎭 Testing Against Storybook

Integration and visual tests run against **Storybook stories**, not the starter templates. This provides:
- **Isolated components**: Test specific scenarios
- **Reproducible states**: Consistent starting points
- **Fast startup**: Storybook dev server is faster than full apps

### Story-Based Testing
```typescript
// Navigate to specific story
await page.goto('/iframe.html?id=useagent-basic--load-and-speak&viewMode=story');

// Test the isolated component
await page.click('button:has-text("Load Agent")');
```

## 🐛 Debugging Tests

### Unit Tests (Vitest)
```bash
# Debug specific test file
yarn test useAgent.test.ts

# Debug with UI
yarn test:ui

# Debug in VS Code
# Add breakpoint, then use "JavaScript Debug Terminal"
```

### Integration/Visual Tests (Playwright)
```bash
# Run in headed mode (see browser)
yarn playwright test --headed

# Run in debug mode (step through)
yarn playwright test --debug

# Run specific test
yarn playwright test agent-loading

# View last run report
yarn playwright show-report
```

### Common Issues

**"Cannot find module @clippyjs/react"**
- Run `yarn build` in packages/react first

**"Timeout waiting for locator"**
- Increase timeout: `await expect(locator).toBeVisible({ timeout: 10000 })`
- Check if element selector is correct
- Verify Storybook story loaded correctly

**"Screenshot comparison failed"**
- Visual changes may be intentional (update baselines)
- Platform differences (run tests in Docker for consistency)
- Animation timing (add waits before screenshots)

**"Test.only committed"**
- CI will fail if `.only` is left in test files
- Use `test.only` locally for focused debugging only

## 📊 Coverage Goals

| Layer | Coverage Target | Current |
|-------|----------------|---------|
| Unit Tests | 80%+ | TBD |
| Integration Tests | Key workflows | TBD |
| Visual Tests | Critical renders | TBD |

## 🚦 CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/test.yml`) runs:

1. **Unit Tests**: Fast feedback on every commit
2. **Integration Tests**: Chromium only for PRs
3. **Visual Tests**: Multi-browser on PRs to main
4. **Build Check**: Ensure TypeScript compiles

### Branch Protection
Recommended rules for `master`:
- ✅ Unit tests must pass
- ✅ Integration tests must pass
- ✅ Visual tests must pass
- ✅ Build must succeed
- ⚠️ Visual diffs require manual review

## 📝 Writing New Tests

### Unit Test Checklist
- [ ] Test in isolation (mock external dependencies)
- [ ] Cover happy path and error cases
- [ ] Test edge cases and boundary conditions
- [ ] Verify cleanup (no memory leaks)
- [ ] Check SSR compatibility if applicable

### Integration Test Checklist
- [ ] Test against Storybook story
- [ ] Wait for elements before assertions
- [ ] Use semantic selectors (text, role) over CSS
- [ ] Test user workflows, not implementation
- [ ] Handle async operations properly

### Visual Test Checklist
- [ ] Mark as `.critical.spec.ts` for multi-browser
- [ ] Wait for animations to complete
- [ ] Set appropriate `maxDiffPixels` tolerance
- [ ] Test critical viewports
- [ ] Document what visual aspect is being verified

## 🔗 Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)

## 💡 Tips

- **Test behavior, not implementation**: Focus on what users experience
- **Avoid over-mocking**: Use real components when possible
- **Keep tests simple**: One concept per test
- **Make tests readable**: Descriptive test names and clear assertions
- **Run tests often**: Fast feedback loop improves development
- **Review visual diffs carefully**: Subtle rendering bugs can slip through
