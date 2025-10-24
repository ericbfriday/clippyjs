# Type Definitions

Complete TypeScript type definitions for @clippyjs/react.

## Agent Names

### AgentName

Type representing available agent names.

```typescript
type AgentName =
  | 'Clippy'
  | 'Bonzi'
  | 'F1'
  | 'Genie'
  | 'Genius'
  | 'Links'
  | 'Merlin'
  | 'Peedy'
  | 'Rocky'
  | 'Rover';
```

**Available Agents:**
- `'Clippy'` - The classic Microsoft Office assistant paperclip
- `'Bonzi'` - The purple gorilla buddy
- `'F1'` - Formula 1 racing car
- `'Genie'` - The magic genie
- `'Genius'` - Einstein-like genius character
- `'Links'` - The helpful cat
- `'Merlin'` - The wizard
- `'Peedy'` - The green parrot
- `'Rocky'` - The dog
- `'Rover'` - The red dog

## Hook Types

### UseAgentOptions

Options for configuring the `useAgent` hook.

```typescript
interface UseAgentOptions {
  /** Auto-load agent on mount (default: false) */
  autoLoad?: boolean;

  /** Auto-show agent after loading (default: false) */
  autoShow?: boolean;

  /** Auto-cleanup agent on unmount (default: true) */
  autoCleanup?: boolean;

  /** Initial position for the agent */
  initialPosition?: { x: number; y: number };

  /** Initial message to speak */
  initialMessage?: string;

  /** Base path for assets (optional override) */
  basePath?: string;
}
```

### UseAgentReturn

Return value from the `useAgent` hook.

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

## Component Types

### ClippyProviderProps

Props for the `ClippyProvider` component.

```typescript
interface ClippyProviderProps {
  /** Child components */
  children: ReactNode;

  /** Default base path for agent assets */
  defaultBasePath?: string;

  /** Maximum number of concurrent agents (default: 5) */
  maxAgents?: number;

  /** Enable/disable sounds globally (default: true) */
  soundEnabled?: boolean;

  /** Error callback for global error handling */
  onError?: (error: Error, agentName?: string) => void;
}
```

### ClippyProps

Props for the declarative `Clippy` component.

```typescript
interface ClippyProps {
  /** Name of the agent to load */
  name: AgentName;

  /** Custom base path for agent assets */
  basePath?: string;

  /** Whether to show immediately after loading (default: true) */
  showOnLoad?: boolean;

  /** Callback when agent is loaded */
  onLoad?: (agent: Agent) => void;

  /** Callback on load error */
  onError?: (error: Error) => void;

  /** Initial position */
  position?: { x: number; y: number };

  /** Initial message to speak */
  speak?: string;

  /** Whether to hold the speech balloon */
  holdSpeech?: boolean;
}
```

## Context Types

### ClippyContextType

Context value provided by `ClippyProvider`.

```typescript
interface ClippyContextType {
  /** Map of all loaded agents by name */
  agents: Map<string, Agent>;

  /** Load a new agent or return existing one */
  loadAgent: (name: string, options?: LoadAgentOptions) => Promise<Agent>;

  /** Unload and destroy an agent */
  unloadAgent: (name: string) => void;

  /** Get a loaded agent by name */
  getAgent: (name: string) => Agent | undefined;
}
```

### LoadAgentOptions

Options for loading an agent via context.

```typescript
interface LoadAgentOptions {
  /** Base path for agent assets */
  basePath?: string;

  /** Whether to show agent after loading (default: true) */
  show?: boolean;
}
```

## Core Types (from @clippyjs/core)

### Agent

The core Agent class instance.

```typescript
class Agent {
  // Visibility
  show(fast?: boolean): Promise<void>;
  hide(fast?: boolean): Promise<void>;
  isVisible(): boolean;

  // Animations
  play(animation: string): Promise<void>;
  animate(): Promise<void>;
  getAnimations(): string[];
  hasAnimation(name: string): boolean;

  // Movement
  moveTo(x: number, y: number, duration?: number): Promise<void>;
  gestureAt(x: number, y: number): Promise<void>;

  // Speech
  speak(text: string, hold?: boolean): Promise<void>;
  closeBalloon(): void;

  // Control
  stop(): void;
  stopCurrent(): void;
  pause(): void;
  resume(): void;
  delay(ms: number): Promise<void>;

  // Lifecycle
  destroy(): void;
}
```

### AgentData

Animation data structure for agents.

```typescript
interface AgentData {
  framesize: [number, number];
  frames: Record<string, Frame>;
  animations: Record<string, Animation>;
  sounds?: Record<string, string>;
}
```

### Animation

Animation definition with frames and transitions.

```typescript
interface Animation {
  frames: Frame[];
  useExitBranching?: boolean;
}
```

### Frame

Individual animation frame data.

```typescript
interface Frame {
  duration: number;
  images: number[][];
  sound?: string;
  exitBranch?: number;
  branching?: {
    branches: Array<{
      frameIndex: number;
      weight: number;
    }>;
  };
}
```

### SoundMap

Map of sound names to URLs.

```typescript
type SoundMap = Record<string, string>;
```

### Direction

Movement direction enum.

```typescript
enum Direction {
  Up = 'Up',
  Down = 'Down',
  Left = 'Left',
  Right = 'Right',
  UpLeft = 'UpLeft',
  UpRight = 'UpRight',
  DownLeft = 'DownLeft',
  DownRight = 'DownRight'
}
```

### AnimationState

Current state of an animation.

```typescript
enum AnimationState {
  WAITING = 0,
  EXITED = 1,
  ENTERED = 2
}
```

## Type Guards

### isAgent

Check if a value is an Agent instance.

```typescript
function isAgent(value: unknown): value is Agent {
  return value instanceof Agent;
}
```

**Example:**
```typescript
const maybeAgent = getAgent('Clippy');
if (isAgent(maybeAgent)) {
  maybeAgent.speak('Hello!');
}
```

### isAgentName

Check if a string is a valid agent name.

```typescript
function isAgentName(name: string): name is AgentName {
  const validNames: AgentName[] = [
    'Clippy', 'Bonzi', 'F1', 'Genie', 'Genius',
    'Links', 'Merlin', 'Peedy', 'Rocky', 'Rover'
  ];
  return validNames.includes(name as AgentName);
}
```

**Example:**
```typescript
const userInput = 'Clippy';
if (isAgentName(userInput)) {
  loadAgent(userInput); // TypeScript knows it's valid
}
```

## Usage Examples

### Type-Safe Agent Loading

```typescript
import { useAgent, AgentName } from '@clippyjs/react';

function TypeSafeAgent({ name }: { name: AgentName }) {
  const { agent, load, speak } = useAgent(name);

  // TypeScript ensures 'name' is valid
  // 'agent' is properly typed as Agent | null
  // All methods have correct signatures

  return (
    <button onClick={() => {
      load().then(() => speak('Hello!'));
    }}>
      Load {name}
    </button>
  );
}
```

### Typed Error Handling

```typescript
import { ClippyProvider } from '@clippyjs/react';

function App() {
  const handleError = (error: Error, agentName?: string) => {
    // Both parameters are properly typed
    console.error(`Agent ${agentName ?? 'unknown'} error:`, error.message);
  };

  return (
    <ClippyProvider onError={handleError}>
      <YourApp />
    </ClippyProvider>
  );
}
```

### Generic Agent Component

```typescript
import { useAgent, AgentName, UseAgentReturn } from '@clippyjs/react';

function AgentController<T extends AgentName>({ name }: { name: T }) {
  const agentAPI: UseAgentReturn = useAgent(name, { autoLoad: true });

  // Full type safety throughout
  return (
    <div>
      <button onClick={() => agentAPI.play('Wave')}>
        Wave
      </button>
    </div>
  );
}
```

### Strict Typing Example

```typescript
import { Agent } from '@clippyjs/core';
import { useAgent } from '@clippyjs/react';

function StrictExample() {
  const { agent } = useAgent('Clippy', { autoLoad: true });

  // TypeScript knows these methods exist and their signatures
  const handleClick = async () => {
    if (agent) {
      await agent.show(); // ✅ Correct
      await agent.speak('Hello'); // ✅ Correct
      await agent.moveTo(100, 200, 1000); // ✅ Correct

      // @ts-expect-error - Method doesn't exist
      agent.invalidMethod(); // ❌ TypeScript error
    }
  };

  return <button onClick={handleClick}>Click</button>;
}
```

## See Also

- [useAgent Hook](../hooks/useAgent.md)
- [ClippyProvider Component](../components/ClippyProvider.md)
- [@clippyjs/core Documentation](https://github.com/ericbfriday/clippyjs)
