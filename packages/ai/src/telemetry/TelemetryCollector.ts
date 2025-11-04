/**
 * TelemetryCollector - Production telemetry collection with privacy-safe data handling
 *
 * Features:
 * - Event buffering and automatic batching
 * - Multiple transport backends (HTTP, localStorage, console)
 * - Configurable sampling strategies
 * - Privacy-safe data collection with PII redaction
 * - Low overhead (<5% performance impact)
 *
 * @module telemetry
 */

/**
 * Telemetry event structure
 */
export interface TelemetryEvent {
  /** Event type identifier */
  type: string;
  /** Event timestamp in milliseconds */
  timestamp: number;
  /** Event data payload */
  data: Record<string, any>;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Performance metric event
 */
export interface PerformanceMetric {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Metric unit (ms, bytes, count, etc.) */
  unit: string;
  /** Metric tags for categorization */
  tags?: Record<string, string>;
  /** Timestamp in milliseconds */
  timestamp?: number;
}

/**
 * Error event structure
 */
export interface ErrorEvent {
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Error name/type */
  name?: string;
  /** Error context data */
  context?: Record<string, any>;
  /** Timestamp in milliseconds */
  timestamp?: number;
}

/**
 * Usage event structure
 */
export interface UsageEvent {
  /** Feature identifier */
  feature: string;
  /** Action performed */
  action?: string;
  /** Event data */
  data?: Record<string, any>;
  /** Timestamp in milliseconds */
  timestamp?: number;
}

/**
 * Sampling strategy types
 */
export type SamplingStrategy = 'always' | 'never' | 'probabilistic' | 'throttled';

/**
 * Transport backend types
 */
export type TransportBackend = 'http' | 'localStorage' | 'console' | 'custom';

/**
 * Custom transport function
 */
export type TransportFunction = (events: TelemetryEvent[]) => Promise<void>;

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Enable/disable telemetry collection */
  enabled?: boolean;
  /** Sampling strategy */
  sampling?: SamplingStrategy;
  /** Sampling rate (0-1) for probabilistic sampling */
  samplingRate?: number;
  /** Maximum events to buffer before flushing */
  maxBufferSize?: number;
  /** Flush interval in milliseconds */
  flushIntervalMs?: number;
  /** Transport backend type */
  transport?: TransportBackend;
  /** HTTP endpoint for HTTP transport */
  endpoint?: string;
  /** Custom transport function */
  customTransport?: TransportFunction;
  /** Enable PII redaction */
  redactPII?: boolean;
  /** Fields to redact */
  redactFields?: string[];
  /** Enable debug logging */
  debug?: boolean;
  /** Throttle window in milliseconds */
  throttleWindowMs?: number;
  /** Max events per throttle window */
  maxEventsPerWindow?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<TelemetryConfig, 'endpoint' | 'customTransport'>> = {
  enabled: true,
  sampling: 'always',
  samplingRate: 1.0,
  maxBufferSize: 50,
  flushIntervalMs: 30000, // 30 seconds
  transport: 'console',
  redactPII: true,
  redactFields: ['email', 'password', 'token', 'key', 'secret', 'apiKey'],
  debug: false,
  throttleWindowMs: 60000, // 1 minute
  maxEventsPerWindow: 100,
};

/**
 * PII patterns for detection
 */
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{16}\b/g, // Credit card
  /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number
];

/**
 * TelemetryCollector - Main telemetry collection engine
 */
export class TelemetryCollector {
  private config: Required<Omit<TelemetryConfig, 'endpoint' | 'customTransport'>> &
    Pick<TelemetryConfig, 'endpoint' | 'customTransport'>;
  private buffer: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | number | null = null;
  private throttleMap: Map<string, number[]> = new Map();
  private sessionId: string;
  private eventCount = 0;

  constructor(config: TelemetryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();

    // Start flush timer
    if (this.config.enabled && this.config.flushIntervalMs > 0) {
      this.startFlushTimer();
    }

    // Track session start
    if (this.config.enabled) {
      this.track({
        type: 'session.start',
        timestamp: Date.now(),
        data: { sessionId: this.sessionId },
      });
    }
  }

  /**
   * Track a telemetry event
   */
  track(event: TelemetryEvent): void {
    if (!this.config.enabled) return;
    if (!this.shouldSample(event)) return;
    if (!this.shouldAllowByThrottle(event)) return;

    // Add session metadata
    const enrichedEvent: TelemetryEvent = {
      ...event,
      metadata: {
        ...event.metadata,
        sessionId: this.sessionId,
        eventId: this.generateEventId(),
      },
    };

    // Redact PII if enabled
    const processedEvent = this.config.redactPII
      ? this.redactPIIFromEvent(enrichedEvent)
      : enrichedEvent;

    // Add to buffer
    this.buffer.push(processedEvent);
    this.eventCount++;

    if (this.config.debug) {
      console.log('[Telemetry] Event tracked:', processedEvent.type);
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.config.maxBufferSize) {
      void this.flush();
    }
  }

  /**
   * Track a performance metric
   */
  trackPerformance(metric: PerformanceMetric): void {
    this.track({
      type: 'performance.metric',
      timestamp: metric.timestamp || Date.now(),
      data: {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
      },
    });
  }

  /**
   * Track an error
   */
  trackError(error: Error, context?: any): void {
    const errorEvent: ErrorEvent = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      context: context || {},
      timestamp: Date.now(),
    };

    this.track({
      type: 'error.captured',
      timestamp: errorEvent.timestamp,
      data: errorEvent,
    });
  }

  /**
   * Track feature usage
   */
  trackUsage(feature: string, data?: any): void {
    const usageEvent: UsageEvent = {
      feature,
      action: data?.action,
      data: data ? { ...data } : undefined,
      timestamp: Date.now(),
    };

    this.track({
      type: 'usage.feature',
      timestamp: usageEvent.timestamp,
      data: usageEvent,
    });
  }

  /**
   * Flush buffered events
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendEvents(events);

      if (this.config.debug) {
        console.log(`[Telemetry] Flushed ${events.length} events`);
      }
    } catch (error) {
      // Restore events to buffer on failure
      this.buffer.unshift(...events);

      if (this.config.debug) {
        console.error('[Telemetry] Flush failed:', error);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<TelemetryConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TelemetryConfig>): void {
    const oldEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    // Restart flush timer if interval changed
    if (config.flushIntervalMs !== undefined) {
      this.stopFlushTimer();
      if (this.config.enabled) {
        this.startFlushTimer();
      }
    }

    // Start/stop based on enabled state
    if (!oldEnabled && this.config.enabled) {
      this.startFlushTimer();
    } else if (oldEnabled && !this.config.enabled) {
      this.stopFlushTimer();
      void this.flush();
    }
  }

  /**
   * Get buffer status
   */
  getBufferStatus(): { size: number; maxSize: number; utilizationRate: number } {
    return {
      size: this.buffer.length,
      maxSize: this.config.maxBufferSize,
      utilizationRate: this.buffer.length / this.config.maxBufferSize,
    };
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(): {
    sessionId: string;
    eventCount: number;
    bufferSize: number;
    uptime: number;
  } {
    return {
      sessionId: this.sessionId,
      eventCount: this.eventCount,
      bufferSize: this.buffer.length,
      uptime: Date.now() - parseInt(this.sessionId.split('-')[0]),
    };
  }

  /**
   * Destroy collector and cleanup
   */
  destroy(): void {
    this.stopFlushTimer();
    void this.flush();

    // Track session end
    if (this.config.enabled) {
      this.track({
        type: 'session.end',
        timestamp: Date.now(),
        data: {
          sessionId: this.sessionId,
          totalEvents: this.eventCount,
        },
      });
      void this.flush();
    }
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(event: TelemetryEvent): boolean {
    switch (this.config.sampling) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'probabilistic':
        return Math.random() < this.config.samplingRate;
      case 'throttled':
        // Always sample critical events
        if (event.type.startsWith('error.') || event.type.startsWith('session.')) {
          return true;
        }
        return Math.random() < this.config.samplingRate;
      default:
        return true;
    }
  }

  /**
   * Check throttle limits
   */
  private shouldAllowByThrottle(event: TelemetryEvent): boolean {
    if (this.config.sampling !== 'throttled') return true;

    const now = Date.now();
    const windowStart = now - this.config.throttleWindowMs;
    const eventType = event.type;

    // Get or create throttle entry
    let timestamps = this.throttleMap.get(eventType) || [];

    // Remove old timestamps
    timestamps = timestamps.filter(ts => ts > windowStart);

    // Check limit
    if (timestamps.length >= this.config.maxEventsPerWindow) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    this.throttleMap.set(eventType, timestamps);

    return true;
  }

  /**
   * Send events to transport backend
   */
  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    switch (this.config.transport) {
      case 'http':
        await this.sendHTTP(events);
        break;
      case 'localStorage':
        this.sendLocalStorage(events);
        break;
      case 'console':
        this.sendConsole(events);
        break;
      case 'custom':
        if (this.config.customTransport) {
          await this.config.customTransport(events);
        }
        break;
    }
  }

  /**
   * Send via HTTP
   */
  private async sendHTTP(events: TelemetryEvent[]): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('HTTP endpoint not configured');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Send to localStorage
   */
  private sendLocalStorage(events: TelemetryEvent[]): void {
    const key = `telemetry_${this.sessionId}`;
    const existing = localStorage.getItem(key);
    const allEvents = existing ? JSON.parse(existing) : [];
    allEvents.push(...events);
    localStorage.setItem(key, JSON.stringify(allEvents));
  }

  /**
   * Send to console
   */
  private sendConsole(events: TelemetryEvent[]): void {
    console.log('[Telemetry] Events:', events);
  }

  /**
   * Redact PII from event
   */
  private redactPIIFromEvent(event: TelemetryEvent): TelemetryEvent {
    return {
      ...event,
      data: this.redactPIIFromObject(event.data),
      metadata: event.metadata ? this.redactPIIFromObject(event.metadata) : undefined,
    };
  }

  /**
   * Redact PII from object recursively
   */
  private redactPIIFromObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') {
      // Check string values for PII patterns
      if (typeof obj === 'string') {
        let redacted = obj;
        for (const pattern of PII_PATTERNS) {
          redacted = redacted.replace(pattern, '[REDACTED]');
        }
        return redacted;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactPIIFromObject(item));
    }

    const result: any = {};
    const lowerCaseFields = this.config.redactFields.map(f => f.toLowerCase());
    for (const [key, value] of Object.entries(obj)) {
      // Redact known PII fields (case-insensitive)
      if (lowerCaseFields.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = this.redactPIIFromObject(value);
      }
    }

    return result;
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer as number);
      this.flushTimer = null;
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `${this.sessionId}-${this.eventCount}`;
  }
}
