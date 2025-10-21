# ClippyJS Vite Starter Template

A fully configured Vite + React 19 template with ClippyJS React integration.

## Features

- ✅ Vite 6 with Lightning Fast HMR
- ✅ React 19
- ✅ TypeScript configured
- ✅ ClippyJS React pre-installed
- ✅ ClippyProvider set up in main.tsx
- ✅ Example App with interactive demos
- ✅ Styled with modern CSS
- ✅ ESLint configured

## Getting Started

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

### Project Structure

```
vite-starter/
├── src/
│   ├── main.tsx            # Entry point with ClippyProvider
│   ├── App.tsx             # Main App component with examples
│   └── App.css             # Styles
├── public/                 # Static assets
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## Usage

### Basic Example

The starter includes a working example in `src/App.tsx`:

```tsx
import { useState } from 'react';
import { useAgent, type AgentName } from '@clippyjs/react';

function App() {
  const [selectedAgent, setSelectedAgent] = useState<AgentName>('Clippy');
  const { load, speak } = useAgent(selectedAgent);

  return (
    <button onClick={async () => {
      await load();
      await speak('Hello from Vite!');
    }}>
      Say Hello
    </button>
  );
}
```

### ClippyProvider Setup

The provider is already configured in `src/main.tsx`:

```tsx
import { ClippyProvider } from '@clippyjs/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClippyProvider maxAgents={3}>
      <App />
    </ClippyProvider>
  </StrictMode>,
);
```

### Creating New Components

All components using ClippyJS hooks should be placed in `src/`:

```tsx
// src/MyComponent.tsx
import { useAgent } from '@clippyjs/react';

export function MyComponent() {
  const { load, speak, play } = useAgent('Merlin');

  // Your component logic
}
```

## Available Scripts

- `yarn dev` - Start development server on port 3000
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn lint` - Run ESLint

## Key Concepts

### TypeScript Support

ClippyJS is fully typed. Import types as needed:

```tsx
import { useAgent, type AgentName, type Agent } from '@clippyjs/react';
```

### Hot Module Replacement

Vite provides instant updates during development. Changes to your code will be reflected immediately without full page reloads.

### Multiple Agents

You can use multiple agents in the same component:

```tsx
const clippy = useAgent('Clippy');
const merlin = useAgent('Merlin');
const rover = useAgent('Rover');
```

The `maxAgents` prop on ClippyProvider controls how many agents can be loaded simultaneously.

## Customization

### Styling

Edit `src/App.css` to customize the appearance. The starter includes a modern, responsive design.

### Agent Configuration

Modify the ClippyProvider in `src/main.tsx`:

```tsx
<ClippyProvider
  maxAgents={5}
  defaultBasePath="/custom/path/"
  onError={(error) => console.error(error)}
>
  {children}
</ClippyProvider>
```

### Available Agents

- Clippy - Classic paperclip assistant
- Merlin - Wise wizard
- Rover - Friendly red dog
- Genie - Magical genie
- Bonzi - Purple gorilla
- Peedy - Green parrot
- Links - Helpful cat
- F1 - Racing car
- Rocky - Dog companion
- Genius - Einstein character

## Examples

### Auto-load Agent

```tsx
const { speak } = useAgent('Clippy', {
  autoLoad: true,
  autoShow: true,
  initialMessage: 'Welcome to our site!'
});
```

### Controlled Loading

```tsx
const { load, speak, loading, error } = useAgent('Clippy');

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return <button onClick={() => load()}>Load Agent</button>;
```

### Multiple Actions

```tsx
const { load, speak, play, moveTo, delay } = useAgent('Clippy');

const runSequence = async () => {
  await load();
  await speak('Watch this!');
  await delay(500);
  await play('Wave');
  await moveTo(300, 200, 1000);
  await speak('I can move!');
};
```

## Resources

- [ClippyJS Documentation](https://github.com/ericbfriday/clippyjs/tree/master/docs)
- [API Reference](https://github.com/ericbfriday/clippyjs/tree/master/docs/api-reference)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Storybook Examples](https://github.com/ericbfriday/clippyjs/tree/master/packages/storybook)

## Troubleshooting

### "Cannot read property 'speak' of null"

Make sure the agent is loaded before calling methods:

```tsx
// ❌ Wrong
const { speak } = useAgent('Clippy');
speak('Hello'); // Agent not loaded yet!

// ✅ Correct
const { load, speak } = useAgent('Clippy');
await load();
await speak('Hello');
```

### TypeScript Errors

Make sure you have the latest types:

```bash
yarn add @clippyjs/react@latest
```

### Vite HMR Issues

If hot module replacement stops working:

1. Clear browser cache
2. Delete `node_modules/.vite` directory
3. Restart dev server with `yarn dev`

## License

MIT

## Support

- GitHub Issues: [Report bugs](https://github.com/ericbfriday/clippyjs/issues)
- Documentation: [Full docs](https://github.com/ericbfriday/clippyjs/tree/master/docs)
