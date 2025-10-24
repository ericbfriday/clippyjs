# ClippyProvider

React Context Provider for managing Clippy agents.

## Description

`ClippyProvider` is the root component that enables Clippy functionality throughout your React application. It manages agent lifecycle, enforces resource limits, provides centralized error handling, and ensures proper cleanup.

All Clippy hooks and components must be used within a ClippyProvider tree.

## Signature

```typescript
function ClippyProvider(props: ClippyProviderProps): JSX.Element
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | - | Child components that can use Clippy hooks |
| `defaultBasePath` | `string` | No | CDN path | Default base path for loading agent assets |
| `maxAgents` | `number` | No | `5` | Maximum number of concurrent agents allowed |
| `soundEnabled` | `boolean` | No | `true` | Enable/disable sounds globally (future feature) |
| `onError` | `(error: Error, agentName?: string) => void` | No | - | Global error handler for agent operations |

## Examples

### Basic Usage

```typescript
import { ClippyProvider } from '@clippyjs/react';

function App() {
  return (
    <ClippyProvider>
      <YourApp />
    </ClippyProvider>
  );
}
```

### With Custom Configuration

```typescript
import { ClippyProvider } from '@clippyjs/react';

function App() {
  return (
    <ClippyProvider
      maxAgents={3}
      defaultBasePath="/assets/agents/"
      onError={(error, agentName) => {
        console.error(`Error with ${agentName}:`, error);
        // Send to error tracking service
      }}
    >
      <YourApp />
    </ClippyProvider>
  );
}
```

### Next.js App Router

```typescript
// app/layout.tsx
import { ClippyProvider } from '@clippyjs/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClippyProvider maxAgents={2}>
          {children}
        </ClippyProvider>
      </body>
    </html>
  );
}
```

### Next.js Pages Router

```typescript
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { ClippyProvider } from '@clippyjs/react';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClippyProvider>
      <Component {...pageProps} />
    </ClippyProvider>
  );
}
```

### With Error Tracking

```typescript
import { ClippyProvider } from '@clippyjs/react';
import * as Sentry from '@sentry/react';

function App() {
  const handleError = (error: Error, agentName?: string) => {
    // Log to console
    console.error('Clippy error:', error);

    // Send to Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'clippy',
        agentName: agentName || 'unknown',
      },
    });

    // Show user notification
    toast.error(`Failed to load ${agentName}`);
  };

  return (
    <ClippyProvider onError={handleError}>
      <YourApp />
    </ClippyProvider>
  );
}
```

### Custom Asset Path

```typescript
import { ClippyProvider } from '@clippyjs/react';

function App() {
  // Load from your own CDN or local assets
  return (
    <ClippyProvider
      defaultBasePath="https://cdn.example.com/clippy-agents/"
    >
      <YourApp />
    </ClippyProvider>
  );
}
```

### Production Configuration

```typescript
import { ClippyProvider } from '@clippyjs/react';

const isProd = process.env.NODE_ENV === 'production';

function App() {
  return (
    <ClippyProvider
      maxAgents={isProd ? 2 : 5}
      defaultBasePath={
        isProd
          ? 'https://cdn.example.com/agents/'
          : '/dev/agents/'
      }
      onError={(error, agentName) => {
        if (isProd) {
          // Only log errors in development
          // In production, send to monitoring service
          errorMonitoring.captureException(error);
        } else {
          console.error('Clippy error:', error);
        }
      }}
    >
      <YourApp />
    </ClippyProvider>
  );
}
```

### Conditional Provider

```typescript
import { ClippyProvider } from '@clippyjs/react';

function App() {
  const enableClippy = useFeatureFlag('clippy-assistant');

  if (!enableClippy) {
    return <YourApp />;
  }

  return (
    <ClippyProvider>
      <YourApp />
    </ClippyProvider>
  );
}
```

## Behavior

### Agent Lifecycle

The ClippyProvider manages all agent instances:

1. **Loading**: Agents are loaded on-demand via `useAgent` or `useClippy`
2. **Storage**: Loaded agents are stored in a Map by name
3. **Reuse**: Loading the same agent name returns the existing instance
4. **Cleanup**: All agents are destroyed when the provider unmounts

### Resource Limits

The `maxAgents` prop enforces a hard limit on concurrent agents:

```typescript
<ClippyProvider maxAgents={2}>
  {/* Can only load 2 agents at once */}
</ClippyProvider>
```

Attempting to exceed the limit throws an error:

```
Error: Maximum 2 agents allowed. Unload an agent before loading another.
```

### Error Handling

The `onError` callback is invoked whenever:
- Agent loading fails
- Maximum agents limit is exceeded
- Asset loading fails
- Any agent operation throws an error

The callback receives:
- `error`: The Error object
- `agentName`: (optional) Name of the agent that caused the error

### Asset Loading

Agents are loaded from the `defaultBasePath` which defaults to:
```
https://gitcdn.xyz/repo/pi0/clippyjs/master/assets/agents/
```

Override this to use your own assets:

```typescript
<ClippyProvider defaultBasePath="/my/agents/">
  {/* Loads from /my/agents/Clippy/, /my/agents/Merlin/, etc. */}
</ClippyProvider>
```

Individual `useAgent` calls can override the base path:

```typescript
const { load } = useAgent('Clippy', {
  basePath: '/custom/path/'
});
```

## Notes

### SSR Compatibility

ClippyProvider is SSR-safe and can be used with Next.js, Remix, or other server-side rendering frameworks. Agent loading is automatically deferred until client-side hydration completes.

### Performance Considerations

Each agent instance includes:
- Sprite images (~100-500KB per agent)
- Animation data (~20-50KB per agent)
- Sound files (~100-300KB per agent)

Limit concurrent agents based on your performance requirements:
- **Low-end devices**: maxAgents={1-2}
- **Standard desktop**: maxAgents={3-5}
- **High-performance**: maxAgents={5-10}

### Multiple Providers

You generally only need one ClippyProvider at the root of your app. Multiple providers will create separate agent contexts that don't share state.

```typescript
// ❌ Usually not needed
<ClippyProvider>
  <ClippyProvider>
    {/* Nested provider creates separate context */}
  </ClippyProvider>
</ClippyProvider>

// ✅ Single provider at root
<ClippyProvider>
  <App />
</ClippyProvider>
```

### Testing

Mock the provider in tests:

```typescript
import { render } from '@testing-library/react';
import { ClippyProvider } from '@clippyjs/react';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <ClippyProvider>{ui}</ClippyProvider>
  );
}

test('component uses clippy', () => {
  renderWithProvider(<MyComponent />);
  // Test your component
});
```

## See Also

- [useAgent](../hooks/useAgent.md) - Primary hook for agent control
- [useClippy](../hooks/useClippy.md) - Access provider context
- [Error Handling Guide](../advanced/error-handling.md) - Error handling strategies
- [Custom Assets Guide](../advanced/custom-assets.md) - Using custom agent assets
