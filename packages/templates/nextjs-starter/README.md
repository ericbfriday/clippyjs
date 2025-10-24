# ClippyJS Next.js Starter Template

A fully configured Next.js 15 App Router template with ClippyJS React integration.

## Features

- ✅ Next.js 15 with App Router
- ✅ React 19
- ✅ TypeScript configured
- ✅ ClippyJS React pre-installed
- ✅ ClippyProvider set up in root layout
- ✅ Example page with interactive demos
- ✅ Styled with modern CSS
- ✅ SSR compatible
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
nextjs-starter/
├── app/
│   ├── layout.tsx          # Root layout with ClippyProvider
│   ├── page.tsx            # Home page with examples
│   └── globals.css         # Global styles
├── public/                 # Static assets
├── next.config.ts          # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## Usage

### Basic Example

The starter includes a working example on the home page (`app/page.tsx`):

```tsx
'use client';

import { useAgent } from '@clippyjs/react';

export default function Page() {
  const { load, speak } = useAgent('Clippy');

  return (
    <button onClick={async () => {
      await load();
      await speak('Hello from Next.js!');
    }}>
      Say Hello
    </button>
  );
}
```

### ClippyProvider Setup

The provider is already configured in `app/layout.tsx`:

```tsx
import { ClippyProvider } from "@clippyjs/react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClippyProvider maxAgents={3}>
          {children}
        </ClippyProvider>
      </body>
    </html>
  );
}
```

### Creating New Pages

All pages using ClippyJS hooks must be client components:

```tsx
// app/my-page/page.tsx
'use client';

import { useAgent } from '@clippyjs/react';

export default function MyPage() {
  const { load, speak, play } = useAgent('Merlin');

  // Your component logic
}
```

## Available Scripts

- `yarn dev` - Start development server on port 3000
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint

## Key Concepts

### Client Components

ClippyJS hooks can only be used in client components. Add `'use client'` at the top of files using hooks:

```tsx
'use client';

import { useAgent } from '@clippyjs/react';
```

### SSR Compatibility

ClippyJS is fully SSR compatible. The hooks automatically detect server-side rendering and defer agent loading until client-side hydration.

### Multiple Agents

You can use multiple agents on the same page:

```tsx
const clippy = useAgent('Clippy');
const merlin = useAgent('Merlin');
const rover = useAgent('Rover');
```

The `maxAgents` prop on ClippyProvider controls how many agents can be loaded simultaneously.

## Customization

### Styling

Edit `app/globals.css` to customize the appearance. The starter includes a modern, responsive design.

### Agent Configuration

Modify the ClippyProvider in `app/layout.tsx`:

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
- [Next.js Documentation](https://nextjs.org/docs)
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

### Hydration Errors

Ensure you're using `'use client'` directive and ClippyProvider is in the root layout.

### TypeScript Errors

Make sure you have the latest types:

```bash
yarn add @clippyjs/react@latest
```

## License

MIT

## Support

- GitHub Issues: [Report bugs](https://github.com/ericbfriday/clippyjs/issues)
- Documentation: [Full docs](https://github.com/ericbfriday/clippyjs/tree/master/docs)
