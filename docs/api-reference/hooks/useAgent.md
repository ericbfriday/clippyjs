# useAgent

The primary imperative API for controlling Clippy agents in React applications.

## Description

`useAgent` is a comprehensive React hook that provides full control over a Clippy agent with automatic lifecycle management, SSR compatibility, and TypeScript support. It exposes all core Agent methods through a convenient hook interface with built-in loading states and error handling.

## Signature

```typescript
function useAgent(
  name: AgentName,
  options?: UseAgentOptions
): UseAgentReturn
```

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `AgentName` | Yes | - | Name of the agent to load (e.g., 'Clippy', 'Merlin', 'Rover') |
| `options` | `UseAgentOptions` | No | `{}` | Configuration options for the hook |

### UseAgentOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `autoLoad` | `boolean` | No | `false` | Automatically load agent on component mount |
| `autoShow` | `boolean` | No | `false` | Automatically show agent after loading |
| `autoCleanup` | `boolean` | No | `true` | Automatically cleanup agent on component unmount |
| `initialPosition` | `{ x: number; y: number }` | No | - | Initial position for the agent |
| `initialMessage` | `string` | No | - | Initial message for agent to speak |
| `basePath` | `string` | No | - | Custom base path for agent assets |

## Returns

### UseAgentReturn

```typescript
interface UseAgentReturn {
  // State
  agent: Agent | null;
  loading: boolean;
  error: Error | null;

  // Lifecycle
  load: () => Promise<Agent>;
  unload: () => void;
  reload: () => Promise<Agent>;

  // Core Methods
  show: () => Promise<void>;
  hide: () => Promise<void>;
  play: (animation: string) => Promise<void>;
  animate: () => Promise<void>;
  speak: (text: string, hold?: boolean) => Promise<void>;
  moveTo: (x: number, y: number, duration?: number) => Promise<void>;
  gestureAt: (x: number, y: number) => Promise<void>;

  // Control Methods
  stop: () => void;
  stopCurrent: () => void;
  pause: () => void;
  resume: () => void;
  delay: (ms: number) => Promise<void>;
  closeBalloon: () => void;

  // Utility Methods
  getAnimations: () => string[];
  hasAnimation: (name: string) => boolean;
  isVisible: () => boolean;
}
```

### State Properties

- **`agent`**: The loaded Agent instance, or `null` if not loaded
- **`loading`**: Boolean indicating if agent is currently loading
- **`error`**: Error object if loading failed, or `null`

### Lifecycle Methods

- **`load()`**: Manually load the agent. Returns Promise resolving to Agent instance
- **`unload()`**: Unload and destroy the agent, cleanup resources
- **`reload()`**: Unload and reload the agent. Returns Promise resolving to Agent instance

### Core Methods

- **`show()`**: Show the agent with animation
- **`hide()`**: Hide the agent with animation
- **`play(animation)`**: Play a specific animation by name
- **`animate()`**: Play a random animation
- **`speak(text, hold?)`**: Make agent speak text. If `hold` is true, balloon stays until closed
- **`moveTo(x, y, duration?)`**: Move agent to screen coordinates
- **`gestureAt(x, y)`**: Make agent gesture toward coordinates

### Control Methods

- **`stop()`**: Stop all queued animations
- **`stopCurrent()`**: Stop only the current animation
- **`pause()`**: Pause agent animations
- **`resume()`**: Resume paused animations
- **`delay(ms)`**: Add delay to animation queue
- **`closeBalloon()`**: Close the speech balloon

### Utility Methods

- **`getAnimations()`**: Get array of all available animation names
- **`hasAnimation(name)`**: Check if agent has a specific animation
- **`isVisible()`**: Check if agent is currently visible

## Examples

### Basic Usage

```typescript
import { useAgent } from '@clippyjs/react';

function MyComponent() {
  const { agent, loading, load, speak } = useAgent('Clippy');

  const handleClick = async () => {
    await load();
    await speak('Hello! I'm Clippy!');
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Loading...' : 'Show Clippy'}
    </button>
  );
}
```

### Auto-Load with Initial Message

```typescript
import { useAgent } from '@clippyjs/react';

function WelcomeAgent() {
  const { agent, loading, error } = useAgent('Clippy', {
    autoLoad: true,
    autoShow: true,
    initialMessage: 'Welcome to our website!',
    initialPosition: { x: 100, y: 100 }
  });

  if (loading) return <div>Loading agent...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Agent loaded!</div>;
}
```

### Interactive Controls

```typescript
import { useAgent } from '@clippyjs/react';

function AgentController() {
  const {
    agent,
    loading,
    load,
    show,
    hide,
    play,
    speak,
    moveTo,
    getAnimations
  } = useAgent('Merlin');

  const handleLoad = async () => {
    await load();
    await show();
    await speak('I am Merlin the wizard!');
  };

  const handlePlayAnimation = async () => {
    const animations = getAnimations();
    const randomAnim = animations[Math.floor(Math.random() * animations.length)];
    await play(randomAnim);
  };

  const handleMoveToMouse = (e: React.MouseEvent) => {
    moveTo(e.clientX, e.clientY, 1000);
  };

  return (
    <div onClick={handleMoveToMouse}>
      <button onClick={handleLoad} disabled={loading}>
        Load Merlin
      </button>
      <button onClick={handlePlayAnimation} disabled={!agent}>
        Random Animation
      </button>
      <button onClick={() => hide()} disabled={!agent}>
        Hide
      </button>
    </div>
  );
}
```

### Multiple Agents

```typescript
import { useAgent } from '@clippyjs/react';

function MultiAgentDemo() {
  const clippy = useAgent('Clippy', { autoLoad: true });
  const rover = useAgent('Rover', { autoLoad: true });

  const handleConversation = async () => {
    await clippy.speak("Hi Rover!");
    await clippy.delay(1000);
    await rover.speak("Hello Clippy!");
  };

  return (
    <button onClick={handleConversation}>
      Start Conversation
    </button>
  );
}
```

### Error Handling

```typescript
import { useAgent } from '@clippyjs/react';
import { useEffect } from 'react';

function SafeAgent() {
  const { agent, loading, error, load } = useAgent('Clippy');

  useEffect(() => {
    load().catch(err => {
      console.error('Failed to load agent:', err);
      // Handle error (show notification, etc.)
    });
  }, [load]);

  if (error) {
    return (
      <div className="error">
        Failed to load agent: {error.message}
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading Clippy...</div>;
  }

  return <div>Agent ready!</div>;
}
```

### SSR-Safe Usage (Next.js)

```typescript
'use client';

import { useAgent } from '@clippyjs/react';
import { useEffect } from 'react';

export default function ClippyHelper() {
  const { load, speak, isVisible } = useAgent('Clippy');

  // Only load on client-side
  useEffect(() => {
    load().then(() => {
      speak('Welcome to Next.js!');
    });
  }, [load, speak]);

  return null; // Agent manages its own DOM
}
```

### Custom Asset Path

```typescript
import { useAgent } from '@clippyjs/react';

function CustomAssetsAgent() {
  const { agent, load } = useAgent('Clippy', {
    basePath: '/custom/path/to/agents/'
  });

  useEffect(() => {
    load();
  }, [load]);

  return null;
}
```

## Notes

### SSR Compatibility

The hook automatically detects server-side rendering and defers agent loading until the client-side hydration is complete. This prevents:
- Window/document access errors during SSR
- Hydration mismatches
- Memory leaks on server

### Memory Management

When `autoCleanup` is `true` (default), the agent is automatically destroyed when the component unmounts. This prevents memory leaks in single-page applications.

If you set `autoCleanup: false`, you must manually call `unload()` to clean up resources.

### Method Requirements

Most agent methods require the agent to be loaded first. Calling them before the agent is loaded will throw an error:

```typescript
const { speak, agent } = useAgent('Clippy');

// ❌ This will throw: "Agent not loaded"
await speak('Hello');

// ✅ This works
await load();
await speak('Hello');
```

### Animation Queue

Agent methods like `play()`, `speak()`, `moveTo()`, etc. are queued and executed in sequence. Use `stop()` to clear the queue or `stopCurrent()` to stop only the current animation.

### TypeScript Support

The hook is fully typed with TypeScript. All agent names, options, and return values have complete type definitions for excellent IDE autocomplete support.

## See Also

- [ClippyProvider](../components/ClippyProvider.md) - Context provider for agent management
- [Clippy Component](../components/Clippy.md) - Declarative component alternative
- [useClippy](./useClippy.md) - Access ClippyProvider context
- [Agent Types](../types/index.md) - TypeScript type definitions
