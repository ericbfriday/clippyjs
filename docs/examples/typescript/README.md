# TypeScript Examples

Comprehensive TypeScript examples for @clippyjs/react showcasing advanced patterns and best practices.

## Examples

### 1. Basic TypeScript (`basic-typescript.tsx`)

**What it demonstrates:**
- Fundamental TypeScript integration
- Type-safe agent selection
- Proper error handling with type narrowing
- Type-safe event handlers
- Basic state management

**Key concepts:**
- `AgentName` type usage
- Type-safe hook returns
- Error type narrowing with `as Error`
- Readonly arrays for constants

**Use this when:** You're getting started with TypeScript and want to see basic patterns

---

### 2. Strict Mode (`strict-mode.tsx`)

**What it demonstrates:**
- Strict TypeScript compilation
- Type guards for null safety
- Readonly types and immutability
- Comprehensive error handling
- Effect dependencies and memoization

**Key concepts:**
- Type guard functions (`isAgentLoaded`)
- Readonly interfaces and const assertions
- Proper useCallback/useEffect usage
- Type-safe prop interfaces
- Error instanceof checks

**Use this when:** You want maximum type safety and are using strict TypeScript settings

**Compiler flags:**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noImplicitReturns": true
}
```

---

### 3. Generic Utilities (`generic-utils.tsx`)

**What it demonstrates:**
- Reusable generic utilities
- Custom hooks with generics
- Type-safe action creators
- Sequence builders
- Animation validators

**Key concepts:**
- Generic agent actions `AgentAction<T>`
- Custom hook patterns
- Builder pattern with TypeScript
- Utility function libraries
- Type-safe method chaining

**Use this when:** You want to create reusable utilities and abstractions for your application

---

## Running the Examples

### Installation

```bash
# Install dependencies
npm install @clippyjs/react react react-dom

# If using TypeScript
npm install -D typescript @types/react @types/react-dom
```

### TypeScript Configuration

Create or update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Usage in Your App

```typescript
import { ClippyProvider } from '@clippyjs/react';
import BasicTypeScriptExample from './examples/basic-typescript';

function App() {
  return (
    <ClippyProvider>
      <BasicTypeScriptExample />
    </ClippyProvider>
  );
}
```

## Common Patterns

### Type-Safe Agent Selection

```typescript
import { AgentName } from '@clippyjs/react';

const agents: readonly AgentName[] = ['Clippy', 'Merlin', 'Rover'] as const;

function AgentSelector() {
  const [selected, setSelected] = useState<AgentName>('Clippy');

  return (
    <select value={selected} onChange={(e) => setSelected(e.target.value as AgentName)}>
      {agents.map(name => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  );
}
```

### Type Guards

```typescript
function isAgentLoaded(agent: Agent | null): agent is Agent {
  return agent !== null;
}

// Usage
if (isAgentLoaded(agent)) {
  agent.speak('Hello'); // TypeScript knows agent is not null
}
```

### Generic Agent Hook

```typescript
function useAgentWithActions<T extends AgentName>(
  name: T,
  actions: AgentAction[]
) {
  const agentAPI = useAgent(name, { autoLoad: true });

  const executeActions = useCallback(async () => {
    if (!agentAPI.agent) return;

    for (const action of actions) {
      await action(agentAPI.agent);
    }
  }, [agentAPI.agent, actions]);

  return { ...agentAPI, executeActions };
}
```

### Type-Safe Error Handling

```typescript
try {
  await agent.speak('Hello');
} catch (err) {
  if (err instanceof Error) {
    console.error('Speech failed:', err.message);
  } else {
    console.error('Unknown error:', err);
  }
}
```

## Best Practices

### 1. Use Type Guards

Always use type guards to narrow null types:

```typescript
// ✅ Good
if (agent !== null) {
  agent.speak('Hello');
}

// ✅ Better
function isLoaded(agent: Agent | null): agent is Agent {
  return agent !== null;
}

if (isLoaded(agent)) {
  agent.speak('Hello');
}
```

### 2. Avoid Type Assertions

Prefer type guards over assertions:

```typescript
// ❌ Bad
const agent = getAgent('Clippy')!; // Non-null assertion

// ✅ Good
const agent = getAgent('Clippy');
if (agent) {
  // Use agent safely
}
```

### 3. Use Const Assertions

For readonly arrays and objects:

```typescript
// ✅ Good
const agents = ['Clippy', 'Merlin'] as const;
type AgentTuple = typeof agents; // readonly ['Clippy', 'Merlin']

const config = {
  name: 'Clippy',
  greeting: 'Hello',
} as const;
```

### 4. Type Function Returns

Always type async function returns:

```typescript
// ✅ Good
async function loadAndGreet(): Promise<void> {
  await agent.load();
  await agent.speak('Hello');
}

// ❌ Bad
async function loadAndGreet() { // Returns Promise<any>
  await agent.load();
  await agent.speak('Hello');
}
```

### 5. Use Generics for Reusability

```typescript
// ✅ Good
function createAgentAction<T extends AgentName>(
  name: T,
  action: (agent: Agent) => Promise<void>
) {
  return { name, action };
}
```

## Troubleshooting

### "Cannot find name 'AgentName'"

Make sure you're importing from the correct package:

```typescript
import { AgentName } from '@clippyjs/react';
```

### "Type 'null' is not assignable to type 'Agent'"

Use type guards or optional chaining:

```typescript
// ✅ Good
if (agent) {
  agent.speak('Hello');
}

// ✅ Also good
agent?.speak('Hello');
```

### "Property 'X' does not exist on type 'Agent'"

Make sure you have the latest type definitions:

```bash
npm install @clippyjs/react@latest
```

### Strict mode errors

If you're getting errors with strict mode, ensure all variables are properly typed:

```typescript
// ❌ Bad
const [agent, setAgent] = useState(null);

// ✅ Good
const [agent, setAgent] = useState<Agent | null>(null);
```

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [@clippyjs/react API Reference](../../api-reference/hooks/useAgent.md)
- [Type Definitions](../../api-reference/types/index.md)

## Contributing

Have a useful TypeScript pattern? Submit a PR with your example!

Requirements:
- Full type safety (no `any` types)
- Comprehensive JSDoc comments
- Demonstrates a specific pattern or technique
- Includes usage examples
