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

export {
  MemoryContextCache,
  DEFAULT_CONTEXT_CACHE_CONFIG,
  type ContextCache,
  type CacheConfig,
  type ContextCacheStats,
  type InvalidationTrigger,
  type InvalidationCallback,
} from './context/ContextCache';

export {
  ViewportContextProvider,
  type ViewportContextInfo,
} from './context/ViewportContextProvider';

export {
  PerformanceContextProvider,
  type PerformanceContextInfo,
} from './context/PerformanceContextProvider';

export {
  FormStateContextProvider,
  type FormStateContextInfo,
  type FormField,
  type FormInfo,
} from './context/FormStateContextProvider';

export {
  NavigationContextProvider,
  type NavigationContextInfo,
  type CurrentUrlInfo,
} from './context/NavigationContextProvider';

export {
  ContextManager,
  DEFAULT_CONTEXT_MANAGER_CONFIG,
  type ContextManagerConfig,
  type GatherOptions,
  type GatheredContext,
  type ContextManagerStats,
  type ContextEvent,
  type ContextListener,
} from './context/ContextManager';

export {
  ContextPrioritizer,
  DEFAULT_PRIORITIZER_CONFIG,
  type PrioritizerConfig,
  type ScoredContext,
  type PrioritizationOptions,
} from './context/ContextPrioritizer';

// Context Compression
export {
  ContextCompressor,
  DEFAULT_COMPRESSION_CONFIG,
  type CompressionConfig,
  type CompressionResult,
  type CompressionSavings,
  type CompressionStrategy as ContextCompressionStrategy,
} from './context/ContextCompressor';

export {
  RemoveRedundancyStrategy,
  SummarizeVerboseStrategy,
  KeepEssentialStrategy,
  DEFAULT_COMPRESSION_STRATEGIES,
} from './context/compression/CompressionStrategies';

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
  type ProviderInfo,
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

export {
  ProviderSelector,
  type ProviderSelectorProps,
  ProviderSelectorStyles,
} from './react/ProviderSelector';

export {
  VisuallyHidden,
  type VisuallyHiddenProps,
  ScreenReaderAnnouncement,
  type ScreenReaderAnnouncementProps,
} from './react/VisuallyHidden';

// Developer Tools Components
export {
  ContextInspector,
  type ContextInspectorProps,
} from './react/ContextInspector';

export {
  ContextDiff,
  type ContextDiffProps,
} from './react/ContextDiff';

export {
  PerformanceProfiler,
  type PerformanceProfilerProps,
} from './react/PerformanceProfiler';

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

// Debug & Developer Tools
export {
  DebugCollector,
  globalDebugCollector,
  type DebugEventType,
  type DebugEvent,
  type DebugEventListener,
  type RequestDebugInfo,
  type ResponseDebugInfo,
  type StreamDebugInfo,
  type ToolDebugInfo,
  type ContextDebugInfo,
  type CacheDebugInfo,
  type ErrorDebugInfo,
  type CircuitDebugInfo,
  type DebugCollectorConfig,
  DEFAULT_DEBUG_CONFIG,
} from './debug/DebugCollector';

export {
  RequestInspector,
  type InspectedRequest,
} from './debug/RequestInspector';

export {
  PerformanceProfiler as DebugPerformanceProfiler,
  type PerformanceBottleneck,
  type PerformanceProfile,
} from './debug/PerformanceProfiler';

// Middleware & Production Features
export {
  RateLimiter,
  type RateWindow,
  type RateLimiterConfig,
  type RateLimitStats,
  DEFAULT_RATE_LIMITER_CONFIG,
} from './middleware/RateLimiter';

export {
  UsageTracker,
  type UsageQuota,
  type UsageTrackerConfig,
  type UsageStats,
  type UsageRecord,
  type UsageStorage,
  MemoryUsageStorage,
  DEFAULT_USAGE_TRACKER_CONFIG,
} from './middleware/UsageTracker';

export {
  ValidationMiddleware,
  type ValidationError,
  type ValidationResult,
  type ValidationRule,
  type ValidationMiddlewareConfig,
  DEFAULT_VALIDATION_CONFIG,
} from './middleware/ValidationMiddleware';

export {
  SecurityMiddleware,
  type SecurityThreatType,
  type SecurityViolation,
  type SecurityResult,
  type SecurityMiddlewareConfig,
  DEFAULT_SECURITY_CONFIG,
} from './middleware/SecurityMiddleware';

// Monitoring & Compliance
export {
  AuditLogger,
  type LogLevel,
  type AuditEventType,
  type AuditLogEntry,
  type AuditEventData,
  type RequestAuditData,
  type ResponseAuditData,
  type ErrorAuditData,
  type QuotaAuditData,
  type RateLimitAuditData,
  type AuthAuditData,
  type ConfigChangeAuditData,
  type DataAccessAuditData,
  type SecurityEventAuditData,
  type AuditLoggerConfig,
  type AuditLogQuery,
  type AuditLogBackend,
  type AuditContext,
  MemoryAuditLogBackend,
  DEFAULT_AUDIT_CONFIG,
} from './monitoring/AuditLogger';

// Testing utilities
export {
  createTestProvider,
  mockStreamingResponse,
  generateTestMessages,
  generateTestTools,
  createTestChatOptions,
  simulateNetworkLatency,
  testErrorScenarios,
  waitForCondition,
  collectStreamChunks,
  extractTextFromChunks,
  assertStreamingBehavior,
  type TestScenario,
  type MockProviderConfig,
  type MessageGenerationOptions,
  type StreamingSimulationOptions,
} from './testing/TestUtilities';

// Mock scenarios
export {
  createRealisticMockProvider,
  getConversationState,
  resetConversationState,
  createBatchScenarioTests,
  ScenarioUtils,
  LATENCY_PROFILES,
  REALISTIC_SCENARIOS,
  type ScenarioComplexity,
  type LatencyProfile,
  type TokenUsage,
  type MockScenarioConfig,
  type BatchScenarioTest,
} from './testing/MockScenarios';

// Performance benchmarking
export {
  runBenchmark,
  formatBenchmarkReport,
  exportBenchmarkResults,
  compareBenchmarks,
  type BenchmarkScenario,
  type PerformanceAssertions,
  type BenchmarkConfig,
  type ScenarioDefinition,
  type BenchmarkProgress,
  type RequestMetrics,
  type ScenarioMetrics,
  type BenchmarkResults,
  type AssertionResult,
  type BenchmarkComparison,
} from './testing/PerformanceBenchmark';

// Load testing
export {
  runLoadTest,
  formatLoadTestReport,
  exportLoadTestResults,
  type LoadPattern,
  type LoadTestScenario,
  type LoadPatternConfig,
  type LoadTestConfig,
  type RequestResult,
  type LoadTestProgress,
  type TimeWindowMetrics,
  type DegradationPoint,
  type Bottleneck,
  type CapacityRecommendations,
  type LoadTestResults,
} from './testing/LoadTesting';
