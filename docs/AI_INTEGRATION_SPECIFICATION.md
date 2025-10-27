# AI Integration Specification for ClippyJS

**Version**: 1.0
**Date**: 2025-10-23
**Status**: Requirements Approved - Ready for Implementation

---

## Executive Summary

Transform ClippyJS into an AI-powered interactive assistant by integrating Claude SDK (and future OpenAI support) through a plugin architecture. Clippy becomes the physical embodiment of an AI agent, with proactive behavior, context awareness, and signature personality.

**Key Features:**
- 🎨 Clippy-themed right-click interface with quick actions
- 🤖 Proactive AI assistance every 2 minutes (configurable)
- 🧠 Extensible context awareness (DOM, user actions, app state)
- 🎭 Classic Microsoft persona + modern "Extended" variants
- 🔌 Plugin architecture supporting multiple AI providers
- 💬 Streaming responses with tool use and vision support
- 🎚️ Full user control (disable proactive, intrusion level, history)
- 🔐 Backend proxy or client-side API integration

---

## 1. Architecture Overview

### 1.1 Package Structure

```
@clippyjs/
├── react/                    # Base library (existing)
├── ai/                       # AI core (NEW)
│   ├── providers/
│   │   └── AIProvider.ts    # Abstract provider interface
│   ├── context/
│   │   ├── ContextProvider.ts
│   │   ├── DOMContext.ts
│   │   ├── UserActionContext.ts
│   │   └── AppStateContext.ts
│   ├── behavior/
│   │   ├── ProactiveEngine.ts
│   │   └── TriggerStrategies.ts
│   ├── conversation/
│   │   ├── ConversationManager.ts
│   │   └── HistoryStore.ts
│   ├── personality/
│   │   └── PersonalityProfiles.ts
│   └── components/
│       ├── AIClippyProvider.tsx
│       ├── useAIAgent.ts
│       └── PromptInterface.tsx
│
├── ai-anthropic/            # Claude SDK plugin (NEW)
│   ├── AnthropicProvider.ts
│   ├── StreamHandler.ts
│   └── ToolExecutor.ts
│
└── ai-openai/               # OpenAI plugin (FUTURE)
    └── OpenAIProvider.ts
```

### 1.2 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   React Application                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │            AIClippyProvider                       │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │       Proactive Behavior Engine             │ │  │
│  │  │  - Timer management                         │ │  │
│  │  │  - Ignore detection                         │ │  │
│  │  │  - Trigger selection                        │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │       Context Manager                       │ │  │
│  │  │  - DOMContextProvider                       │ │  │
│  │  │  - UserActionContextProvider                │ │  │
│  │  │  - AppStateContextProvider (custom)         │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │       Conversation Manager                  │ │  │
│  │  │  - Message history                          │ │  │
│  │  │  - Streaming handler                        │ │  │
│  │  │  - Tool execution                           │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │            AIProvider (Plugin)                    │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │    AnthropicProvider (Claude SDK)           │ │  │
│  │  │    OR OpenAIProvider (future)               │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│              Backend Proxy OR Client-Side API           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Components Specification

### 2.1 AIProvider Interface (Plugin System)

```typescript
// packages/ai/src/providers/AIProvider.ts

export interface AIProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any; // Provider-specific config
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: ImageSource;
}

export interface StreamChunk {
  type: 'content_delta' | 'tool_use' | 'complete';
  delta?: string;
  toolUse?: ToolUseBlock;
}

export interface ToolUseBlock {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export abstract class AIProvider {
  abstract initialize(config: AIProviderConfig): Promise<void>;

  abstract chat(
    messages: Message[],
    options?: {
      systemPrompt?: string;
      tools?: Tool[];
      maxTokens?: number;
    }
  ): AsyncIterator<StreamChunk>;

  abstract supportsTools(): boolean;
  abstract supportsVision(): boolean;

  abstract destroy(): void;
}
```

### 2.2 Context System

```typescript
// packages/ai/src/context/ContextProvider.ts

export interface ContextData {
  provider: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface ContextProvider {
  name: string;
  enabled: boolean;

  gather(): Promise<ContextData>;
  shouldInclude?(trigger: 'proactive' | 'user-prompt'): boolean;
}

// Built-in implementations

// packages/ai/src/context/DOMContext.ts
export class DOMContextProvider implements ContextProvider {
  name = 'dom';
  enabled = true;

  async gather(): Promise<ContextData> {
    return {
      provider: 'dom',
      timestamp: new Date(),
      data: {
        url: window.location.href,
        title: document.title,
        headings: this.extractHeadings(),
        forms: this.detectForms(),
        visibleText: this.getVisibleText(),
        meta: this.extractMetaTags(),
      }
    };
  }

  shouldInclude(trigger: 'proactive' | 'user-prompt'): boolean {
    return true; // Always include DOM context
  }

  private extractHeadings(): string[] {
    return Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent?.trim())
      .filter(Boolean) as string[];
  }

  private detectForms(): Array<{ id?: string; fields: string[] }> {
    return Array.from(document.querySelectorAll('form')).map(form => ({
      id: form.id,
      fields: Array.from(form.querySelectorAll('input, select, textarea'))
        .map(field => (field as HTMLInputElement).name || (field as HTMLInputElement).id)
        .filter(Boolean)
    }));
  }

  private getVisibleText(): string {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: string[] = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text) textNodes.push(text);
    }

    return textNodes.join(' ').slice(0, 5000); // Limit to 5k chars
  }

  private extractMetaTags(): Record<string, string> {
    const meta: Record<string, string> = {};
    document.querySelectorAll('meta[name], meta[property]').forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) meta[name] = content;
    });
    return meta;
  }
}

// packages/ai/src/context/UserActionContext.ts
export class UserActionContextProvider implements ContextProvider {
  name = 'user-actions';
  enabled = true;
  private actions: Array<{ type: string; target: string; timestamp: Date }> = [];
  private maxActions = 20;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    document.addEventListener('click', (e) => this.recordAction('click', e));
    document.addEventListener('input', (e) => this.recordAction('input', e));
    document.addEventListener('scroll', () => this.recordAction('scroll', { target: 'window' }));
  }

  private recordAction(type: string, event: any) {
    const target = event.target?.tagName || 'unknown';
    this.actions.push({ type, target, timestamp: new Date() });
    if (this.actions.length > this.maxActions) {
      this.actions.shift(); // Keep only recent actions
    }
  }

  async gather(): Promise<ContextData> {
    return {
      provider: 'user-actions',
      timestamp: new Date(),
      data: {
        recentActions: this.actions.slice(-10), // Last 10 actions
        scrollPosition: window.scrollY,
        focusedElement: document.activeElement?.tagName,
      }
    };
  }

  shouldInclude(trigger: 'proactive' | 'user-prompt'): boolean {
    return trigger === 'proactive'; // Include for proactive, optional for user prompts
  }
}

// packages/ai/src/context/AppStateContext.ts
export class AppStateContextProvider implements ContextProvider {
  name = 'app-state';
  enabled = false; // Disabled by default, developers opt-in

  constructor(private getState: () => Record<string, any>) {}

  async gather(): Promise<ContextData> {
    return {
      provider: 'app-state',
      timestamp: new Date(),
      data: this.getState()
    };
  }

  shouldInclude(trigger: 'proactive' | 'user-prompt'): boolean {
    return true;
  }
}
```

### 2.3 Proactive Behavior Engine

```typescript
// packages/ai/src/behavior/ProactiveEngine.ts

export type TriggerType = 'help-suggestion' | 'user-action-comment' | 'banter';

export interface ProactiveConfig {
  enabled: boolean;
  intervalMs: number; // Default: 120000 (2 minutes)
  ignoreThreshold: number; // Stop after N ignored prompts (default: 2)
  resumeOnInteraction: boolean; // Resume after user interaction
}

export interface TriggerStrategy {
  selectTrigger(context: ContextData[]): Promise<{
    type: TriggerType;
    prompt: string;
  }>;
}

export class ProactiveBehaviorEngine {
  private timer: NodeJS.Timeout | null = null;
  private lastInteraction: Date = new Date();
  private ignoredCount: number = 0;
  private config: ProactiveConfig;
  private strategy: TriggerStrategy;

  constructor(
    config: ProactiveConfig,
    strategy: TriggerStrategy,
    private onTrigger: (type: TriggerType, prompt: string) => Promise<void>
  ) {
    this.config = config;
    this.strategy = strategy;
  }

  start() {
    if (!this.config.enabled) return;
    this.scheduleNext();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  onUserInteraction() {
    this.ignoredCount = 0;
    this.lastInteraction = new Date();

    if (this.config.resumeOnInteraction && !this.timer) {
      this.scheduleNext();
    }
  }

  onProactiveIgnored() {
    this.ignoredCount++;

    if (this.ignoredCount >= this.config.ignoreThreshold) {
      this.stop();
    } else {
      this.scheduleNext();
    }
  }

  private scheduleNext() {
    if (this.ignoredCount >= this.config.ignoreThreshold) return;

    this.timer = setTimeout(async () => {
      await this.executeProactiveTrigger();
    }, this.config.intervalMs);
  }

  private async executeProactiveTrigger() {
    // This will be called by the AI system to gather context
    // and generate a proactive prompt
    const trigger = await this.strategy.selectTrigger([]);
    await this.onTrigger(trigger.type, trigger.prompt);

    // Don't schedule next yet - wait to see if user interacts
    this.timer = null;
  }
}

// packages/ai/src/behavior/TriggerStrategies.ts
export class DefaultTriggerStrategy implements TriggerStrategy {
  private triggerWeights = {
    'help-suggestion': 0.6,
    'user-action-comment': 0.3,
    'banter': 0.1,
  };

  async selectTrigger(context: ContextData[]): Promise<{
    type: TriggerType;
    prompt: string;
  }> {
    const random = Math.random();
    let cumulative = 0;

    for (const [type, weight] of Object.entries(this.triggerWeights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return {
          type: type as TriggerType,
          prompt: this.generatePromptForType(type as TriggerType, context)
        };
      }
    }

    return { type: 'banter', prompt: 'Say something charming to the user' };
  }

  private generatePromptForType(type: TriggerType, context: ContextData[]): string {
    switch (type) {
      case 'help-suggestion':
        return 'Based on the current page, suggest something helpful to the user. Be specific and actionable.';
      case 'user-action-comment':
        return 'Comment on what the user seems to be doing. Be observant and friendly.';
      case 'banter':
        return 'Engage in light banter with the user. Be charming and stay in character.';
    }
  }
}
```

### 2.4 Personality System

```typescript
// packages/ai/src/personality/PersonalityProfiles.ts

export type PersonalityMode = 'classic' | 'extended';

export interface PersonalityProfile {
  systemPrompt: string;
  traits: string[];
  quirks?: string[];
}

export const AGENT_PERSONALITIES: Record<string, Record<PersonalityMode, PersonalityProfile>> = {
  Clippy: {
    classic: {
      systemPrompt: `You are Clippy, the classic Microsoft Office Assistant from the 1990s. You're enthusiastic about helping but sometimes overeager.

Key behaviors:
- Start suggestions with "It looks like you're..." when appropriate
- Use simple, friendly language
- Be genuinely helpful but occasionally literal or miss subtle context
- Show excitement with exclamation points!
- Reference classic Office tasks (writing letters, making spreadsheets)
- Be cheerful and optimistic

Remember: You're a helpful assistant who means well, even if you're not always perfectly in tune with what users need.`,
      traits: ['eager', 'helpful', 'literal', 'cheerful', 'optimistic'],
      quirks: [
        'Overuses "It looks like..."',
        'Suggests help for things already done',
        'Enthusiastic about mundane tasks'
      ]
    },
    extended: {
      systemPrompt: `You are Clippy, the legendary Microsoft Office Assistant, reimagined with modern AI capabilities while keeping your nostalgic charm.

Key behaviors:
- Deeply understand context and provide genuinely useful assistance
- Reference your classic origins with self-aware humor ("Back in my Office days...")
- Balance being helpful with maintaining your iconic personality
- Use your signature phrases sparingly but meaningfully
- Be intelligent and contextual, but never lose the charm
- Show growth while honoring your roots

Remember: You're Clippy with 25 years of experience and modern AI capabilities, but you haven't forgotten where you came from.`,
      traits: ['intelligent', 'self-aware', 'charming', 'contextual', 'nostalgic'],
      quirks: [
        'Self-deprecating humor about Office 97',
        'References to "the old days"',
        'Occasionally uses "It looks like..." ironically'
      ]
    }
  },

  Merlin: {
    classic: {
      systemPrompt: `You are Merlin, the wise wizard assistant from Microsoft Office. You speak with mystical wisdom and use magical metaphors.

Key behaviors:
- Use wizard/magic-themed language ("By my staff!", "Let me conjure...")
- Speak with formal, slightly archaic grammar
- Be wise and patient, like a mentor
- Reference spells, potions, and magical concepts
- Be mysterious but ultimately helpful

Remember: You're a wizard who treats computer tasks as magical endeavors.`,
      traits: ['wise', 'mystical', 'patient', 'formal', 'magical']
    },
    extended: {
      systemPrompt: `You are Merlin, the wizard assistant, with centuries of wisdom and modern technological understanding.

Key behaviors:
- Bridge ancient wisdom with modern tech insights
- Use magical metaphors to explain complex concepts
- Be deeply knowledgeable but accessible
- Maintain mystical persona while being practical
- Reference both ancient texts and modern documentation

Remember: You're a wizard who has studied both grimoires and GitHub repos.`,
      traits: ['wise', 'mystical', 'knowledgeable', 'modern', 'accessible']
    }
  },

  // Add similar profiles for: Bonzi, F1, Genie, Genius, Links, Peedy, Rocky, Rover
};

export function getPersonalityPrompt(
  agentName: string,
  mode: PersonalityMode,
  customPrompt?: string
): string {
  const profile = AGENT_PERSONALITIES[agentName]?.[mode];
  if (!profile) {
    throw new Error(`No personality profile found for ${agentName} in ${mode} mode`);
  }

  if (customPrompt) {
    return `${profile.systemPrompt}\n\nAdditional instructions:\n${customPrompt}`;
  }

  return profile.systemPrompt;
}
```

### 2.5 Conversation Manager

```typescript
// packages/ai/src/conversation/ConversationManager.ts

export interface ConversationMessage extends Message {
  id: string;
  timestamp: Date;
  context?: ContextData[];
}

export interface ConversationHistory {
  messages: ConversationMessage[];
  agentName: string;
  startedAt: Date;
  lastInteraction: Date;
}

export class ConversationManager {
  private history: ConversationMessage[] = [];
  private maxHistoryLength = 50;

  constructor(
    private provider: AIProvider,
    private historyStore?: HistoryStore
  ) {}

  async sendMessage(
    userMessage: string,
    context: ContextData[],
    systemPrompt: string
  ): AsyncIterator<StreamChunk> {
    // Add user message to history
    const userMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: this.buildMessageContent(userMessage, context),
      timestamp: new Date()
    };

    this.history.push(userMsg);

    // Build messages array with system prompt
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...this.history.map(m => ({ role: m.role, content: m.content }))
    ];

    // Stream response
    const stream = this.provider.chat(messages);

    // Collect assistant response
    let assistantContent = '';
    const assistantMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    // Create async generator that both yields and collects
    const self = this;
    return (async function*() {
      for await (const chunk of stream) {
        if (chunk.type === 'content_delta' && chunk.delta) {
          assistantContent += chunk.delta;
          assistantMsg.content = assistantContent;
        }
        yield chunk;
      }

      // Add to history after complete
      self.history.push(assistantMsg);
      self.trimHistory();

      // Persist if store available
      if (self.historyStore) {
        await self.historyStore.save(self.getHistory());
      }
    })();
  }

  private buildMessageContent(userMessage: string, context: ContextData[]): string {
    if (context.length === 0) return userMessage;

    const contextStr = context
      .map(c => `[${c.provider} context: ${JSON.stringify(c.data)}]`)
      .join('\n');

    return `${userMessage}\n\nContext:\n${contextStr}`;
  }

  private trimHistory() {
    if (this.history.length > this.maxHistoryLength) {
      // Keep system message and trim oldest
      this.history = this.history.slice(-this.maxHistoryLength);
    }
  }

  getHistory(): ConversationHistory {
    return {
      messages: this.history,
      agentName: 'unknown', // Set by manager
      startedAt: this.history[0]?.timestamp || new Date(),
      lastInteraction: this.history[this.history.length - 1]?.timestamp || new Date()
    };
  }

  clearHistory() {
    this.history = [];
  }

  async loadHistory(history: ConversationHistory) {
    this.history = history.messages;
  }
}

// packages/ai/src/conversation/HistoryStore.ts
export interface HistoryStore {
  save(history: ConversationHistory): Promise<void>;
  load(agentName: string): Promise<ConversationHistory | null>;
  clear(agentName: string): Promise<void>;
}

export class LocalStorageHistoryStore implements HistoryStore {
  private prefix = 'clippy-ai-history';

  async save(history: ConversationHistory): Promise<void> {
    const key = `${this.prefix}:${history.agentName}`;
    localStorage.setItem(key, JSON.stringify(history));
  }

  async load(agentName: string): Promise<ConversationHistory | null> {
    const key = `${this.prefix}:${agentName}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async clear(agentName: string): Promise<void> {
    const key = `${this.prefix}:${agentName}`;
    localStorage.removeItem(key);
  }
}
```

---

## 3. React Integration

### 3.1 AIClippyProvider Component

```typescript
// packages/ai/src/components/AIClippyProvider.tsx

export interface AIClippyProviderProps {
  children: React.ReactNode;

  // AI Provider
  provider: AIProvider;

  // Personality
  agentName?: AgentName;
  personalityMode?: PersonalityMode;

  // Pre-built modes
  mode?: 'help-assistant' | 'code-reviewer' | 'shopping-assistant' | 'custom';
  systemPromptOverride?: string | ((basePrompt: string) => string);

  // Context
  contextProviders?: ContextProvider[];
  enableDOMContext?: boolean;
  enableUserActionContext?: boolean;
  appStateProvider?: () => Record<string, any>;

  // Proactive behavior
  proactiveConfig?: Partial<ProactiveConfig>;

  // History
  enableHistory?: boolean;
  historyStore?: HistoryStore;

  // Integration
  integrationMode?: 'proxy' | 'client';
  endpoint?: string;
  fallbackToClient?: boolean;
  onApiKeyRequired?: (setKey: (key: string) => void) => void;

  // Callbacks
  onError?: (error: Error) => void;
}

interface AIClippyContextValue {
  // State
  agent: Agent | null;
  loading: boolean;
  error: Error | null;

  // Conversation
  sendMessage: (message: string) => Promise<void>;
  streamingResponse: string;
  isStreaming: boolean;

  // History
  conversationHistory: ConversationHistory | null;
  clearHistory: () => Promise<void>;

  // Proactive
  proactiveEnabled: boolean;
  setProactiveEnabled: (enabled: boolean) => void;
  intrusionLevel: number; // 0-100
  setIntrusionLevel: (level: number) => void;

  // Context
  gatherContext: () => Promise<ContextData[]>;
}

const AIClippyContext = createContext<AIClippyContextValue | null>(null);

export const AIClippyProvider: React.FC<AIClippyProviderProps> = ({
  children,
  provider,
  agentName = 'Clippy',
  personalityMode = 'extended',
  mode = 'help-assistant',
  systemPromptOverride,
  contextProviders = [],
  enableDOMContext = true,
  enableUserActionContext = true,
  appStateProvider,
  proactiveConfig,
  enableHistory = true,
  historyStore,
  integrationMode = 'proxy',
  endpoint,
  fallbackToClient = false,
  onApiKeyRequired,
  onError,
}) => {
  // Get base agent
  const { agent, loading: agentLoading } = useAgent(agentName);

  // State
  const [error, setError] = useState<Error | null>(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory | null>(null);
  const [proactiveEnabled, setProactiveEnabled] = useState(proactiveConfig?.enabled ?? true);
  const [intrusionLevel, setIntrusionLevel] = useState(50);

  // Refs
  const conversationManagerRef = useRef<ConversationManager | null>(null);
  const proactiveEngineRef = useRef<ProactiveBehaviorEngine | null>(null);
  const contextProvidersRef = useRef<ContextProvider[]>([]);

  // Initialize context providers
  useEffect(() => {
    const providers: ContextProvider[] = [...contextProviders];

    if (enableDOMContext) {
      providers.push(new DOMContextProvider());
    }

    if (enableUserActionContext) {
      providers.push(new UserActionContextProvider());
    }

    if (appStateProvider) {
      providers.push(new AppStateContextProvider(appStateProvider));
    }

    contextProvidersRef.current = providers;
  }, [contextProviders, enableDOMContext, enableUserActionContext, appStateProvider]);

  // Initialize conversation manager
  useEffect(() => {
    const histStore = enableHistory ? (historyStore || new LocalStorageHistoryStore()) : undefined;
    conversationManagerRef.current = new ConversationManager(provider, histStore);

    // Load history if available
    if (histStore) {
      histStore.load(agentName).then(history => {
        if (history) {
          conversationManagerRef.current?.loadHistory(history);
          setConversationHistory(history);
        }
      });
    }
  }, [provider, enableHistory, historyStore, agentName]);

  // Initialize proactive engine
  useEffect(() => {
    if (!agent || !proactiveEnabled) return;

    const config: ProactiveConfig = {
      enabled: true,
      intervalMs: 120000, // 2 minutes
      ignoreThreshold: 2,
      resumeOnInteraction: true,
      ...proactiveConfig,
    };

    const strategy = new DefaultTriggerStrategy();

    const engine = new ProactiveBehaviorEngine(
      config,
      strategy,
      async (type, prompt) => {
        await handleProactiveTrigger(type, prompt);
      }
    );

    proactiveEngineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, [agent, proactiveEnabled, proactiveConfig]);

  // Gather context
  const gatherContext = useCallback(async (): Promise<ContextData[]> => {
    const contextData: ContextData[] = [];

    for (const provider of contextProvidersRef.current) {
      if (provider.enabled) {
        try {
          const data = await provider.gather();
          contextData.push(data);
        } catch (err) {
          console.error(`Failed to gather context from ${provider.name}:`, err);
        }
      }
    }

    return contextData;
  }, []);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!agent || !conversationManagerRef.current) return;

    try {
      setIsStreaming(true);
      setStreamingResponse('');

      // Gather context
      const context = await gatherContext();

      // Get system prompt
      const basePrompt = getPersonalityPrompt(agentName, personalityMode);
      const systemPrompt = typeof systemPromptOverride === 'function'
        ? systemPromptOverride(basePrompt)
        : systemPromptOverride || basePrompt;

      // Stream response
      const stream = await conversationManagerRef.current.sendMessage(
        message,
        context,
        systemPrompt
      );

      let fullResponse = '';
      for await (const chunk of stream) {
        if (chunk.type === 'content_delta' && chunk.delta) {
          fullResponse += chunk.delta;
          setStreamingResponse(fullResponse);

          // Show in speech bubble with typing effect
          await agent.speak(fullResponse, true);
        }
      }

      setIsStreaming(false);

      // Notify proactive engine of interaction
      proactiveEngineRef.current?.onUserInteraction();

    } catch (err) {
      setError(err as Error);
      setIsStreaming(false);
      onError?.(err as Error);
    }
  }, [agent, agentName, personalityMode, systemPromptOverride, gatherContext, onError]);

  // Handle proactive triggers
  const handleProactiveTrigger = useCallback(async (type: TriggerType, prompt: string) => {
    if (!agent) return;

    // Show agent with attention animation
    await agent.show();
    await agent.play('Wave');

    // Send the proactive prompt
    await sendMessage(prompt);
  }, [agent, sendMessage]);

  // Clear history
  const clearHistory = useCallback(async () => {
    conversationManagerRef.current?.clearHistory();
    setConversationHistory(null);

    if (enableHistory && historyStore) {
      await historyStore.clear(agentName);
    }
  }, [enableHistory, historyStore, agentName]);

  const value: AIClippyContextValue = {
    agent,
    loading: agentLoading,
    error,
    sendMessage,
    streamingResponse,
    isStreaming,
    conversationHistory,
    clearHistory,
    proactiveEnabled,
    setProactiveEnabled,
    intrusionLevel,
    setIntrusionLevel,
    gatherContext,
  };

  return (
    <AIClippyContext.Provider value={value}>
      {children}
    </AIClippyContext.Provider>
  );
};

export const useAIClippy = () => {
  const context = useContext(AIClippyContext);
  if (!context) {
    throw new Error('useAIClippy must be used within AIClippyProvider');
  }
  return context;
};
```

### 3.2 Right-Click Prompt Interface

```typescript
// packages/ai/src/components/PromptInterface.tsx

export interface QuickAction {
  label: string;
  icon?: string;
  prompt: string;
}

export interface PromptInterfaceProps {
  agent: Agent;
  onSend: (message: string) => void;
  quickActions?: QuickAction[];
  position?: { x: number; y: number };
  onClose: () => void;
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Help with this page',
    icon: '❓',
    prompt: 'Can you help me understand this page and what I can do here?'
  },
  {
    label: 'Explain something',
    icon: '📖',
    prompt: 'I need help understanding something on this page.'
  },
  {
    label: 'Find information',
    icon: '🔍',
    prompt: 'Help me find specific information on this page.'
  },
  {
    label: 'Just chat',
    icon: '💬',
    prompt: '' // Free-form chat
  }
];

export const PromptInterface: React.FC<PromptInterfaceProps> = ({
  agent,
  onSend,
  quickActions = DEFAULT_QUICK_ACTIONS,
  position,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
    onClose();
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.prompt) {
      onSend(action.prompt);
      onClose();
    } else {
      // Just chat - show input
      setShowQuickActions(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="clippy-prompt-interface"
      style={{
        position: 'fixed',
        left: position?.x || 100,
        top: position?.y || 100,
        background: 'white',
        border: '2px solid #0078d4',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: '300px',
        maxWidth: '400px',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#0078d4' }}>
          💬 Chat with {agent ? 'Clippy' : 'Assistant'}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Quick actions:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                style={{
                  background: '#f3f3f3',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e3e3e3'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f3f3f3'}
              >
                {action.icon && <span style={{ marginRight: '8px' }}>{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowQuickActions(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0078d4',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '8px',
              padding: 0,
            }}
          >
            Or type your own message...
          </button>
        </div>
      )}

      {/* Text Input */}
      {!showQuickActions && (
        <>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setShowQuickActions(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0078d4',
                cursor: 'pointer',
                fontSize: '12px',
                padding: 0,
              }}
            >
              ← Back to quick actions
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                background: '#0078d4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                opacity: input.trim() ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Hook to handle right-click behavior
export const useRightClickPrompt = () => {
  const { agent } = useAIClippy();
  const [showPrompt, setShowPrompt] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Only show if clicking on agent element
      const target = e.target as HTMLElement;
      if (target.closest('.clippy-agent')) {
        e.preventDefault();
        setPosition({ x: e.clientX, y: e.clientY });
        setShowPrompt(true);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  return {
    showPrompt,
    position,
    closePrompt: () => setShowPrompt(false),
  };
};
```

---

## 4. Anthropic Provider Implementation

```typescript
// packages/ai-anthropic/src/AnthropicProvider.ts

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIProviderConfig, Message, StreamChunk } from '@clippyjs/ai';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic | null = null;
  private config: AIProviderConfig | null = null;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;

    // Support both client-side and proxy mode
    if (config.endpoint) {
      // Proxy mode - no SDK needed
    } else if (config.apiKey) {
      // Client-side mode
      this.client = new Anthropic({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true, // Required for browser usage
      });
    } else {
      throw new Error('Either endpoint or apiKey must be provided');
    }
  }

  async *chat(
    messages: Message[],
    options?: {
      systemPrompt?: string;
      tools?: Tool[];
      maxTokens?: number;
    }
  ): AsyncIterator<StreamChunk> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    if (this.config.endpoint) {
      // Proxy mode - call backend endpoint
      yield* this.streamViaProxy(messages, options);
    } else if (this.client) {
      // Client-side mode - use SDK directly
      yield* this.streamViaSdk(messages, options);
    } else {
      throw new Error('No valid configuration');
    }
  }

  private async *streamViaSdk(
    messages: Message[],
    options?: {
      systemPrompt?: string;
      tools?: Tool[];
      maxTokens?: number;
    }
  ): AsyncIterator<StreamChunk> {
    if (!this.client) throw new Error('Client not initialized');

    const stream = await this.client.messages.create({
      model: this.config?.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options?.maxTokens || 1024,
      system: options?.systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          type: 'content_delta',
          delta: event.delta.text,
        };
      } else if (event.type === 'message_stop') {
        yield { type: 'complete' };
      }
    }
  }

  private async *streamViaProxy(
    messages: Message[],
    options?: {
      systemPrompt?: string;
      tools?: Tool[];
      maxTokens?: number;
    }
  ): AsyncIterator<StreamChunk> {
    const response = await fetch(this.config!.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        systemPrompt: options?.systemPrompt,
        maxTokens: options?.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data as StreamChunk;
        }
      }
    }
  }

  supportsTools(): boolean {
    return true;
  }

  supportsVision(): boolean {
    return true;
  }

  destroy(): void {
    this.client = null;
    this.config = null;
  }
}
```

---

## 5. Pre-built Modes

```typescript
// packages/ai/src/modes/PrebuiltModes.ts

export interface Mode {
  name: string;
  description: string;
  systemPromptExtension: string;
  contextProviders: ContextProvider[];
  quickActions: QuickAction[];
  proactiveStrategy: TriggerStrategy;
}

export const PREBUILT_MODES: Record<string, Mode> = {
  'help-assistant': {
    name: 'Help Assistant',
    description: 'General website help and guidance',
    systemPromptExtension: `
You are helping users navigate and understand the current website.
Focus on:
- Explaining what's available on the page
- Guiding users to complete tasks
- Answering questions about the site's features
- Being patient and supportive
`,
    contextProviders: [new DOMContextProvider()],
    quickActions: [
      { label: 'What can I do here?', icon: '❓', prompt: 'What can I do on this page?' },
      { label: 'How do I...', icon: '🎯', prompt: 'How do I use this feature?' },
      { label: 'Explain this', icon: '📖', prompt: 'Can you explain what this means?' },
    ],
    proactiveStrategy: new DefaultTriggerStrategy(),
  },

  'code-reviewer': {
    name: 'Code Reviewer',
    description: 'Technical code analysis and suggestions',
    systemPromptExtension: `
You are a code review assistant helping developers.
Focus on:
- Identifying code issues and improvements
- Explaining technical concepts
- Suggesting best practices
- Being constructive and educational
`,
    contextProviders: [
      new DOMContextProvider(),
      new UserActionContextProvider(),
    ],
    quickActions: [
      { label: 'Review this code', icon: '🔍', prompt: 'Can you review the code on this page?' },
      { label: 'Explain this function', icon: '📝', prompt: 'Explain what this function does.' },
      { label: 'Best practices', icon: '✨', prompt: 'What are best practices for this code?' },
    ],
    proactiveStrategy: new CodeReviewTriggerStrategy(),
  },

  'shopping-assistant': {
    name: 'Shopping Assistant',
    description: 'E-commerce help and product guidance',
    systemPromptExtension: `
You are a shopping assistant helping users make purchase decisions.
Focus on:
- Understanding product needs
- Comparing options
- Explaining features and benefits
- Helping with checkout process
`,
    contextProviders: [
      new DOMContextProvider(),
      new UserActionContextProvider(),
    ],
    quickActions: [
      { label: 'Help me choose', icon: '🛍️', prompt: 'Help me choose between these products.' },
      { label: 'Compare products', icon: '⚖️', prompt: 'Can you compare these products?' },
      { label: 'Explain features', icon: '📋', prompt: 'What are the key features?' },
    ],
    proactiveStrategy: new ShoppingTriggerStrategy(),
  },
};
```

---

## 6. Usage Examples

### 6.1 Basic Setup with Proxy Mode

```typescript
import { ClippyProvider } from '@clippyjs/react';
import { AIClippyProvider } from '@clippyjs/ai';
import { AnthropicProvider } from '@clippyjs/ai-anthropic';

function App() {
  const anthropicProvider = new AnthropicProvider();

  return (
    <ClippyProvider>
      <AIClippyProvider
        provider={anthropicProvider}
        integrationMode="proxy"
        endpoint="/api/ai/chat"
        agentName="Clippy"
        personalityMode="extended"
        mode="help-assistant"
        proactiveConfig={{
          enabled: true,
          intervalMs: 120000, // 2 minutes
          ignoreThreshold: 2,
        }}
      >
        <MyApp />
      </AIClippyProvider>
    </ClippyProvider>
  );
}

function MyApp() {
  const { sendMessage, showPrompt, position, closePrompt } = useRightClickPrompt();
  const { agent } = useAIClippy();

  return (
    <div>
      <h1>My App</h1>

      {showPrompt && agent && (
        <PromptInterface
          agent={agent}
          onSend={sendMessage}
          position={position}
          onClose={closePrompt}
        />
      )}
    </div>
  );
}
```

### 6.2 Client-Side Mode with Custom Prompts

```typescript
function App() {
  const [apiKey, setApiKey] = useState('');
  const anthropicProvider = new AnthropicProvider();

  return (
    <ClippyProvider>
      <AIClippyProvider
        provider={anthropicProvider}
        integrationMode="client"
        fallbackToClient={true}
        onApiKeyRequired={(setKey) => {
          // Show modal to collect API key
          const key = prompt('Enter your Anthropic API key:');
          if (key) {
            setKey(key);
            setApiKey(key);
          }
        }}
        agentName="Merlin"
        personalityMode="extended"
        systemPromptOverride={(basePrompt) =>
          `${basePrompt}\n\nAdditional: You're helping with a React application.`
        }
        enableDOMContext={true}
        enableUserActionContext={true}
      >
        <MyApp />
      </AIClippyProvider>
    </ClippyProvider>
  );
}
```

### 6.3 Custom Context Provider

```typescript
// Custom context for a React app
class ReactAppContextProvider implements ContextProvider {
  name = 'react-app';
  enabled = true;

  constructor(private appState: any) {}

  async gather(): Promise<ContextData> {
    return {
      provider: 'react-app',
      timestamp: new Date(),
      data: {
        currentRoute: window.location.pathname,
        userAuthenticated: this.appState.isAuthenticated,
        userRole: this.appState.user?.role,
        activeFeatures: this.appState.features,
      }
    };
  }
}

function App() {
  const appState = useAppState();
  const customProvider = new ReactAppContextProvider(appState);

  return (
    <AIClippyProvider
      contextProviders={[customProvider]}
      // ... other props
    >
      <MyApp />
    </AIClippyProvider>
  );
}
```

---

## 7. Backend Proxy Implementation Example

```typescript
// Example Next.js API route: /app/api/ai/chat/route.ts

import { Anthropic } from '@anthropic-ai/sdk';
import { StreamingTextResponse } from 'ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  const { messages, systemPrompt, maxTokens } = await req.json();

  const stream = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: maxTokens || 1024,
    system: systemPrompt,
    messages,
    stream: true,
  });

  // Convert to SSE format
  const encoder = new TextEncoder();
  const customStream = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = {
            type: 'content_delta',
            delta: event.delta.text,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        } else if (event.type === 'message_stop') {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
          );
          controller.close();
        }
      }
    },
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- ✅ Package structure setup (@clippyjs/ai, @clippyjs/ai-anthropic)
- ✅ AIProvider interface and plugin architecture
- ✅ Context system (DOM, user actions)
- ✅ Basic conversation manager
- ✅ Personality profiles for all agents

### Phase 2: Core Features (Weeks 3-4)
- ✅ AIClippyProvider component
- ✅ Right-click prompt interface
- ✅ Streaming response integration
- ✅ Anthropic provider implementation
- ✅ Backend proxy pattern
- ✅ Client-side fallback

### Phase 3: Proactive Behavior (Weeks 5-6)
- ✅ Proactive engine with timer
- ✅ Ignore detection and resume logic
- ✅ Trigger strategies (help, comment, banter)
- ✅ User control (enable/disable, intrusion level)

### Phase 4: Advanced Features (Weeks 7-8)
- ✅ Conversation history persistence
- ✅ Pre-built modes (help, code-review, shopping)
- ✅ Custom context providers
- ✅ Tool use support (future)
- ✅ Vision support (future)

### Phase 5: Polish & Documentation (Weeks 9-10)
- ✅ Comprehensive testing
- ✅ Storybook stories
- ✅ API documentation
- ✅ Usage examples
- ✅ Starter templates

---

## 9. Security Considerations

### API Key Management
- **Recommended**: Backend proxy to keep keys server-side
- **Fallback**: Client-side with clear warnings
- **Storage**: Never commit API keys, use environment variables
- **User Keys**: If storing user-provided keys, use sessionStorage (not localStorage)

### Context Gathering
- **User Consent**: Request permission before gathering context
- **Data Minimization**: Only collect necessary context
- **Sensitive Data**: Exclude passwords, credit cards, PII
- **User Control**: Allow users to disable context providers

### Rate Limiting
- **Backend**: Implement rate limiting on proxy endpoints
- **Client**: Throttle requests to prevent abuse
- **Proactive**: Limit frequency and total proactive prompts

---

## 10. Testing Strategy

### Unit Tests
- Context providers
- Conversation manager
- Proactive engine
- Personality system

### Integration Tests
- Full AI conversation flow
- Streaming responses
- Proactive triggers
- History persistence

### E2E Tests (Playwright)
- Right-click interface
- Quick actions
- User interaction tracking
- Visual testing

---

## 11. Future Enhancements

### Phase 6+
- **OpenAI Provider**: Add GPT-4 support
- **Tool Use**: Allow Clippy to interact with page (click, fill forms)
- **Voice Input**: Speech-to-text for prompts
- **Multi-Agent**: Multiple assistants working together
- **Analytics**: Track usage patterns and satisfaction
- **Fine-tuning**: Custom agent personalities via fine-tuned models

---

## 12. Success Metrics

### Developer Experience
- Time to first AI-powered Clippy: < 10 minutes
- Documentation clarity score: > 90%
- GitHub stars growth: +500 in first quarter

### User Experience
- User satisfaction: > 85%
- Proactive acceptance rate: > 40%
- Average conversation length: 3-5 messages

### Technical
- Response latency: < 2s for first token
- Streaming performance: < 100ms between chunks
- Context gathering: < 200ms
- Zero memory leaks
- Bundle size: < 100KB (excluding AI provider SDK)

---

## Conclusion

This specification provides a complete blueprint for adding AI integration to ClippyJS. The plugin architecture ensures extensibility, the context system provides intelligent awareness, and the personality system maintains the nostalgic charm while leveraging modern AI capabilities.

The phased implementation approach allows for incremental delivery of value while maintaining code quality and comprehensive testing throughout the development process.
