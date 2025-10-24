# Clippy Component

Declarative component for easy Clippy agent setup.

## Description

The `Clippy` component provides a simple, declarative way to add a Clippy agent to your application. It handles loading, positioning, and initial messages automatically. For more control, use the `useAgent` hook instead.

## Signature

```typescript
function Clippy(props: ClippyProps): JSX.Element
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `AgentName` | Yes | - | Name of the agent (e.g., 'Clippy', 'Merlin', 'Rover') |
| `basePath` | `string` | No | Provider's default | Custom base path for agent assets |
| `showOnLoad` | `boolean` | No | `true` | Whether to show agent immediately after loading |
| `position` | `{ x: number; y: number }` | No | - | Initial position for the agent |
| `speak` | `string` | No | - | Message for agent to speak |
| `holdSpeech` | `boolean` | No | `false` | Keep speech balloon open until closed |
| `onLoad` | `(agent: Agent) => void` | No | - | Callback when agent finishes loading |
| `onError` | `(error: Error) => void` | No | - | Callback when loading fails |

## Examples

### Basic Usage

```typescript
import { Clippy } from '@clippyjs/react';

function App() {
  return (
    <div>
      <Clippy name="Clippy" />
    </div>
  );
}
```

### With Initial Message

```typescript
import { Clippy } from '@clippyjs/react';

function WelcomePage() {
  return (
    <div>
      <h1>Welcome!</h1>
      <Clippy
        name="Clippy"
        speak="Welcome to our website! How can I help you today?"
        holdSpeech={true}
      />
    </div>
  );
}
```

### With Position

```typescript
import { Clippy } from '@clippyjs/react';

function PositionedAgent() {
  return (
    <Clippy
      name="Merlin"
      position={{ x: 100, y: 100 }}
      speak="I'm positioned at 100, 100!"
    />
  );
}
```

### With Callbacks

```typescript
import { Clippy } from '@clippyjs/react';
import { useState } from 'react';

function CallbackExample() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {loaded && <p>Agent loaded successfully!</p>}
      {error && <p className="error">Error: {error}</p>}

      <Clippy
        name="Clippy"
        onLoad={(agent) => {
          console.log('Agent loaded:', agent);
          setLoaded(true);
        }}
        onError={(err) => {
          console.error('Load failed:', err);
          setError(err.message);
        }}
      />
    </div>
  );
}
```

### Multiple Agents

```typescript
import { Clippy } from '@clippyjs/react';

function MultipleAgents() {
  return (
    <div>
      <Clippy
        name="Clippy"
        position={{ x: 100, y: 100 }}
        speak="I'm Clippy!"
      />
      <Clippy
        name="Rover"
        position={{ x: 300, y: 100 }}
        speak="I'm Rover!"
      />
    </div>
  );
}
```

### Custom Asset Path

```typescript
import { Clippy } from '@clippyjs/react';

function CustomAssets() {
  return (
    <Clippy
      name="Clippy"
      basePath="/custom/agents/"
    />
  );
}
```

### Conditional Rendering

```typescript
import { Clippy } from '@clippyjs/react';

function ConditionalAgent({ showHelper }: { showHelper: boolean }) {
  if (!showHelper) return null;

  return (
    <Clippy
      name="Clippy"
      speak="Need help? I'm here to assist!"
    />
  );
}
```

### Dynamic Message

```typescript
import { Clippy } from '@clippyjs/react';
import { useEffect, useState } from 'react';

function DynamicMessage() {
  const [message, setMessage] = useState('Hello!');

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessage('How are you doing?');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Clippy
      name="Clippy"
      speak={message}
    />
  );
}
```

### Don't Show Immediately

```typescript
import { Clippy } from '@clippyjs/react';

function HiddenAgent() {
  // Agent loads but stays hidden
  // Control via onLoad callback
  return (
    <Clippy
      name="Clippy"
      showOnLoad={false}
      onLoad={(agent) => {
        // Manually show when needed
        setTimeout(() => {
          agent.show().then(() => {
            agent.speak('Surprise!');
          });
        }, 5000);
      }}
    />
  );
}
```

## Behavior

### Component Lifecycle

1. **Mount**: Component mounts and checks if agent is already loaded
2. **Load**: Loads agent if not already loaded
3. **Show**: Shows agent if `showOnLoad={true}` (default)
4. **Position**: Moves to `position` if provided
5. **Speak**: Speaks message if `speak` prop provided
6. **Callback**: Calls `onLoad` callback if provided
7. **Unmount**: Component unmounts but agent remains loaded

### Agent Persistence

The Clippy component loads agents into the ClippyProvider context. The agent persists even after the component unmounts:

```typescript
function App() {
  const [show, setShow] = useState(true);

  return (
    <div>
      <button onClick={() => setShow(!show)}>
        Toggle Component
      </button>

      {show && <Clippy name="Clippy" />}
      {/* Agent stays visible even when component unmounts */}
    </div>
  );
}
```

To remove the agent when component unmounts, use `useAgent` with `autoCleanup={true}`.

### Speech Updates

When the `speak` prop changes, the agent will speak the new message:

```typescript
function DynamicSpeech() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
      <Clippy
        name="Clippy"
        speak={`The count is ${count}`}
      />
    </div>
  );
}
```

### Error Handling

Loading errors are caught and passed to the `onError` callback:

```typescript
<Clippy
  name="InvalidAgent"
  onError={(error) => {
    console.error('Failed to load:', error);
    // Handle error (show notification, fallback, etc.)
  }}
/>
```

## Notes

### Imperative vs Declarative

**Use `Clippy` component when:**
- You want simple, declarative agent setup
- Initial configuration is sufficient
- You don't need programmatic control after load

**Use `useAgent` hook when:**
- You need programmatic control of agent
- You want to trigger animations based on user actions
- You need auto-cleanup when component unmounts
- You need access to agent state (loading, error)

```typescript
// ✅ Good use of component
<Clippy name="Clippy" speak="Welcome!" />

// ✅ Good use of hook
function InteractiveAgent() {
  const { speak, play } = useAgent('Clippy', { autoLoad: true });

  return (
    <button onClick={() => {
      play('Congratulate');
      speak('Great job!');
    }}>
      Celebrate
    </button>
  );
}
```

### Rendering

The component renders `null` - the agent manages its own DOM and is positioned fixed on the page. The component only handles the loading and configuration logic.

### SSR Compatibility

The component is SSR-safe. Agent loading is automatically deferred until client-side hydration completes, preventing server-side errors.

### Performance

Each `Clippy` component instance will attempt to load the agent. If the agent is already loaded (e.g., by another component with the same `name`), the existing agent instance is reused.

Multiple components with different names will load multiple agents:

```typescript
// This loads 3 different agents
<Clippy name="Clippy" />
<Clippy name="Merlin" />
<Clippy name="Rover" />
```

## See Also

- [useAgent](../hooks/useAgent.md) - Imperative hook API for more control
- [ClippyProvider](./ClippyProvider.md) - Required context provider
- [Agent Types](../types/index.md) - Available agent names
- [Getting Started](../../getting-started/index.md) - Quick start guide
