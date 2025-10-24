# ClippyJS React Patterns and Conventions

## React 19 Specific Patterns

### Automatic JSX Runtime
- **No React Import**: React 19 uses automatic JSX runtime
- **Configuration**: `"jsx": "react-jsx"` in tsconfig.json
- **Usage**: No need to `import React` in component files

```typescript
// ✅ Correct for React 19
import { useState } from 'react';

export const MyComponent = () => {
  return <div>Hello</div>;
};

// ❌ Unnecessary in React 19
import React from 'react';
```

### React.FC Type Updates
- **Children Not Auto-Included**: Must explicitly define children prop in React 19
- **Pattern Used**: Explicitly define all props including children

```typescript
// ✅ Correct pattern
interface ComponentProps {
  children: ReactNode;  // Explicitly defined
  title: string;
}

export const Component: React.FC<ComponentProps> = ({ children, title }) => {
  return <div>{children}</div>;
};
```

## Component Architecture

### Functional Components Only
- **No Class Components**: All components use function declarations
- **Hooks-Based**: State and effects managed with hooks
- **TypeScript**: All components have explicit prop types

### Component Structure Pattern
```typescript
import React, { useState, useEffect, useRef } from 'react';
import type { SomeType } from './types';

export interface ComponentProps {
  /** JSDoc comment for each prop */
  requiredProp: string;
  /** Optional props have ? and JSDoc */
  optionalProp?: number;
  /** Callbacks with descriptive types */
  onSomething?: (value: string) => void;
}

export const Component: React.FC<ComponentProps> = ({
  requiredProp,
  optionalProp = 42,  // Default in destructuring
  onSomething,
}) => {
  // 1. Hooks section (order matters)
  const [state, setState] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  
  // 2. Effects
  useEffect(() => {
    mountedRef.current = true;
    
    // Async operations
    const init = async () => {
      try {
        setLoading(true);
        // ... async work
        if (!mountedRef.current) return;  // Check before state update
        setState('result');
      } catch (err) {
        if (!mountedRef.current) return;
        console.error(err);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    init();
    
    return () => {
      mountedRef.current = false;  // Cleanup
    };
  }, [dependencies]);
  
  // 3. Event handlers
  const handleClick = () => {
    onSomething?.(state);
  };
  
  // 4. Render
  return <div onClick={handleClick}>{state}</div>;
};
```

## Hook Patterns Used

### useState Pattern
```typescript
// Explicit type annotation when needed
const [agent, setAgent] = useState<Agent | undefined>();

// Type inference when clear
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

// Lazy initialization for expensive operations
const [value, setValue] = useState(() => expensiveComputation());
```

### useEffect Pattern
```typescript
useEffect(() => {
  // Pattern 1: Simple side effect
  document.title = `Agent: ${name}`;
}, [name]);

useEffect(() => {
  // Pattern 2: Async with cleanup
  let cancelled = false;
  
  const fetchData = async () => {
    const result = await api.fetch();
    if (!cancelled) {
      setData(result);
    }
  };
  
  fetchData();
  
  return () => {
    cancelled = true;
  };
}, [dependencies]);

useEffect(() => {
  // Pattern 3: Event listeners
  const handler = (e: Event) => {
    // handle event
  };
  
  window.addEventListener('resize', handler);
  
  return () => {
    window.removeEventListener('resize', handler);
  };
}, []);
```

### useRef Pattern
```typescript
// Pattern 1: DOM reference
const elementRef = useRef<HTMLDivElement>(null);

// Pattern 2: Mutable value that persists
const mountedRef = useRef(true);

// Pattern 3: Store previous value
const prevValueRef = useRef<string>();

useEffect(() => {
  prevValueRef.current = value;
}, [value]);
```

### useContext Pattern
```typescript
// Provider pattern
export const ClippyContext = createContext<ClippyContextValue | undefined>(undefined);

export const ClippyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());
  
  const value = useMemo(() => ({
    agents,
    loadAgent,
    getAgent,
    unloadAgent,
  }), [agents]);
  
  return (
    <ClippyContext.Provider value={value}>
      {children}
    </ClippyContext.Provider>
  );
};

// Consumer hook pattern
export const useClippy = () => {
  const context = useContext(ClippyContext);
  if (!context) {
    throw new Error('useClippy must be used within ClippyProvider');
  }
  return context;
};
```

## Async Patterns in React

### Mounted Check Pattern
```typescript
// Always use mountedRef to prevent state updates on unmounted components
const mountedRef = useRef(true);

useEffect(() => {
  mountedRef.current = true;
  
  const asyncOperation = async () => {
    const result = await someAsyncCall();
    
    // Check before state update
    if (!mountedRef.current) return;
    
    setState(result);
  };
  
  asyncOperation();
  
  return () => {
    mountedRef.current = false;
  };
}, []);
```

### Error Handling Pattern
```typescript
const [error, setError] = useState<Error | null>(null);

try {
  const result = await riskyOperation();
  if (!mountedRef.current) return;
  setData(result);
} catch (err) {
  if (!mountedRef.current) return;
  setError(err as Error);  // Type assertion
  
  // Optional: callback
  onError?.(err as Error);
}
```

### Loading States Pattern
```typescript
const [loading, setLoading] = useState(false);
const [data, setData] = useState<Data | undefined>();
const [error, setError] = useState<Error | null>(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);  // Clear previous errors
    
    const result = await api.fetch();
    
    if (!mountedRef.current) return;
    setData(result);
  } catch (err) {
    if (!mountedRef.current) return;
    setError(err as Error);
  } finally {
    if (mountedRef.current) {
      setLoading(false);
    }
  }
};
```

## Component Composition

### Provider Pattern
```typescript
// High-level provider wraps app
<ClippyProvider defaultBasePath="/agents">
  <App />
</ClippyProvider>

// Components use context anywhere in tree
const MyComponent = () => {
  const { loadAgent } = useClippy();
  // ...
};
```

### Component API Design
```typescript
// Declarative API
<Clippy 
  name="Clippy"
  showOnLoad={true}
  position={{ x: 100, y: 100 }}
  speak="Hello!"
  onLoad={(agent) => console.log('Loaded', agent)}
  onError={(err) => console.error(err)}
/>

// Imperative API via hook
const { agent, load, unload } = useAgent('Clippy');

useEffect(() => {
  if (agent) {
    agent.speak('Hello from hook!');
  }
}, [agent]);
```

## Prop Patterns

### Optional Props with Defaults
```typescript
interface Props {
  showOnLoad?: boolean;
  basePath?: string;
  holdSpeech?: boolean;
}

const Component: React.FC<Props> = ({
  showOnLoad = true,      // Default in destructuring
  basePath,               // Undefined if not provided
  holdSpeech = false,
}) => {
  // Use props
};
```

### Callback Props
```typescript
interface Props {
  onLoad?: (agent: Agent) => void;
  onError?: (error: Error) => void;
  onChange?: (value: string) => void;
}

// Usage
const handleLoad = (agent: Agent) => {
  console.log('Agent loaded:', agent);
};

<Component onLoad={handleLoad} />
```

### Conditional Rendering
```typescript
// Pattern 1: Ternary
{loading ? <Spinner /> : <Content />}

// Pattern 2: Logical AND
{error && <ErrorMessage error={error} />}

// Pattern 3: Nullish coalescing
{data ?? <EmptyState />}

// Pattern 4: Early return
if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <Content data={data} />;
```

## Special Patterns in ClippyJS

### Non-Rendering Components
```typescript
// Clippy component doesn't render anything
// It manages Agent instance which creates its own DOM
export const Clippy: React.FC<ClippyProps> = (props) => {
  // ... setup logic
  
  return null;  // Agent manages its own DOM outside React
};
```

### DOM Manipulation Outside React
```typescript
// Agent class manipulates DOM directly
class Agent {
  element: HTMLElement;
  
  constructor() {
    // Create DOM elements outside React
    this.element = document.createElement('div');
    document.body.appendChild(this.element);
  }
  
  destroy() {
    // Clean up DOM
    this.element.remove();
  }
}
```

### Effect Dependencies
```typescript
// Include all values used inside effect
useEffect(() => {
  if (agent && speak) {
    agent.speak(speak, holdSpeech);
  }
}, [agent, speak, holdSpeech]);  // All used values listed

// Empty deps = run once on mount
useEffect(() => {
  console.log('Component mounted');
}, []);

// No deps array = run on every render (usually avoid)
useEffect(() => {
  console.log('Every render');
});
```

## Performance Considerations

### useMemo for Expensive Computations
```typescript
const value = useMemo(() => ({
  agents,
  loadAgent,
  getAgent,
  unloadAgent,
}), [agents]);  // Only recompute when agents changes
```

### useCallback for Stable Function References
```typescript
const handleLoad = useCallback((agent: Agent) => {
  console.log('Loaded', agent);
}, []);  // Stable function reference
```

## Testing Patterns

### Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import { Clippy } from './Clippy';

test('renders clippy component', () => {
  render(
    <ClippyProvider>
      <Clippy name="Clippy" />
    </ClippyProvider>
  );
  // assertions
});
```

## Common Pitfalls to Avoid

### ❌ Don't forget cleanup
```typescript
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  // Missing cleanup!
}, []);
```

### ✅ Always cleanup
```typescript
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  return () => clearTimeout(timer);
}, []);
```

### ❌ Don't update state on unmounted components
```typescript
useEffect(() => {
  async () => {
    const data = await fetch();
    setState(data);  // Might be unmounted!
  };
}, []);
```

### ✅ Check mounted status
```typescript
useEffect(() => {
  let mounted = true;
  
  async () => {
    const data = await fetch();
    if (mounted) {
      setState(data);
    }
  };
  
  return () => { mounted = false; };
}, []);
```
