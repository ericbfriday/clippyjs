# @clippyjs/ai-openai

OpenAI provider for ClippyJS AI integration. Supports GPT-4, GPT-4o, and GPT-3.5-turbo models with streaming responses.

## Features

- ✅ OpenAI SDK integration (GPT-4, GPT-4o, GPT-3.5-turbo)
- ✅ Streaming response support
- ✅ Tool/function calling support
- ✅ Vision support (GPT-4o)
- ✅ Both client-side and proxy modes
- ✅ TypeScript with full type safety

## Installation

```bash
npm install @clippyjs/ai-openai openai
# or
yarn add @clippyjs/ai-openai openai
```

## Usage

### Basic Setup

```typescript
import { OpenAIProvider } from '@clippyjs/ai-openai';
import { AIClippyProvider } from '@clippyjs/ai';

// Initialize provider
const provider = new OpenAIProvider();
await provider.initialize({
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o', // or 'gpt-4', 'gpt-3.5-turbo'
});

// Use with AIClippy
<AIClippyProvider
  provider={provider}
  options={{
    systemPrompt: 'You are a helpful AI assistant.',
  }}
>
  {/* Your app */}
</AIClippyProvider>
```

### Streaming Responses

```typescript
// The provider automatically handles streaming
for await (const chunk of provider.chat(messages)) {
  if (chunk.type === 'content_block_delta') {
    console.log(chunk.delta.text);
  }
}
```

### Tool/Function Calling

```typescript
const tools = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
      },
      required: ['location'],
    },
  },
];

for await (const chunk of provider.chat(messages, { tools })) {
  if (chunk.type === 'tool_use') {
    // Handle tool use
    const result = await handleToolCall(chunk);
  }
}
```

### Vision Support

```typescript
const messages = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What's in this image?' },
      {
        type: 'image',
        source: {
          type: 'url',
          url: 'https://example.com/image.jpg',
        },
      },
    ],
  },
];

for await (const chunk of provider.chat(messages)) {
  // Process response
}
```

### Proxy Mode

For security, you can use a proxy endpoint instead of exposing API keys:

```typescript
const provider = new OpenAIProvider();
await provider.initialize({
  endpoint: 'https://your-proxy.com/api/openai',
  // No API key needed - handled by proxy
});
```

## Configuration

### Provider Config

```typescript
interface AIProviderConfig {
  apiKey?: string;           // OpenAI API key (client-side mode)
  endpoint?: string;         // Proxy endpoint URL (proxy mode)
  model?: string;            // Model to use (default: 'gpt-4o')
  baseURL?: string;          // Custom OpenAI API base URL
  organization?: string;     // OpenAI organization ID
}
```

### Chat Options

```typescript
interface ChatOptions {
  maxTokens?: number;        // Maximum tokens to generate
  temperature?: number;      // 0-2, controls randomness
  topP?: number;             // Nucleus sampling
  tools?: Tool[];            // Available tools/functions
  stream?: boolean;          // Enable streaming (default: true)
}
```

## Models

Supported OpenAI models:

- `gpt-4o` - Latest multimodal model (recommended)
- `gpt-4` - Advanced reasoning model
- `gpt-4-turbo` - Fast GPT-4 variant
- `gpt-3.5-turbo` - Fast and economical

## Error Handling

```typescript
try {
  for await (const chunk of provider.chat(messages)) {
    // Process chunk
  }
} catch (error) {
  if (error.status === 429) {
    // Rate limit exceeded
  } else if (error.status === 401) {
    // Invalid API key
  } else {
    // Other error
  }
}
```

## Testing

```bash
# Run unit tests
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

## License

MIT
