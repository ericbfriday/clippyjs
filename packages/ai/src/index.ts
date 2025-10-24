/**
 * @clippyjs/ai - AI integration core for ClippyJS
 *
 * Provides plugin architecture, context system, conversation management,
 * and personality profiles for AI-powered Clippy assistants.
 */

// Provider interfaces
export {
  AIProvider,
  type AIProviderConfig,
  type Message,
  type MessageRole,
  type ContentBlock,
  type ContentBlockType,
  type ImageSource,
  type StreamChunk,
  type StreamChunkType,
  type ToolUseBlock,
  type Tool,
  type ToolResult,
  type ChatOptions,
} from './providers/AIProvider';

// Context system
export {
  type ContextProvider,
  type ContextData,
  type ContextTrigger,
} from './context/ContextProvider';

export {
  DOMContextProvider,
  type DOMContextInfo,
} from './context/DOMContext';

export {
  UserActionContextProvider,
  type UserAction,
  type UserActionContextInfo,
} from './context/UserActionContext';

export {
  AppStateContextProvider,
} from './context/AppStateContext';

// Conversation management
export {
  ConversationManager,
} from './conversation/ConversationManager';

export {
  type HistoryStore,
  type ConversationMessage,
  type ConversationHistory,
  LocalStorageHistoryStore,
  SessionStorageHistoryStore,
} from './conversation/HistoryStore';

// Personality system
export {
  type PersonalityMode,
  type PersonalityProfile,
  type AgentName,
  AGENT_PERSONALITIES,
  getPersonalityPrompt,
  getPersonalityProfile,
  getAvailableAgents,
  isValidAgentName,
} from './personality/PersonalityProfiles';

// Proactive behavior
export {
  ProactiveBehaviorEngine,
  DEFAULT_PROACTIVE_CONFIG,
  type IntrusionLevel,
  type ProactiveBehaviorConfig,
  type ProactiveTriggerReason,
  type ProactiveSuggestion,
} from './proactive/ProactiveBehaviorEngine';

// React integration
export {
  AIClippyProvider,
  useAIClippy,
  type AIClippyConfig,
  type AIClippyContextValue,
  type AIClippyProviderProps,
} from './react/AIClippyContext';

export {
  useAIChat,
  type ChatMessage,
  type UseAIChatResult,
} from './react/useAIChat';

// Enhanced content block types
export {
  type TextBlock,
  type ImageBlock,
  type ToolUseContentBlock,
  type ToolResultContentBlock,
} from './providers/AIProvider';
