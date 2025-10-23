# Learnings: React Testing Patterns for ClippyJS

## Testing Library Compatibility

### userEvent Version Issues
**Problem**: `userEvent.setup()` not available in current version
**Solution**: Use `userEvent` directly without setup
```typescript
// ❌ Incorrect (fails in some versions)
const user = userEvent.setup();
await user.click(button);

// ✅ Correct (works in all versions)
const user = userEvent;
await user.click(button);
```

**Why**: Different versions of @testing-library/user-event have different APIs. Direct usage is more compatible.

## React 19 Testing Considerations

### Act() Warnings in Storybook
**Problem**: React 19 shows "not wrapped in act(...)" warnings
**Cause**: Async state updates in concurrent mode trigger testing environment checks
**Solution**: Suppress in Storybook (development only)
```typescript
// .storybook/preview.tsx
const originalError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
    return;
  }
  originalError.apply(console, args);
};
```

**Why**: These warnings are for testing environments, not Storybook demonstrations.

### Async State Updates
**Pattern**: Always use `waitFor` for async operations
```typescript
// Component with async loading
const { load, agent } = useAgent('Clippy', { autoLoad: true });

// Test pattern
await waitFor(() => {
  expect(agent).not.toBeNull();
});
```

## Integration Test Patterns

### Form Interactions
**Best Practices**:
1. Use realistic user events (click, type, submit)
2. Test validation messages and error states
3. Verify focus management and accessibility
4. Test multi-step forms with state transitions

```typescript
it('validates form fields', async () => {
  render(<FormWithValidation />);
  
  await userEvent.type(screen.getByLabelText('Email'), 'invalid');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });
});
```

### Event-Driven Behavior
**Key Patterns**:
1. Test scroll, keyboard, and mouse events
2. Use fake timers for delayed actions
3. Test drag-and-drop with userEvent API
4. Verify window events (resize, visibility)

```typescript
it('responds to scroll events', async () => {
  render(<ScrollTracker />);
  
  fireEvent.scroll(window, { target: { scrollY: 500 } });
  
  await waitFor(() => {
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

### External Data Integration
**Testing Strategy**:
1. Mock API responses with realistic delays
2. Test loading, error, and success states
3. Simulate real-time updates with intervals
4. Test WebSocket-like notifications

```typescript
it('handles API responses', async () => {
  const mockFetch = vi.fn(() => 
    Promise.resolve({ data: { items: 5 } })
  );
  
  render(<DataFetcher fetch={mockFetch} />);
  
  await userEvent.click(screen.getByRole('button', { name: 'Load' }));
  
  await waitFor(() => {
    expect(screen.getByText('5 items')).toBeInTheDocument();
  });
});
```

## E2E Testing with Playwright

### Story Navigation
**Pattern**: Use Storybook iframe URLs
```typescript
await page.goto('/iframe.html?id=useagent-basic--auto-load');
await page.waitForLoadState('networkidle');
```

### Reliability Patterns
1. **Wait for elements**: Use `waitFor` with timeouts
2. **Network idle**: Wait for network before interactions
3. **Viewport control**: Test different screen sizes
4. **Error boundaries**: Verify error handling in browser

### Mobile Testing
```typescript
test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

test('mobile interactions', async ({ page }) => {
  await page.tap('button'); // Touch instead of click
  await page.mouse.wheel(0, 500); // Scroll
});
```

## Storybook Testing Patterns

### Provider Wrapping
**Always wrap stories that use context hooks**:
```typescript
// .storybook/preview.tsx
decorators: [
  (Story) => (
    <ClippyProvider maxAgents={3}>
      <Story />
    </ClippyProvider>
  ),
]
```

### File Extensions
**Use `.tsx` for JSX in configuration**:
- `preview.ts` → Syntax errors with JSX
- `preview.tsx` → Correct for React components

### Agent Limits
**Keep maxAgents ≤3 in Storybook** to avoid Chrome media player limits

## Mock Agent Structure

### Complete Agent Mock
All 16 methods must be mocked for comprehensive testing:
```typescript
vi.mock('@clippyjs/core', () => ({
  load: vi.fn(() => Promise.resolve({
    // Core methods
    show: vi.fn(() => Promise.resolve()),
    hide: vi.fn(() => Promise.resolve()),
    play: vi.fn(() => Promise.resolve()),
    speak: vi.fn(() => Promise.resolve()),
    moveTo: vi.fn(() => Promise.resolve()),
    gestureAt: vi.fn(() => Promise.resolve()),
    animate: vi.fn(() => Promise.resolve()),
    
    // Control methods
    stop: vi.fn(),
    stopCurrent: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    closeBalloon: vi.fn(),
    
    // Utility methods
    destroy: vi.fn(),
    isVisible: vi.fn(() => true),
    getAnimations: vi.fn(() => ['Wave', 'Idle']),
    hasAnimation: vi.fn(() => true),
  }))
}));
```

## Timing Issues

### Common Problems
1. **Fake timers** - Need manual advancement
2. **Async operations** - May need longer timeouts
3. **State updates** - Require `waitFor` wrapping

### Solutions
```typescript
// Fake timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
await waitFor(() => expect(element).toBeInTheDocument());
vi.useRealTimers();

// Longer timeouts
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 2000 }); // Default is 1000ms
```

## Test Organization

### File Naming
- `*.test.tsx` - Unit and integration tests
- `*.spec.ts` - E2E tests (Playwright)
- `*.stories.tsx` - Storybook stories

### Directory Structure
```
tests/
├── unit/          # Component and hook unit tests
├── integration/   # Realistic usage scenarios
├── examples/      # Documentation-style examples
├── e2e/          # Browser-based end-to-end tests
└── setup.ts      # Test environment configuration
```

## Best Practices Summary

1. ✅ **Always use waitFor** for async operations
2. ✅ **Mock all agent methods** for reliable tests
3. ✅ **Test realistic scenarios** not just happy paths
4. ✅ **Use proper file extensions** (.tsx for JSX)
5. ✅ **Wrap context-dependent components** in providers
6. ✅ **Handle timing carefully** with fake timers
7. ✅ **Test accessibility** with proper roles and labels
8. ✅ **Verify error states** and edge cases
9. ✅ **Use semantic queries** (getByRole, getByLabelText)
10. ✅ **Keep tests focused** - one concept per test
