# @clippyjs/ai-openai

OpenAI provider for ClippyJS AI - GPT-4 and GPT-4o integration.

## Status

🚧 **Under Development** - Sprint 1 in progress

This package is currently being implemented as part of Phase 6 of the ClippyJS project.

## Overview

`@clippyjs/ai-openai` provides integration with OpenAI's GPT models (GPT-4, GPT-4o, GPT-3.5-turbo) as an alternative AI provider for ClippyJS. This allows developers to choose between Anthropic's Claude and OpenAI's GPT models based on their needs.

## Features (Planned)

- 🤖 Support for GPT-4, GPT-4o, and GPT-3.5-turbo
- 🔄 Streaming responses with real-time updates
- 🛠️ Tool/function calling support
- 👁️ Vision capabilities (image analysis)
- ⚡ Provider switching without losing conversation context
- 🔌 Proxy support for API key management
- 🎯 Model selection UI components

## Installation

```bash
# Not yet published - coming soon
npm install @clippyjs/ai-openai
```

## Usage (Planned)

```typescript
import { AIClippyProvider } from '@clippyjs/ai';
import { OpenAIProvider } from '@clippyjs/ai-openai';

const App = () => (
  <AIClippyProvider
    provider="openai"
    providerConfigs={{
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
      },
    }}
  >
    {/* Your app */}
  </AIClippyProvider>
);
```

## Configuration

### OpenAI Provider Config

```typescript
interface OpenAIConfig {
  apiKey: string;
  model?: 'gpt-4' | 'gpt-4o' | 'gpt-3.5-turbo';
  baseURL?: string; // For proxy support
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}
```

## Development

### Setup

```bash
cd packages/ai-openai
yarn install
```

### Build

```bash
yarn build
```

### Test

```bash
yarn test              # Run tests once
yarn test:watch        # Run tests in watch mode
yarn test:coverage     # Run tests with coverage report
```

### Type Checking

```bash
yarn typecheck
```

## Architecture

```
packages/ai-openai/
├── src/
│   ├── index.ts              # Public API exports
│   ├── OpenAIProvider.ts     # Main provider implementation
│   ├── StreamHandler.ts      # Streaming response handler
│   ├── ToolAdapter.ts        # Tool format conversion
│   └── types.ts              # TypeScript type definitions
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
└── package.json
```

## Sprint 1 Tasks (Current)

- [x] Package structure setup
- [ ] OpenAI SDK wrapper implementation
- [ ] Streaming response handler
- [ ] Tool use adaptation
- [ ] Vision support
- [ ] Comprehensive unit tests

See [SPRINT1_OPENAI_TASKS.md](../../docs/SPRINT1_OPENAI_TASKS.md) for detailed task tracking.

## Documentation

Full documentation will be available upon completion of Sprint 1.

## Contributing

This package is part of the ClippyJS monorepo. Please refer to the main project's contribution guidelines.

## License

MIT

## Related Packages

- [@clippyjs/ai](../ai) - Core AI integration package
- [@clippyjs/core](../core) - Core ClippyJS package
- [@clippyjs/react](../react) - React components for ClippyJS

## Support

For issues and questions, please refer to the main [ClippyJS repository](../../README.md).
