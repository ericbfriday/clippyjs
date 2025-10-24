# Getting Started with @clippyjs/react

Get Clippy running in your React application in under 5 minutes!

## Installation

Install the package via npm, yarn, or pnpm:

```bash
# npm
npm install @clippyjs/react

# yarn
yarn add @clippyjs/react

# pnpm
pnpm add @clippyjs/react
```

## Quick Start

### Step 1: Add ClippyProvider

Wrap your application with `ClippyProvider` to enable Clippy functionality:

```typescript
// app/layout.tsx (Next.js App Router)
import { ClippyProvider } from '@clippyjs/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClippyProvider>
          {children}
        </ClippyProvider>
      </body>
    </html>
  );
}
```

Or for Create React App / Vite:

```typescript
// src/App.tsx
import { ClippyProvider } from '@clippyjs/react';

function App() {
  return (
    <ClippyProvider>
      <YourApp />
    </ClippyProvider>
  );
}

export default App;
```

### Step 2: Use the Hook

Use the `useAgent` hook to control Clippy:

```typescript
'use client'; // Next.js App Router only

import { useAgent } from '@clippyjs/react';

export default function HomePage() {
  const { load, speak } = useAgent('Clippy');

  const handleClick = async () => {
    await load();
    await speak('Hello! Welcome to our website!');
  };

  return (
    <button onClick={handleClick}>
      Show Clippy
    </button>
  );
}
```

That's it! Click the button and Clippy will appear and greet you.

## Auto-Loading Clippy

Want Clippy to appear automatically when the page loads? Use the `autoLoad` and `autoShow` options:

```typescript
import { useAgent } from '@clippyjs/react';
import { useEffect } from 'react';

export default function WelcomePage() {
  const { speak } = useAgent('Clippy', {
    autoLoad: true,   // Load on mount
    autoShow: true,   // Show immediately
  });

  useEffect(() => {
    speak('Welcome to our site!');
  }, [speak]);

  return <div>Welcome!</div>;
}
```

## Making Clippy Speak

Use the `speak` method to make Clippy say anything:

```typescript
const { speak } = useAgent('Clippy', { autoLoad: true });

// Simple message
await speak('Hello!');

// Longer message
await speak('Did you know you can interact with me?');

// Hold the balloon open
await speak('This message stays until you close it!', true);
```

## Playing Animations

Clippy has many built-in animations:

```typescript
const { play, getAnimations } = useAgent('Clippy', { autoLoad: true });

// Play specific animation
await play('Wave');
await play('Congratulate');
await play('ThinkingLoop');

// Get all available animations
const animations = getAnimations();
console.log(animations);
// ['Idle', 'Wave', 'Congratulate', 'ThinkingLoop', ...]
```

### Popular Animations

- `Wave` - Clippy waves hello
- `Congratulate` - Celebratory animation
- `ThinkingLoop` - Clippy thinking
- `Explain` - Explaining something
- `GetAttention` - Getting user's attention
- `LookDown` / `LookUp` / `LookLeft` / `LookRight` - Looking around

## Moving Clippy

Position Clippy anywhere on screen:

```typescript
const { moveTo, gestureAt } = useAgent('Clippy', { autoLoad: true });

// Move to specific coordinates (x, y, duration_ms)
await moveTo(100, 100, 1000);

// Gesture toward an element
const button = document.querySelector('#my-button');
const rect = button.getBoundingClientRect();
await gestureAt(rect.left, rect.top);
await speak('Click this button!');
```

## Using Multiple Agents

Want more than one agent? No problem:

```typescript
import { useAgent } from '@clippyjs/react';

function MultiAgentDemo() {
  const clippy = useAgent('Clippy', { autoLoad: true });
  const rover = useAgent('Rover', { autoLoad: true });

  const startConversation = async () => {
    await clippy.speak("Hi Rover!");
    await rover.speak("Hello Clippy!");
    await clippy.play('Wave');
    await rover.play('Wave');
  };

  return (
    <button onClick={startConversation}>
      Start Conversation
    </button>
  );
}
```

## Declarative Component

Prefer a declarative API? Use the `Clippy` component:

```typescript
import { Clippy } from '@clippyjs/react';

function DeclarativeExample() {
  return (
    <div>
      <h1>Welcome!</h1>
      <Clippy
        name="Clippy"
        speak="Welcome to our website!"
        position={{ x: 100, y: 100 }}
      />
    </div>
  );
}
```

## Error Handling

Handle loading errors gracefully:

```typescript
const { load, error } = useAgent('Clippy');

const handleLoad = async () => {
  try {
    await load();
  } catch (err) {
    console.error('Failed to load:', err);
    // Show error message to user
  }
};

// Or use the error state
if (error) {
  return <div>Failed to load Clippy: {error.message}</div>;
}
```

## TypeScript Support

Full TypeScript support with intelligent autocomplete:

```typescript
import { useAgent, AgentName } from '@clippyjs/react';

// Agent names are typed
const agentName: AgentName = 'Clippy'; // ✅
const invalid: AgentName = 'InvalidAgent'; // ❌ TypeScript error

// Hook returns are fully typed
const { agent, loading, error, speak, play } = useAgent('Clippy');

// Methods have correct signatures
await speak('Hello'); // ✅
await speak(123); // ❌ TypeScript error
```

## Next Steps

### Learn More

- **[API Reference](../api-reference/hooks/useAgent.md)** - Complete API documentation
- **[TypeScript Examples](../examples/typescript/)** - TypeScript usage examples
- **[Advanced Patterns](../advanced/multiple-agents.md)** - Multiple agents, error handling

### Common Patterns

#### Help Button

```typescript
function HelpButton() {
  const { load, speak } = useAgent('Clippy');

  return (
    <button onClick={async () => {
      await load();
      await speak('How can I help you?');
    }}>
      Help
    </button>
  );
}
```

#### Form Validation

```typescript
function ContactForm() {
  const { load, speak } = useAgent('Clippy');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const email = form.email.value;

    if (!email.includes('@')) {
      await load();
      await speak('Please enter a valid email address!');
      return;
    }

    // Submit form...
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### Page Tour

```typescript
function PageTour() {
  const { load, speak, moveTo, gestureAt } = useAgent('Clippy');

  const startTour = async () => {
    await load();

    // Step 1
    await speak('Let me show you around!');

    // Step 2
    const header = document.querySelector('header');
    const rect = header?.getBoundingClientRect();
    if (rect) {
      await moveTo(rect.right, rect.top, 1000);
      await gestureAt(rect.left, rect.top);
      await speak('This is the navigation menu.');
    }

    // Step 3
    await speak('Explore the site!');
  };

  return <button onClick={startTour}>Start Tour</button>;
}
```

#### Celebration

```typescript
function SuccessMessage() {
  const { load, play, speak } = useAgent('Clippy');

  const celebrate = async () => {
    await load();
    await play('Congratulate');
    await speak('Congratulations! Task completed!');
  };

  useEffect(() => {
    celebrate();
  }, []);

  return <div className="success">Success!</div>;
}
```

## Framework-Specific Guides

### Next.js (App Router)

```typescript
// app/layout.tsx
import { ClippyProvider } from '@clippyjs/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClippyProvider>{children}</ClippyProvider>
      </body>
    </html>
  );
}

// app/page.tsx
'use client';

import { useAgent } from '@clippyjs/react';

export default function Home() {
  const { load, speak } = useAgent('Clippy');

  return (
    <button onClick={async () => {
      await load();
      await speak('Hello from Next.js!');
    }}>
      Show Clippy
    </button>
  );
}
```

### Next.js (Pages Router)

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

// pages/index.tsx
import { useAgent } from '@clippyjs/react';

export default function Home() {
  const { load, speak } = useAgent('Clippy');

  return (
    <button onClick={async () => {
      await load();
      await speak('Hello from Next.js!');
    }}>
      Show Clippy
    </button>
  );
}
```

### Vite

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClippyProvider } from '@clippyjs/react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClippyProvider>
      <App />
    </ClippyProvider>
  </React.StrictMode>
);

// src/App.tsx
import { useAgent } from '@clippyjs/react';

function App() {
  const { load, speak } = useAgent('Clippy');

  return (
    <button onClick={async () => {
      await load();
      await speak('Hello from Vite!');
    }}>
      Show Clippy
    </button>
  );
}

export default App;
```

### Create React App

```typescript
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClippyProvider } from '@clippyjs/react';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ClippyProvider>
      <App />
    </ClippyProvider>
  </React.StrictMode>
);

// src/App.tsx
import { useAgent } from '@clippyjs/react';

function App() {
  const { load, speak } = useAgent('Clippy');

  return (
    <div className="App">
      <button onClick={async () => {
        await load();
        await speak('Hello from React!');
      }}>
        Show Clippy
      </button>
    </div>
  );
}

export default App;
```

## Troubleshooting

### Clippy doesn't appear

1. Make sure `ClippyProvider` wraps your component
2. Check that you called `load()` before other methods
3. Verify no console errors
4. Try adding `await show()` after loading

```typescript
await load();
await show(); // Explicitly show
```

### TypeScript errors

Make sure you have the latest version:

```bash
npm install @clippyjs/react@latest
```

### SSR/Hydration errors

Make sure components using Clippy are client-side only:

```typescript
'use client'; // Next.js App Router

import { useAgent } from '@clippyjs/react';
```

### Performance issues

Limit concurrent agents:

```typescript
<ClippyProvider maxAgents={2}>
  {/* Only 2 agents at once */}
</ClippyProvider>
```

## FAQ

**Q: Can I use Clippy with TypeScript?**
A: Yes! Full TypeScript support with complete type definitions.

**Q: Can I have multiple agents at once?**
A: Yes! Use `useAgent` multiple times or configure `maxAgents` on the provider.

**Q: Does it work with SSR?**
A: Yes! Fully compatible with Next.js and other SSR frameworks.

**Q: Can I customize the appearance?**
A: Agent sprites are pre-rendered. You can use CSS to adjust positioning or add effects.

**Q: Are there other agents besides Clippy?**
A: Yes! 10 agents available: Clippy, Bonzi, F1, Genie, Genius, Links, Merlin, Peedy, Rocky, Rover.

**Q: Can I host the assets myself?**
A: Yes! Use the `basePath` prop or `defaultBasePath` on the provider.

**Q: How do I cleanup agents?**
A: Use `autoCleanup: true` (default) or manually call `unload()`.

## Get Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/ericbfriday/clippyjs/issues)
- **API Reference**: [Complete documentation](../api-reference/hooks/useAgent.md)
- **Examples**: [See more examples](../examples/)

## What's Next?

You now know the basics! Explore:

- **[API Reference](../api-reference/hooks/useAgent.md)** - Deep dive into all methods
- **[Multiple Agents](../advanced/multiple-agents.md)** - Coordinate multiple agents
- **[Error Handling](../advanced/error-handling.md)** - Production-ready error handling
- **[Custom Assets](../advanced/custom-assets.md)** - Host your own agent files

Happy coding! 📎
