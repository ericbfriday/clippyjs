# @clippyjs/ai-opencode

OpenCode runtime provider for ClippyJS. It uses `@opencode-ai/sdk` to connect ClippyJS conversations to an OpenCode server.

## Installation

```bash
yarn add @clippyjs/ai-opencode @opencode-ai/sdk
```

The OpenCode SDK is a peer dependency so applications control the OpenCode version used at runtime.

## How the OpenCode server works

OpenCode uses a client/server architecture. The TUI is itself a client of an HTTP server, and the server exposes a generated OpenAPI 3.1 API. This provider supports both SDK modes:

- Existing server: set `endpoint` after starting `opencode serve`.
- Managed server: omit `endpoint`; the SDK starts a local server and the provider closes it from `destroy()`.

Each call to `chat()` creates an isolated, ephemeral OpenCode session, sends the complete ClippyJS conversation, returns text parts as stream chunks, and then removes the session. This avoids duplicating history because ClippyJS callers already pass the complete conversation.

OpenCode executes its own configured tools and permissions. ClippyJS tool definitions and native image inputs are therefore not advertised by this adapter.

## Connect to an existing server

Start the server:

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

Then initialize the provider:

```ts
import { OpenCodeProvider } from '@clippyjs/ai-opencode';

const provider = new OpenCodeProvider();

await provider.initialize({
  endpoint: 'http://127.0.0.1:4096',
  model: 'anthropic/claude-sonnet-4-20250514',
});

for await (const chunk of provider.chat([
  { role: 'user', content: 'Explain this page.' },
])) {
  if (chunk.type === 'content_delta') {
    console.log(chunk.delta);
  }
}
```

Model identifiers must use OpenCode's `provider/model` format. If `model` is omitted, the server's configured default is used.

## Start a managed server

```ts
const provider = new OpenCodeProvider();

await provider.initialize({
  hostname: '127.0.0.1',
  port: 4096,
  serverStartTimeout: 10_000,
  model: 'anthropic/claude-sonnet-4-20250514',
});

// Later:
provider.destroy();
```

Managed mode is intended for Node.js runtimes and local development. Do not expose an unauthenticated OpenCode server to the public internet. For a separately started server, configure `OPENCODE_SERVER_PASSWORD` and a custom authenticated `fetch` implementation when appropriate. Browser clients also require an explicitly allowed CORS origin.

## Development workflow

From the workspace root:

```bash
yarn nx run @clippyjs/ai-opencode:typecheck
yarn nx run @clippyjs/ai-opencode:test
yarn nx run @clippyjs/ai-opencode:build
```

Unit tests replace the external SDK with a deterministic test double, so they do not start a process or call an AI model. For a manual smoke test:

1. Configure an OpenCode provider and model with the OpenCode CLI.
2. Start `opencode serve --hostname 127.0.0.1 --port 4096`.
3. Initialize `OpenCodeProvider` with that endpoint.
4. Send a short chat and confirm a `content_delta` followed by `complete`.
5. Stop the server when finished.

## License

MIT
