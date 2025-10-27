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
  IndexedDBHistoryStore,
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

// Pre-built modes
export {
  type Mode,
  type QuickAction,
  type TriggerStrategy,
  defaultTriggerStrategy,
  helpAssistantMode,
  codeReviewerMode,
  shoppingAssistantMode,
  formHelperMode,
  accessibilityGuideMode,
  PREBUILT_MODES,
  getMode,
  getAllModes,
  hasMode,
} from './modes/PrebuiltModes';

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

export {
  useHistoryManager,
  type UseHistoryManagerResult,
} from './react/useHistoryManager';

export {
  HistoryManager,
  type HistoryManagerProps,
} from './react/HistoryManager';

// Streaming control
export {
  StreamController,
  type StreamProgress,
  type StreamState,
  type StreamControllerConfig,
} from './streaming/StreamController';

export {
  StreamMonitor,
  type StreamMetrics,
  type StreamMonitorConfig,
} from './streaming/StreamMonitor';

export {
  useStreamController,
  type UseStreamControllerResult,
} from './react/useStreamController';

// Enhanced content block types
export {
  type TextBlock,
  type ImageBlock,
  type ToolUseContentBlock,
  type ToolResultContentBlock,
} from './providers/AIProvider';

// Error handling & recovery
export {
  ErrorClassifier,
  type ErrorType,
  type ErrorInfo,
  type ErrorClassifierConfig,
} from './errors/ErrorClassifier';

export {
  RetryPolicy,
  retry,
  type BackoffStrategy,
  type RetryPolicyConfig,
  type RetryAttempt,
  DEFAULT_RETRY_CONFIG,
} from './errors/RetryPolicy';

export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  type CircuitState,
  type CircuitBreakerConfig,
  DEFAULT_CIRCUIT_CONFIG,
} from './errors/CircuitBreaker';

export {
  RecoveryStrategy,
  RecoveryStrategies,
  type RecoveryStrategyType,
  type RecoveryAction,
  type RecoveryStrategyConfig,
} from './errors/RecoveryStrategies';

export {
  Telemetry,
  type ErrorEvent,
  type CircuitBreakerEvent,
  type RetryEvent,
  type TelemetryCallbacks,
} from './errors/TelemetryHooks';

// Caching & Performance
export {
  ResponseCache,
  type CacheStats,
  type ResponseCacheConfig,
  DEFAULT_CACHE_CONFIG,
} from './cache/ResponseCache';

export {
  RequestDeduplicator,
  type DeduplicationStats,
  type RequestDeduplicatorConfig,
  DEFAULT_DEDUPLICATOR_CONFIG,
} from './cache/RequestDeduplicator';

export {
  PerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceMonitorConfig,
  DEFAULT_MONITOR_CONFIG,
} from './cache/PerformanceMonitor';

// Context Optimization
export {
  ContextOptimizer,
  type ContextPriority,
  type CompressionStrategy,
  type SummarizationStrategy,
  type ContextOptimizationConfig,
  type OptimizationStats,
  type ContextMiddleware,
  DEFAULT_OPTIMIZATION_CONFIG,
} from './optimization/ContextOptimizer';
