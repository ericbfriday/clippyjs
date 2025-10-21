# Clippy.js - Modern TypeScript & React Implementation

A complete rewrite of Clippy.js using modern TypeScript and React, with a Promise-based API replacing the old callback pattern.

## ✨ What's New

- **TypeScript** - Full type safety and IntelliSense support
- **React Components** - First-class React integration with hooks
- **Promise-based API** - Clean async/await syntax, no more callback hell
- **Modern Build** - ESM modules, tree-shaking support
- **Zero jQuery** - No dependencies for core functionality
- **Backward Compatible** - Works with existing agent assets

## 📦 Installation

```bash
yarn add clippyjs
```

## 🚀 Quick Start

### Vanilla JavaScript (Promise-based)

```javascript
import clippy from 'clippyjs';

// Load an agent
const agent = await clippy.load('Clippy');

// Show the agent
await agent.show();

// Make them speak
await agent.speak('Hello! I am using Promises now!');

// Play an animation
await agent.play('Searching');

// Chain actions
await agent.speak('Watch this!');
await agent.play('GetAttention');
await agent.speak('Pretty cool, right?');
```

### React

```tsx
import React from 'react';
import { ClippyProvider, Clippy } from 'clippyjs';

function App() {
  return (
    <ClippyProvider>
      <Clippy
        name="Clippy"
        showOnLoad={true}
        speak="Hello from React!"
        onLoad={(agent) => {
          console.log('Clippy loaded!', agent);
        }}
      />
    </ClippyProvider>
  );
}
```

### React with Hooks

```tsx
import { useAgent } from 'clippyjs';

function MyComponent() {
  const { agent, loading, error } = useAgent('Clippy');

  const handleClick = async () => {
    if (agent) {
      await agent.speak('You clicked the button!');
      await agent.play('GetAttention');
    }
  };

  if (loading) return <div>Loading Clippy...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <button onClick={handleClick}>
      Make Clippy Speak
    </button>
  );
}
```

## 📖 API Reference

### Core API

#### `load(name: string, options?: LoadOptions): Promise<Agent>`

Load an agent by name.

```typescript
const agent = await clippy.load('Clippy', {
  basePath: '/assets/agents/' // Optional custom path
});
```

### Agent Methods

All methods now return Promises:

#### `show(fast?: boolean): Promise<void>`
Show the agent with optional animation.

#### `hide(fast?: boolean): Promise<void>`
Hide the agent with optional animation.

#### `speak(text: string, hold?: boolean): Promise<void>`
Display text in a speech balloon.

#### `play(animation: string, timeout?: number): Promise<void>`
Play a specific animation.

#### `animate(): Promise<void>`
Play a random animation.

#### `moveTo(x: number, y: number, duration?: number): Promise<void>`
Move the agent to a position.

#### `gestureAt(x: number, y: number): Promise<void>`
Make the agent gesture towards a point.

#### `stop(): void`
Stop all animations immediately.

#### `getAnimations(): string[]`
Get list of available animations.

### React Components

#### `<ClippyProvider>`

Context provider for managing agents.

```tsx
<ClippyProvider defaultBasePath="/assets/agents/">
  {/* Your app */}
</ClippyProvider>
```

#### `<Clippy>`

Agent component with declarative API.

```tsx
<Clippy
  name="Clippy"           // Agent name
  basePath="/assets/"     // Optional base path
  showOnLoad={true}       // Show immediately
  position={{ x, y }}     // Initial position
  speak="Hello!"          // Initial message
  holdSpeech={false}      // Keep balloon open
  onLoad={agent => {}}    // Load callback
  onError={err => {}}     // Error callback
/>
```

### React Hooks

#### `useClippy()`
Access the Clippy context.

#### `useAgent(name: string)`
Get a specific agent with loading state.

```tsx
const { agent, loading, error, load, unload } = useAgent('Clippy');
```

## 🎭 Available Agents

- Clippy
- Bonzi
- F1
- Genie
- Genius
- Links
- Merlin
- Peedy
- Rocky
- Rover

## 🔄 Migration from Old Version

### Old (Callback-based)
```javascript
clippy.load('Clippy', function(agent) {
  agent.show();
  agent.speak('Hello!', function() {
    agent.play('Hide');
  });
});
```

### New (Promise-based)
```javascript
const agent = await clippy.load('Clippy');
await agent.show();
await agent.speak('Hello!');
await agent.play('Hide');
```

## 📝 TypeScript Support

Full TypeScript definitions are included:

```typescript
import { Agent, AgentData, Animation } from 'clippyjs';

const agent: Agent = await clippy.load('Clippy');
const animations: string[] = agent.getAnimations();
```

## 🏗️ Build Configuration

The package includes multiple build formats:

- **ESM** (`dist/index.esm.js`) - For modern bundlers
- **CommonJS** (`dist/index.js`) - For Node.js
- **UMD** (`dist/clippy.min.js`) - For browsers

## 🧪 Demo

Check out the demo files:

- `demo/demo-promises.html` - Vanilla JavaScript with Promises
- `demo/react.html` - React component demo

## 📄 License

MIT

## 🙏 Credits

Based on the original [Clippy.js](https://www.smore.com/clippy-js) by Smore.