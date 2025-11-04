# @clippyjs/ai

AI integration core for ClippyJS. Provides plugin architecture, context system, conversation management, and personality profiles for AI-powered Clippy assistants.

## Features

- ✅ **Multi-Provider Support** - Switch between Anthropic, OpenAI, or custom providers
- ✅ **Streaming Responses** - Real-time AI message streaming
- ✅ **Proactive Behavior** - Context-aware suggestions and assistance
- ✅ **Conversation Management** - History persistence and context management
- ✅ **Personality Profiles** - Multiple agent personalities (Clippy, Merlin, Einstein, etc.)
- ✅ **React Integration** - Full React hooks and context provider
- ✅ **TypeScript** - Complete type safety
- ✅ **Pre-built Modes** - Help assistant, code reviewer, shopping assistant, and more

## Installation

```bash
npm install @clippyjs/ai @clippyjs/ai-anthropic
# or with OpenAI
npm install @clippyjs/ai @clippyjs/ai-openai
# or
yarn add @clippyjs/ai @clippyjs/ai-anthropic
```

## Quick Start

### Single Provider Mode

```typescript
import { AIClippyProvider } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

const provider = new AnthropicProvider();
await provider.initialize({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function App() {
  return (
    <AIClippyProvider
      config={{
        provider,
        agentName: 'Clippy',
        personalityMode: 'helpful',
      }}
    >
      <YourApp />
    </AIClippyProvider>
  );
}
```

### Multi-Provider Mode

Enable users to switch between AI providers dynamically:

```typescript
import { AIClippyProvider, type ProviderInfo } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';
import { OpenAIProvider } from '@clippyjs/ai-openai';

// Initialize providers
const anthropicProvider = new AnthropicProvider();
await anthropicProvider.initialize({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openaiProvider = new OpenAIProvider();
await openaiProvider.initialize({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define provider info
const providers: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    supportsVision: true,
    supportsTools: true,
    instance: anthropicProvider,
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    supportsVision: true,
    supportsTools: true,
    instance: openaiProvider,
  },
];

function App() {
  return (
    <AIClippyProvider
      config={{
        providers,
        defaultProvider: 'anthropic',
        agentName: 'Clippy',
        personalityMode: 'helpful',
      }}
    >
      <YourApp />
    </AIClippyProvider>
  );
}
```

## Provider Selection

### ProviderSelector Component

Built-in UI component for provider and model selection:

```typescript
import { useAIClippy, ProviderSelector } from '@clippyjs/ai';

function Settings() {
  const {
    availableProviders,
    currentProvider,
    switchProvider,
    currentModel,
    changeModel,
  } = useAIClippy();

  return (
    <ProviderSelector
      providers={availableProviders!}
      currentProvider={currentProvider!}
      onProviderChange={switchProvider!}
      currentModel={currentModel}
      onModelChange={changeModel}
      showModelSelector={true}
      layout="vertical"
    />
  );
}
```

### Manual Provider Switching

```typescript
import { useAIClippy } from '@clippyjs/ai';

function CustomProviderSwitcher() {
  const { switchProvider, currentProvider } = useAIClippy();

  const handleSwitch = async () => {
    await switchProvider!('openai');
    // Provider switched, conversation history preserved
  };

  return (
    <div>
      <p>Current Provider: {currentProvider?.name}</p>
      <button onClick={handleSwitch}>Switch to OpenAI</button>
    </div>
  );
}
```

### Model Switching

```typescript
function ModelSelector() {
  const { currentProvider, currentModel, changeModel } = useAIClippy();

  return (
    <select
      value={currentModel || currentProvider?.models[0]}
      onChange={(e) => changeModel!(e.target.value)}
    >
      {currentProvider?.models.map((model) => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  );
}
```

## React Hooks

### useAIClippy

Access AI context and provider management:

```typescript
const {
  conversationManager,
  proactiveBehavior,
  agentName,
  personalityMode,
  currentMode,
  isResponding,
  latestSuggestion,
  clearSuggestion,
  updateProactiveConfig,
  recordIgnore,
  recordAccept,
  // Multi-provider mode only:
  availableProviders,
  currentProvider,
  switchProvider,
  currentModel,
  changeModel,
} = useAIClippy();
```

### useAIChat

Simplified chat interface:

```typescript
import { useAIChat } from '@clippyjs/ai';

function ChatComponent() {
  const { messages, sendMessage, isStreaming } = useAIChat();

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      <button
        onClick={() => sendMessage('Hello!')}
        disabled={isStreaming}
      >
        Send
      </button>
    </div>
  );
}
```

## Configuration

### AIClippyConfig

```typescript
interface AIClippyConfig {
  // Single provider mode (backwards compatible)
  provider?: AIProvider;

  // Multi-provider mode
  providers?: ProviderInfo[];
  defaultProvider?: string;

  // Agent configuration
  agentName: AgentName;
  personalityMode: PersonalityMode;
  mode?: Mode | string;

  // Optional features
  contextProviders?: ContextProvider[];
  historyStore?: HistoryStore;
  proactiveConfig?: Partial<ProactiveBehaviorConfig>;
  customPrompt?: string;
}
```

### ProviderInfo

```typescript
interface ProviderInfo {
  id: string;                // Provider identifier (e.g., 'anthropic')
  name: string;              // Display name for UI
  models: string[];          // Available models
  supportsVision: boolean;   // Vision capability
  supportsTools: boolean;    // Tool/function calling capability
  instance: AIProvider;      // Provider instance
}
```

### ProactiveBehaviorConfig

```typescript
interface ProactiveBehaviorConfig {
  enabled: boolean;
  intervalMs: number;              // Trigger check interval
  intrusionLevel: IntrusionLevel;  // 'low' | 'medium' | 'high'
  contextProviders: ContextProvider[];
}
```

## Personality Profiles

Available agent personalities:

- **Clippy** - Classic helpful office assistant
- **Merlin** - Wise wizard mentor
- **Einstein** - Brilliant scientist
- **Sherlock** - Deductive detective
- **Ada** - Mathematical pioneer

```typescript
<AIClippyProvider
  config={{
    provider,
    agentName: 'Merlin',
    personalityMode: 'extended',
  }}
>
  {children}
</AIClippyProvider>
```

## Pre-built Modes

Ready-to-use AI modes for common scenarios:

```typescript
import { helpAssistantMode, codeReviewerMode } from '@clippyjs/ai';

<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'helpful',
    mode: helpAssistantMode,
  }}
>
  {children}
</AIClippyProvider>
```

Available modes:
- `helpAssistantMode` - General help and guidance
- `codeReviewerMode` - Code review and suggestions
- `shoppingAssistantMode` - E-commerce assistance
- `formHelperMode` - Form completion help
- `accessibilityGuideMode` - Accessibility assistance

## History Management

### LocalStorage Persistence

```typescript
import { LocalStorageHistoryStore } from '@clippyjs/ai';

const historyStore = new LocalStorageHistoryStore();

<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'helpful',
    historyStore,
  }}
>
  {children}
</AIClippyProvider>
```

### Custom History Store

```typescript
import { type HistoryStore, type ConversationHistory } from '@clippyjs/ai';

class CustomHistoryStore implements HistoryStore {
  async save(history: ConversationHistory): Promise<void> {
    // Save to your backend
  }

  async load(agentName: string): Promise<ConversationHistory | null> {
    // Load from your backend
  }

  async clear(agentName: string): Promise<void> {
    // Clear from your backend
  }
}
```

## Migration Guide

### From Single Provider to Multi-Provider

**Before:**
```typescript
<AIClippyProvider
  config={{
    provider: anthropicProvider,
    agentName: 'Clippy',
    personalityMode: 'helpful',
  }}
>
  {children}
</AIClippyProvider>
```

**After:**
```typescript
<AIClippyProvider
  config={{
    providers: [
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        models: ['claude-3-5-sonnet-20241022'],
        supportsVision: true,
        supportsTools: true,
        instance: anthropicProvider,
      },
      // Add more providers...
    ],
    defaultProvider: 'anthropic',
    agentName: 'Clippy',
    personalityMode: 'helpful',
  }}
>
  {children}
</AIClippyProvider>
```

**Key Changes:**
- `provider` → `providers` array
- Add `ProviderInfo` metadata for each provider
- Specify `defaultProvider` (optional)
- Access provider controls via `useAIClippy()` hook

**Backwards Compatibility:**
Single provider mode still works - no breaking changes!

## Advanced Features

### Custom Context Providers

```typescript
import { type ContextProvider } from '@clippyjs/ai';

const customContext: ContextProvider = {
  name: 'CustomContext',
  priority: 5,
  canProvide: (trigger) => trigger.type === 'user_action',
  provide: async (trigger) => ({
    type: 'custom',
    data: { /* your context data */ },
    confidence: 0.9,
  }),
};

<AIClippyProvider
  config={{
    provider,
    agentName: 'Clippy',
    personalityMode: 'helpful',
    contextProviders: [customContext],
  }}
>
  {children}
</AIClippyProvider>
```

### Proactive Suggestions

```typescript
function ProactiveSuggestionHandler() {
  const { latestSuggestion, clearSuggestion, recordAccept, recordIgnore } = useAIClippy();

  if (!latestSuggestion) return null;

  return (
    <div className="suggestion">
      <p>{latestSuggestion.message}</p>
      <button onClick={() => {
        recordAccept();
        // Handle acceptance
      }}>
        Accept
      </button>
      <button onClick={() => {
        recordIgnore();
        clearSuggestion();
      }}>
        Dismiss
      </button>
    </div>
  );
}
```

## Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Watch mode
yarn test:watch

# Coverage
yarn test:coverage
```

## Performance

### Configuration Persistence

Provider and model selections are automatically persisted to localStorage:
- `clippy-selected-provider` - Current provider ID
- `clippy-{providerId}-model` - Model per provider

**SSR Compatibility:**
All localStorage operations are wrapped in try-catch blocks and gracefully degrade when localStorage is unavailable.

### Memory Management

- Conversation history is preserved when switching providers
- Managers are lazily initialized to minimize startup time
- Cleanup handlers prevent memory leaks

## API Reference

### Core Exports

```typescript
// React Components
export { AIClippyProvider, ProviderSelector };

// Hooks
export { useAIClippy, useAIChat, useHistoryManager, useStreamController };

// Providers
export { AIProvider };

// Types
export type {
  AIClippyConfig,
  AIClippyContextValue,
  ProviderInfo,
  Message,
  StreamChunk,
  ProactiveBehaviorConfig,
  ProactiveSuggestion,
  ConversationHistory,
  HistoryStore,
  ContextProvider,
  Mode,
};

// Pre-built Modes
export {
  helpAssistantMode,
  codeReviewerMode,
  shoppingAssistantMode,
  formHelperMode,
  accessibilityGuideMode,
};

// History Stores
export {
  LocalStorageHistoryStore,
  SessionStorageHistoryStore,
  IndexedDBHistoryStore,
};
```

## Troubleshooting

### Provider Switching Not Working

1. **Check multi-provider configuration**
   ```typescript
   const { switchProvider, availableProviders } = useAIClippy();
   console.log('Available:', availableProviders);
   ```

2. **Verify provider initialization**
   ```typescript
   await provider.initialize(config);
   // Must complete before passing to AIClippyProvider
   ```

3. **Check localStorage permissions**
   - Some browsers restrict localStorage in private mode
   - Check browser console for localStorage errors

### Conversation History Lost After Switch

Ensure `historyStore` is configured:

```typescript
<AIClippyProvider
  config={{
    providers,
    historyStore: new LocalStorageHistoryStore(),
    // ...
  }}
>
  {children}
</AIClippyProvider>
```

### TypeScript Errors

```bash
# Ensure latest types are installed
yarn add -D @types/react @types/react-dom
```

## Examples

See the Storybook for interactive examples:

```bash
cd packages/storybook
yarn storybook
```

Key stories:
- `ProviderSelector` - Provider selection UI
- `AIChat` - Complete chat interface
- `ProactiveBehavior` - Proactive suggestions

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT

## Related Packages

- [@clippyjs/ai-anthropic](../ai-anthropic) - Anthropic Claude provider
- [@clippyjs/ai-openai](../ai-openai) - OpenAI GPT provider
- [@clippyjs/react](../react) - React UI components

## Further Reading

- [Main Documentation](../../docs/README.md)
- [AI Integration Specification](../../docs/AI_INTEGRATION_SPECIFICATION.md)
- [Implementation Tasks](../../docs/AI_INTEGRATION_ISSUES.md)
- [CHANGELOG](../../CHANGELOG.md)

---

**Last Updated**: 2025-11-04
**Current Version**: 0.4.0 (Phase 6 - Sprint 2 Complete)
**Status**: Active Development
