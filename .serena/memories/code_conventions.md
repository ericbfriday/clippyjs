# ClippyJS Code Conventions and Style Guide

## TypeScript Configuration

### Strict Mode Settings
- **strict**: true (all strict type-checking options enabled)
- **noImplicitReturns**: true (functions must return values consistently)
- **noFallthroughCasesInSwitch**: true (switch statements must be complete)
- **forceConsistentCasingInFileNames**: true (case-sensitive imports)

### Compilation Settings
- **target**: ES2020
- **module**: ESNext
- **jsx**: react-jsx (automatic JSX runtime, no React import needed)
- **moduleResolution**: bundler (optimized for bundler tools)
- **esModuleInterop**: true
- **skipLibCheck**: true
- **allowSyntheticDefaultImports**: true

### Output Configuration
- **declaration**: true (generate .d.ts files)
- **declarationMap**: true (source maps for types)
- **outDir**: ./dist
- **rootDir**: ./src

## Naming Conventions

### Files and Directories
- **Source files**: PascalCase for React components (Clippy.tsx, ClippyProvider.tsx)
- **Utility files**: camelCase for non-component modules (loader.ts, types.ts)
- **Classes**: PascalCase for class files (Agent.ts, Animator.ts, Balloon.ts, Queue.ts)
- **Test files**: *.test.tsx pattern

### Code Elements
- **Interfaces/Types**: PascalCase (AgentData, ClippyOptions, AnimationState)
- **Classes**: PascalCase (Agent, Animator, Balloon, Queue)
- **Methods/Functions**: camelCase (moveTo, gestureAt, playInternal)
- **Properties**: camelCase (element, animator, balloon, queue)
- **Constants**: SCREAMING_SNAKE_CASE for state constants ("WAITING", "EXITED", "PLAYING")
- **React Components**: PascalCase function declarations

### Type Patterns
- **Props Interfaces**: ComponentNameProps pattern (ClippyProps, ClippyProviderProps)
- **Type Imports**: Use `import type { ... }` for type-only imports (optimization)
- **Exported Types**: Export all public interfaces and types
- **Callback Types**: Descriptive type aliases (QueueCallback, AnimatorStateCallback)

## React Patterns

### Component Structure
```typescript
// Functional components with explicit props interface
export interface ClippyProps {
  /** JSDoc comment for each prop */
  name: string;
  basePath?: string;
  showOnLoad?: boolean;
}

export const Clippy: React.FC<ClippyProps> = ({
  name,
  basePath,
  showOnLoad = true, // Default values in destructuring
}) => {
  // Hooks at top level
  const [state, setState] = useState();
  const ref = useRef();
  
  // useEffect hooks
  useEffect(() => {
    // Async logic with mounted ref check
    return () => {
      // Cleanup
    };
  }, [dependencies]);
  
  return null; // or JSX
};
```

### Hook Patterns
- **State Management**: useState for component state, useContext for shared state
- **Side Effects**: useEffect with proper cleanup functions
- **Refs**: useRef for DOM references and mutable values (mountedRef pattern)
- **Mounted Check**: Use mountedRef.current to prevent state updates on unmounted components

### Async Patterns
```typescript
useEffect(() => {
  mountedRef.current = true;
  
  const asyncOperation = async () => {
    try {
      const result = await someAsyncCall();
      if (!mountedRef.current) return; // Check before state update
      setState(result);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err as Error);
    }
  };
  
  asyncOperation();
  
  return () => {
    mountedRef.current = false;
  };
}, [dependencies]);
```

## Class-Based Architecture

### Agent/Animator/Balloon Pattern
- **Encapsulation**: Each class handles specific responsibility
- **Composition**: Agent contains Animator, Balloon, and Queue instances
- **Promise-based API**: Public methods return Promises for async operations
- **Queue System**: All actions queued and executed in order

### Method Visibility
- **Public Methods**: Exposed API methods (show, hide, play, speak, moveTo)
- **Private Methods**: Internal helpers (playInternal, onQueueEmpty) marked with 'private' or internal naming

## Documentation Standards

### JSDoc Comments
- **Interfaces**: Document purpose of each interface
- **Props**: Document each prop with /** */ comments
- **Classes**: Document class purpose
- **Public Methods**: Document parameters, return values, and behavior
- **Complex Logic**: Inline comments explaining non-obvious code

### Type Annotations
- **Explicit Types**: Always specify return types for functions
- **Type Safety**: Avoid 'any' type, use proper type definitions
- **Generic Constraints**: Use specific constraints for generics

## Import Organization
1. React and external libraries
2. Local components and utilities
3. Types (preferably with 'import type')
4. Blank line between groups

Example:
```typescript
import React, { useEffect, useState } from 'react';
import { useClippy } from './ClippyProvider';
import { Agent } from './Agent';
import type { ClippyOptions, AgentName } from './types';
```

## Error Handling
- **Try-Catch**: Wrap async operations in try-catch blocks
- **Error Types**: Cast caught errors as Error type
- **Callbacks**: Provide error callbacks for consumer handling (onError props)
- **Graceful Degradation**: Don't crash on missing resources, provide fallbacks

## Performance Patterns
- **Cleanup**: Always cleanup event listeners, timers, and subscriptions
- **Memoization**: Not heavily used yet, but consider for expensive operations
- **Lazy Loading**: Assets loaded on-demand from CDN
- **Bundle Optimization**: Tree-shaking friendly exports
