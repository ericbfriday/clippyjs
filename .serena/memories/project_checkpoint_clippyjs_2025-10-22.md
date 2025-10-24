# ClippyJS Project Checkpoint - October 22, 2025

## Project Status
**Branch**: feat/rewrite-to-react  
**Test Coverage**: 164/164 tests passing (100%)  
**Last Commits**: 
- 5f02bd4: Speech bubble CSS loading fix
- fa086f1: Agent cleanup closure bug fix

## Architecture Overview

### Package Structure
```
packages/
├── core/           # Core agent engine (vanilla JS)
│   ├── src/
│   │   ├── Agent.ts       # Main agent class
│   │   ├── Animator.ts    # Animation controller
│   │   ├── Balloon.ts     # Speech bubble rendering
│   │   ├── loader.ts      # Asset loading (CSS, sprites, sounds)
│   │   └── Queue.ts       # Action queue management
│   └── assets/
│       └── clippy.css     # Critical styling (position: fixed)
│
├── react/          # React bindings
│   ├── src/
│   │   ├── ClippyProvider.tsx  # Context provider for agent management
│   │   ├── useAgent.ts         # Imperative API hook
│   │   ├── Clippy.tsx          # Declarative component
│   │   └── useClippy.ts        # Context consumer
│   └── tests/
│       ├── unit/              # Unit tests (91 tests)
│       ├── integration/       # Integration tests (73 tests)
│       └── examples/          # Usage examples
│
└── storybook/      # Interactive documentation
    ├── stories/
    │   ├── AllAgents.stories.tsx
    │   ├── useAgent.Basic.stories.tsx
    │   └── ...
    └── test-speech-bubbles.html  # Manual test page
```

## Critical Implementation Details

### CSS Loading (packages/core/src/loader.ts)
**Why Critical**: Without CSS, speech bubbles default to static positioning and get constrained by parent containers.

**Implementation**:
```typescript
let cssLoaded = false;

function loadCSS(basePath: string): void {
  if (cssLoaded) return;
  
  // Path resolution: '/agents/' → '/clippy.css'
  const cssBasePath = extractParentPath(basePath);
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${cssBasePath}clippy.css`;
  document.head.appendChild(link);
  
  cssLoaded = true; // Singleton
}
```

### Agent Lifecycle (packages/react/src/useAgent.ts)
**Why Critical**: Improper cleanup causes agent accumulation and memory leaks.

**Pattern**:
```typescript
// Track agent name with ref to avoid closure issues
const agentNameRef = useRef(name);

// Cleanup old agent when name changes
useEffect(() => {
  if (agentNameRef.current !== name) {
    cleanupOldAgent(agentNameRef.current);
    agentNameRef.current = name;
  }
}, [name, autoCleanup]);

// Cleanup on unmount - uses ref, not prop
useEffect(() => {
  return () => {
    if (agent && autoCleanup) {
      agent.destroy();
      unloadAgent(agentNameRef.current); // ← Critical: uses ref
    }
  };
}, [agent, autoCleanup]);
```

### Agent Provider Pattern (packages/react/src/ClippyProvider.tsx)
**Purpose**: Centralized agent registry with maxAgents limit enforcement.

**Key Methods**:
- `loadAgent(name)`: Checks limits, loads via core, stores in Map
- `unloadAgent(name)`: Destroys agent, removes from Map
- `getAgent(name)`: Retrieves loaded agent

**Cleanup**:
```typescript
useEffect(() => {
  return () => {
    agents.forEach(agent => agent.destroy());
  };
}, []); // Empty deps - only on provider unmount
```

## Known Patterns

### Balloon Rendering
**File**: packages/core/src/Balloon.ts

**Pattern**:
```typescript
constructor(targetEl: HTMLElement) {
  this.balloonEl = createBalloonElement();
  document.body.appendChild(this.balloonEl); // ← Must be body
}
```

**Why body**: Ensures `position: fixed` works correctly and balloon isn't constrained by parent overflow/positioning.

### JSONP-Style Asset Loading
**File**: packages/core/src/loader.ts

**Pattern**: Agent data files call global callbacks:
```javascript
// In agent.js file:
window.clippy.ready('Clippy', { /* animation data */ });

// In loader.ts:
const dataCallbacks = new Map();
export function ready(name, data) {
  dataCallbacks.get(name)?.(data);
}
```

## Testing Strategy

### Unit Tests (91 tests)
- Component behavior in isolation
- Hook return values and state management
- Provider lifecycle and limits

### Integration Tests (73 tests)
- Multi-agent scenarios (11 tests)
- Form interactions (7 tests)
- Event-driven behavior (12 tests)
- External data integration (11 tests)
- Speech bubble rendering (7 tests)
- Real user workflows

### Test Utilities
**Mock Pattern**:
```typescript
vi.mock('@clippyjs/core', () => ({
  load: vi.fn(() => Promise.resolve({
    show: vi.fn(),
    speak: vi.fn(),
    destroy: vi.fn(),
    // ... all agent methods
  }))
}));
```

## Common Pitfalls

### ❌ Vitest Hoisting Error
```typescript
const mockLoad = vi.fn();
vi.mock('@clippyjs/core', () => ({ load: mockLoad }));
// ERROR: Cannot access before initialization
```

### ✅ Correct Pattern
```typescript
vi.mock('@clippyjs/core', () => ({
  load: vi.fn(() => Promise.resolve({...}))
}));
```

### ❌ Cleanup Closure Bug
```typescript
useEffect(() => {
  return () => {
    unloadAgent(name); // ← Uses current prop value!
  };
}, [name]); // ← Re-creates cleanup on every name change
```

### ✅ Correct Pattern
```typescript
const nameRef = useRef(name);
useEffect(() => {
  if (nameRef.current !== name) {
    cleanupOldAgent(nameRef.current);
    nameRef.current = name;
  }
}, [name]);

useEffect(() => {
  return () => unloadAgent(nameRef.current);
}, []); // ← Cleanup uses ref
```

## Build Commands
```bash
# Build core package
cd packages/core && yarn build

# Build react package
cd packages/react && yarn build

# Run tests
cd packages/react && yarn test

# Start Storybook
cd packages/storybook && yarn storybook
```

## Recent Fixes Applied
1. ✅ CSS loading in loader.ts
2. ✅ Agent cleanup closure bug in useAgent.ts
3. ✅ Comprehensive speech bubble tests
4. ✅ Full viewport manual test page

## Next Development Considerations
- Performance: CSS singleton check optimization
- Testing: Add integration test for agent name changes
- Documentation: Update README with CSS loading behavior
- Storybook: Monitor agent cleanup in production usage
