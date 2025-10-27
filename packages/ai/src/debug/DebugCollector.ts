/**
 * Central debug data collection system
 *
 * Collects debugging information from all AI operations for inspection,
 * troubleshooting, and performance analysis.
 */

import type { Message, StreamChunk, Tool, ToolResult } from '../providers/AIProvider';

/**
 * Debug event types
 */
export type DebugEventType =
  | 'request-start'
  | 'request-end'
  | 'request-error'
  | 'stream-start'
  | 'stream-chunk'
  | 'stream-end'
  | 'stream-error'
  | 'tool-use'
  | 'tool-result'
  | 'context-add'
  | 'context-optimize'
  | 'cache-hit'
  | 'cache-miss'
  | 'retry-attempt'
  | 'circuit-open'
  | 'circuit-close';

/**
 * Request debug information
 */
export interface RequestDebugInfo {
  /** Unique request ID */
  id: string;
  /** Request timestamp */
  timestamp: number;
  /** Request messages */
  messages: Message[];
  /** Request tools */
  tools?: Tool[];
  /** Model name */
  model?: string;
  /** Max tokens */
  maxTokens?: number;
  /** Temperature */
  temperature?: number;
}

/**
 * Response debug information
 */
export interface ResponseDebugInfo {
  /** Request ID */
  requestId: string;
  /** Response timestamp */
  timestamp: number;
  /** Response duration in ms */
  duration: number;
  /** Response content */
  content: Message;
  /** Stop reason */
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence';
  /** Usage statistics */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Stream debug information
 */
export interface StreamDebugInfo {
  /** Request ID */
  requestId: string;
  /** Stream event timestamp */
  timestamp: number;
  /** Chunk data */
  chunk?: StreamChunk;
  /** Stream error */
  error?: Error;
  /** Stream duration (only on end) */
  duration?: number;
}

/**
 * Tool debug information
 */
export interface ToolDebugInfo {
  /** Request ID */
  requestId: string;
  /** Tool event timestamp */
  timestamp: number;
  /** Tool name */
  toolName: string;
  /** Tool input */
  input?: Record<string, unknown>;
  /** Tool result */
  result?: ToolResult;
  /** Tool execution duration */
  duration?: number;
  /** Tool error */
  error?: Error;
}

/**
 * Context debug information
 */
export interface ContextDebugInfo {
  /** Request ID */
  requestId: string;
  /** Event timestamp */
  timestamp: number;
  /** Event type */
  event: 'add' | 'optimize';
  /** Context size before */
  sizeBefore?: number;
  /** Context size after */
  sizeAfter?: number;
  /** Optimization stats */
  optimizationStats?: {
    originalTokens: number;
    optimizedTokens: number;
    reductionPercentage: number;
  };
}

/**
 * Cache debug information
 */
export interface CacheDebugInfo {
  /** Request ID */
  requestId: string;
  /** Event timestamp */
  timestamp: number;
  /** Cache hit or miss */
  hit: boolean;
  /** Cache key */
  key: string;
  /** Time saved on cache hit (ms) */
  timeSaved?: number;
}

/**
 * Error debug information
 */
export interface ErrorDebugInfo {
  /** Request ID */
  requestId: string;
  /** Error timestamp */
  timestamp: number;
  /** Error object */
  error: Error;
  /** Error type classification */
  errorType?: string;
  /** Recovery strategy applied */
  recoveryStrategy?: string;
  /** Retry attempt number */
  retryAttempt?: number;
}

/**
 * Circuit breaker debug information
 */
export interface CircuitDebugInfo {
  /** Event timestamp */
  timestamp: number;
  /** Circuit name/ID */
  circuitId: string;
  /** Circuit state */
  state: 'open' | 'closed' | 'half-open';
  /** Failure count */
  failureCount?: number;
  /** Success count */
  successCount?: number;
}

/**
 * Debug event
 */
export interface DebugEvent {
  /** Event type */
  type: DebugEventType;
  /** Event data */
  data:
    | RequestDebugInfo
    | ResponseDebugInfo
    | StreamDebugInfo
    | ToolDebugInfo
    | ContextDebugInfo
    | CacheDebugInfo
    | ErrorDebugInfo
    | CircuitDebugInfo;
}

/**
 * Debug event listener
 */
export type DebugEventListener = (event: DebugEvent) => void;

/**
 * Debug collector configuration
 */
export interface DebugCollectorConfig {
  /** Enable debug collection */
  enabled?: boolean;
  /** Maximum events to store */
  maxEvents?: number;
  /** Event types to collect (all if empty) */
  eventTypes?: DebugEventType[];
  /** Enable automatic console logging */
  consoleLog?: boolean;
  /** Console log level */
  logLevel?: 'verbose' | 'normal' | 'minimal';
}

/**
 * Default debug collector configuration
 */
export const DEFAULT_DEBUG_CONFIG: Required<DebugCollectorConfig> = {
  enabled: process.env.NODE_ENV === 'development',
  maxEvents: 1000,
  eventTypes: [],
  consoleLog: false,
  logLevel: 'normal',
};

/**
 * Debug collector
 *
 * Central system for collecting and managing debug information from all AI operations.
 *
 * Features:
 * - Event-based debug data collection
 * - Configurable event filtering
 * - Event listeners for custom handling
 * - Automatic event rotation
 * - Request-scoped filtering
 * - Performance metrics
 *
 * Usage:
 * ```ts
 * const collector = new DebugCollector({
 *   enabled: true,
 *   maxEvents: 500,
 *   consoleLog: true,
 * });
 *
 * // Subscribe to events
 * collector.on((event) => {
 *   console.log('Debug event:', event);
 * });
 *
 * // Emit events
 * collector.emit('request-start', requestInfo);
 * collector.emit('request-end', responseInfo);
 *
 * // Query events
 * const errors = collector.getEventsByType('request-error');
 * const requestEvents = collector.getEventsByRequestId('req-123');
 *
 * // Clear old events
 * collector.clear();
 * ```
 */
export class DebugCollector {
  private config: Required<DebugCollectorConfig>;
  private events: DebugEvent[] = [];
  private listeners: DebugEventListener[] = [];
  private requestStartTimes = new Map<string, number>();

  constructor(config: DebugCollectorConfig = {}) {
    this.config = { ...DEFAULT_DEBUG_CONFIG, ...config };
  }

  /**
   * Subscribe to debug events
   */
  on(listener: DebugEventListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit a debug event
   */
  emit(type: DebugEventType, data: DebugEvent['data']): void {
    if (!this.config.enabled) return;

    // Filter by event type if configured
    if (this.config.eventTypes.length > 0 && !this.config.eventTypes.includes(type)) {
      return;
    }

    const event: DebugEvent = { type, data };

    // Store event
    this.events.push(event);

    // Rotate events if over limit
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Debug listener error:', error);
      }
    }

    // Console logging
    if (this.config.consoleLog) {
      this.logEvent(event);
    }

    // Track request timings
    this.trackRequestTiming(type, data);
  }

  /**
   * Get all collected events
   */
  getEvents(): DebugEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: DebugEventType): DebugEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  /**
   * Get events by request ID
   */
  getEventsByRequestId(requestId: string): DebugEvent[] {
    return this.events.filter((event) => {
      const data = event.data as { requestId?: string };
      return data.requestId === requestId;
    });
  }

  /**
   * Get recent events (last N)
   */
  getRecentEvents(count: number = 10): DebugEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events within time range
   */
  getEventsByTimeRange(startTime: number, endTime: number): DebugEvent[] {
    return this.events.filter((event) => {
      const data = event.data as { timestamp: number };
      return data.timestamp >= startTime && data.timestamp <= endTime;
    });
  }

  /**
   * Get error events
   */
  getErrors(): DebugEvent[] {
    return this.events.filter((event) =>
      event.type === 'request-error' || event.type === 'stream-error'
    );
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalRequests: number;
    avgRequestDuration: number;
    minRequestDuration: number;
    maxRequestDuration: number;
    errorRate: number;
    cacheHitRate: number;
  } {
    const requests = this.getEventsByType('request-start').length;
    const responses = this.getEventsByType('request-end');
    const errors = this.getErrors().length;

    const durations = responses.map((e) => (e.data as ResponseDebugInfo).duration);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    const cacheHits = this.getEventsByType('cache-hit').length;
    const cacheMisses = this.getEventsByType('cache-miss').length;
    const cacheTotal = cacheHits + cacheMisses;
    const cacheHitRate = cacheTotal > 0 ? cacheHits / cacheTotal : 0;

    return {
      totalRequests: requests,
      avgRequestDuration: Math.round(avgDuration),
      minRequestDuration: Math.round(minDuration),
      maxRequestDuration: Math.round(maxDuration),
      errorRate: requests > 0 ? errors / requests : 0,
      cacheHitRate,
    };
  }

  /**
   * Clear all collected events
   */
  clear(): void {
    this.events = [];
    this.requestStartTimes.clear();
  }

  /**
   * Enable or disable collection
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if collection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DebugCollectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log event to console
   */
  private logEvent(event: DebugEvent): void {
    const { logLevel } = this.config;

    if (logLevel === 'minimal') {
      // Only log errors and important events
      if (event.type.includes('error') || event.type === 'request-start') {
        console.log(`[Debug] ${event.type}`, event.data);
      }
    } else if (logLevel === 'normal') {
      // Log most events except verbose ones
      if (!event.type.includes('chunk') && !event.type.includes('cache')) {
        console.log(`[Debug] ${event.type}`, event.data);
      }
    } else {
      // Log everything
      console.log(`[Debug] ${event.type}`, event.data);
    }
  }

  /**
   * Track request timing
   */
  private trackRequestTiming(type: DebugEventType, data: DebugEvent['data']): void {
    if (type === 'request-start') {
      const requestData = data as RequestDebugInfo;
      this.requestStartTimes.set(requestData.id, requestData.timestamp);
    } else if (type === 'request-end') {
      const responseData = data as ResponseDebugInfo;
      this.requestStartTimes.delete(responseData.requestId);
    }
  }
}

/**
 * Global debug collector instance
 */
export const globalDebugCollector = new DebugCollector();
