# useClippy

Access the ClippyProvider context for direct agent management.

## Description

`useClippy` provides access to the ClippyProvider context, allowing direct interaction with the agent management system. This is a lower-level API compared to `useAgent` and is useful when you need direct access to all loaded agents or custom agent management logic.

## Signature

```typescript
function useClippy(): ClippyContextType
```

## Returns

### ClippyContextType

```typescript
interface ClippyContextType {
  agents: Map<string, Agent>;
  loadAgent: (name: string, options?: LoadAgentOptions) => Promise<Agent>;
  unloadAgent: (name: string) => void;
  getAgent: (name: string) => Agent | undefined;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `agents` | `Map<string, Agent>` | Map of all currently loaded agents by name |
| `loadAgent` | `(name: string, options?: LoadAgentOptions) => Promise<Agent>` | Load a new agent or return existing one |
| `unloadAgent` | `(name: string) => void` | Unload and destroy an agent by name |
| `getAgent` | `(name: string) => Agent \| undefined` | Get a loaded agent by name |

### LoadAgentOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `basePath` | `string` | No | Provider's `defaultBasePath` | Custom path for agent assets |
| `show` | `boolean` | No | `true` | Whether to show agent after loading |

## Examples

### Basic Usage

```typescript
import { useClippy } from '@clippyjs/react';

function AgentManager() {
  const { agents, loadAgent, unloadAgent } = useClippy();

  const handleLoad = async () => {
    const agent = await loadAgent('Clippy');
    await agent.speak('Hello!');
  };

  return (
    <div>
      <p>Loaded agents: {agents.size}</p>
      <button onClick={handleLoad}>Load Clippy</button>
      <button onClick={() => unloadAgent('Clippy')}>
        Unload Clippy
      </button>
    </div>
  );
}
```

### Check if Agent is Loaded

```typescript
import { useClippy } from '@clippyjs/react';

function AgentStatus() {
  const { getAgent } = useClippy();

  const clippy = getAgent('Clippy');
  const isLoaded = clippy !== undefined;

  return (
    <div>
      Clippy is {isLoaded ? 'loaded' : 'not loaded'}
    </div>
  );
}
```

### List All Loaded Agents

```typescript
import { useClippy } from '@clippyjs/react';

function AgentList() {
  const { agents } = useClippy();

  return (
    <ul>
      {Array.from(agents.keys()).map(name => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}
```

### Custom Agent Management

```typescript
import { useClippy } from '@clippyjs/react';
import { useState } from 'react';

function CustomManager() {
  const { loadAgent, getAgent, unloadAgent } = useClippy();
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const switchAgent = async (name: string) => {
    // Unload previous agent if exists
    if (activeAgent) {
      unloadAgent(activeAgent);
    }

    // Load new agent
    const agent = await loadAgent(name);
    await agent.speak(`I'm ${name}!`);
    setActiveAgent(name);
  };

  return (
    <div>
      <button onClick={() => switchAgent('Clippy')}>Clippy</button>
      <button onClick={() => switchAgent('Merlin')}>Merlin</button>
      <button onClick={() => switchAgent('Rover')}>Rover</button>
      <p>Active: {activeAgent || 'None'}</p>
    </div>
  );
}
```

### Conditional Loading

```typescript
import { useClippy } from '@clippyjs/react';
import { useEffect } from 'react';

function ConditionalAgent({ userLevel }: { userLevel: number }) {
  const { loadAgent, getAgent } = useClippy();

  useEffect(() => {
    // Load different agents based on user level
    const agentName = userLevel > 10 ? 'Merlin' : 'Clippy';

    // Check if already loaded
    if (!getAgent(agentName)) {
      loadAgent(agentName).then(agent => {
        agent.speak(`Welcome, level ${userLevel} user!`);
      });
    }
  }, [userLevel, loadAgent, getAgent]);

  return null;
}
```

### Access Loaded Agent Directly

```typescript
import { useClippy } from '@clippyjs/react';
import { useEffect } from 'react';

function DirectAgentControl() {
  const { getAgent, loadAgent } = useClippy();

  useEffect(() => {
    loadAgent('Clippy');
  }, [loadAgent]);

  const handleClick = () => {
    const agent = getAgent('Clippy');
    if (agent) {
      agent.play('Congratulate');
      agent.speak('Great job!');
    }
  };

  return <button onClick={handleClick}>Celebrate</button>;
}
```

## Notes

### Context Requirement

`useClippy` must be called within a component tree wrapped by `ClippyProvider`. Calling it outside will throw an error:

```typescript
// ❌ This will throw: "useClippy must be used within a ClippyProvider"
function App() {
  const { loadAgent } = useClippy();
  return <div>...</div>;
}

// ✅ This works
function App() {
  return (
    <ClippyProvider>
      <MyComponent />
    </ClippyProvider>
  );
}

function MyComponent() {
  const { loadAgent } = useClippy();
  return <div>...</div>;
}
```

### Agent Limit

The ClippyProvider enforces a maximum number of concurrent agents (default: 5). Attempting to load more will throw an error. Configure this with the `maxAgents` prop:

```typescript
<ClippyProvider maxAgents={10}>
  {/* Can load up to 10 agents */}
</ClippyProvider>
```

### Direct vs useAgent

For most use cases, prefer the `useAgent` hook over `useClippy`:

- **Use `useAgent`** when: You need one agent per component with automatic lifecycle management
- **Use `useClippy`** when: You need access to all agents, custom management logic, or conditional loading

```typescript
// ✅ Preferred for single agent
function Component() {
  const { speak } = useAgent('Clippy', { autoLoad: true });
  return <button onClick={() => speak('Hi')}>Say Hi</button>;
}

// ✅ Better for multi-agent coordination
function Component() {
  const { loadAgent, getAgent } = useClippy();

  const makeAgentsInteract = async () => {
    const clippy = await loadAgent('Clippy');
    const rover = await loadAgent('Rover');
    await clippy.speak('Hello Rover!');
    await rover.speak('Hi Clippy!');
  };

  return <button onClick={makeAgentsInteract}>Interact</button>;
}
```

### Memory Management

Agents loaded via `loadAgent()` are automatically cleaned up when the ClippyProvider unmounts. However, you should call `unloadAgent()` when you no longer need an agent to free resources immediately.

### Agent Reloading

If you call `loadAgent()` with a name that's already loaded, it returns the existing agent instead of creating a new one:

```typescript
const agent1 = await loadAgent('Clippy'); // Creates new agent
const agent2 = await loadAgent('Clippy'); // Returns same agent
console.log(agent1 === agent2); // true
```

## See Also

- [useAgent](./useAgent.md) - Higher-level agent control hook
- [ClippyProvider](../components/ClippyProvider.md) - Context provider
- [Multiple Agents Guide](../advanced/multiple-agents.md) - Managing multiple agents
