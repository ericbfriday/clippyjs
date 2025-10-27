/**
 * Audit logging system for compliance and tracking
 *
 * Provides comprehensive audit trails for all AI interactions with configurable
 * log levels and storage backends for compliance and security requirements.
 */

/**
 * Audit log levels
 */
export type LogLevel = 'minimal' | 'standard' | 'detailed';

/**
 * Audit event types
 */
export type AuditEventType =
  | 'request'
  | 'response'
  | 'error'
  | 'quota-exceeded'
  | 'rate-limited'
  | 'auth-attempt'
  | 'config-change'
  | 'data-access'
  | 'security-event';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Unique log entry ID */
  id: string;
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Event type */
  eventType: AuditEventType;
  /** User/session identifier */
  userId: string;
  /** Log level at which this was captured */
  logLevel: LogLevel;
  /** Event-specific data */
  data: AuditEventData;
  /** IP address (if available) */
  ipAddress?: string;
  /** User agent (if available) */
  userAgent?: string;
  /** Session identifier */
  sessionId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Event-specific audit data
 */
export type AuditEventData =
  | RequestAuditData
  | ResponseAuditData
  | ErrorAuditData
  | QuotaAuditData
  | RateLimitAuditData
  | AuthAuditData
  | ConfigChangeAuditData
  | DataAccessAuditData
  | SecurityEventAuditData;

/**
 * Request audit data
 */
export interface RequestAuditData {
  type: 'request';
  /** Request ID */
  requestId: string;
  /** Message count in request */
  messageCount: number;
  /** Approximate token count */
  tokenCount?: number;
  /** Model used */
  model?: string;
  /** Request options (sanitized) */
  options?: Record<string, unknown>;
}

/**
 * Response audit data
 */
export interface ResponseAuditData {
  type: 'response';
  /** Request ID */
  requestId: string;
  /** Response token count */
  tokenCount: number;
  /** Request duration in ms */
  duration: number;
  /** Whether response was cached */
  cached?: boolean;
  /** Response status */
  status: 'success' | 'partial' | 'error';
}

/**
 * Error audit data
 */
export interface ErrorAuditData {
  type: 'error';
  /** Request ID (if applicable) */
  requestId?: string;
  /** Error type */
  errorType: string;
  /** Error message */
  errorMessage: string;
  /** Stack trace (if detailed logging) */
  stackTrace?: string;
  /** Recovery action taken */
  recoveryAction?: string;
}

/**
 * Quota exceeded audit data
 */
export interface QuotaAuditData {
  type: 'quota-exceeded';
  /** Quota type */
  quotaType: 'daily' | 'monthly';
  /** Tokens used */
  tokensUsed: number;
  /** Requests used */
  requestsUsed: number;
  /** Quota limit */
  quotaLimit: number;
}

/**
 * Rate limit audit data
 */
export interface RateLimitAuditData {
  type: 'rate-limited';
  /** Rate limit window */
  window: string;
  /** Current count */
  currentCount: number;
  /** Limit */
  limit: number;
  /** Reset time */
  resetsAt: number;
}

/**
 * Authentication audit data
 */
export interface AuthAuditData {
  type: 'auth-attempt';
  /** Auth method */
  method: string;
  /** Success status */
  success: boolean;
  /** Failure reason (if failed) */
  reason?: string;
}

/**
 * Configuration change audit data
 */
export interface ConfigChangeAuditData {
  type: 'config-change';
  /** Configuration key */
  configKey: string;
  /** Old value (sanitized) */
  oldValue?: unknown;
  /** New value (sanitized) */
  newValue: unknown;
  /** Change reason */
  reason?: string;
}

/**
 * Data access audit data
 */
export interface DataAccessAuditData {
  type: 'data-access';
  /** Resource accessed */
  resource: string;
  /** Access type */
  accessType: 'read' | 'write' | 'delete';
  /** Record count affected */
  recordCount?: number;
}

/**
 * Security event audit data
 */
export interface SecurityEventAuditData {
  type: 'security-event';
  /** Security event type */
  securityType: 'suspicious-activity' | 'blocked-request' | 'validation-failure' | 'injection-attempt';
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Event description */
  description: string;
  /** Blocked/allowed */
  blocked: boolean;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /** Enable audit logging */
  enabled?: boolean;
  /** Log level */
  logLevel?: LogLevel;
  /** Custom storage backend */
  backend?: AuditLogBackend;
  /** Include IP addresses in logs */
  includeIpAddress?: boolean;
  /** Include user agent in logs */
  includeUserAgent?: boolean;
  /** Sanitize sensitive data */
  sanitizeData?: boolean;
  /** Retention period in days */
  retentionDays?: number;
  /** Callback for security events */
  onSecurityEvent?: (entry: AuditLogEntry) => void;
}

/**
 * Default audit logger configuration
 */
export const DEFAULT_AUDIT_CONFIG: Required<Omit<AuditLoggerConfig, 'onSecurityEvent' | 'backend'>> = {
  enabled: true,
  logLevel: 'standard',
  includeIpAddress: true,
  includeUserAgent: true,
  sanitizeData: true,
  retentionDays: 90,
};

/**
 * Audit log query options
 */
export interface AuditLogQuery {
  /** Filter by user ID */
  userId?: string;
  /** Filter by event type */
  eventType?: AuditEventType;
  /** Filter by start time */
  startTime?: number;
  /** Filter by end time */
  endTime?: number;
  /** Filter by session ID */
  sessionId?: string;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Storage backend interface for audit logs
 */
export interface AuditLogBackend {
  /** Write log entry */
  write(entry: AuditLogEntry): Promise<void>;
  /** Query log entries */
  query(query: AuditLogQuery): Promise<AuditLogEntry[]>;
  /** Delete old entries */
  cleanup(beforeTimestamp: number): Promise<number>;
  /** Get total log count */
  count(query?: AuditLogQuery): Promise<number>;
}

/**
 * In-memory storage implementation
 */
export class MemoryAuditLogBackend implements AuditLogBackend {
  private logs: AuditLogEntry[] = [];

  async write(entry: AuditLogEntry): Promise<void> {
    this.logs.push(entry);
  }

  async query(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    let results = this.logs;

    if (query.userId) {
      results = results.filter((e) => e.userId === query.userId);
    }
    if (query.eventType) {
      results = results.filter((e) => e.eventType === query.eventType);
    }
    if (query.startTime) {
      results = results.filter((e) => e.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter((e) => e.timestamp <= query.endTime!);
    }
    if (query.sessionId) {
      results = results.filter((e) => e.sessionId === query.sessionId);
    }

    // Sort by timestamp descending (most recent first)
    results = results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || results.length;
    return results.slice(offset, offset + limit);
  }

  async cleanup(beforeTimestamp: number): Promise<number> {
    const initialLength = this.logs.length;
    this.logs = this.logs.filter((e) => e.timestamp >= beforeTimestamp);
    return initialLength - this.logs.length;
  }

  async count(query?: AuditLogQuery): Promise<number> {
    if (!query) {
      return this.logs.length;
    }
    const results = await this.query(query);
    return results.length;
  }
}

/**
 * Audit logger
 *
 * Provides comprehensive audit logging for AI operations with configurable
 * log levels and storage backends.
 *
 * Features:
 * - Multiple log levels (minimal/standard/detailed)
 * - Flexible event types
 * - Custom storage backends
 * - Query and filtering
 * - Automatic cleanup
 * - Security event monitoring
 *
 * Usage:
 * ```ts
 * const logger = new AuditLogger({
 *   logLevel: 'detailed',
 *   retentionDays: 90,
 *   onSecurityEvent: (entry) => {
 *     console.error('Security event:', entry);
 *   }
 * });
 *
 * // Log an AI request
 * await logger.logRequest('user-123', 'req-456', {
 *   messageCount: 5,
 *   tokenCount: 1500,
 *   model: 'claude-3-opus',
 * });
 *
 * // Log a response
 * await logger.logResponse('user-123', 'req-456', {
 *   tokenCount: 800,
 *   duration: 2500,
 *   status: 'success',
 * });
 *
 * // Query logs
 * const userLogs = await logger.query({
 *   userId: 'user-123',
 *   startTime: Date.now() - 86400000, // Last 24 hours
 *   limit: 100,
 * });
 * ```
 */
export class AuditLogger {
  private config: Required<Omit<AuditLoggerConfig, 'onSecurityEvent'>>;
  private backend: AuditLogBackend;
  private onSecurityEvent?: (entry: AuditLogEntry) => void;
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 24 * 60 * 60 * 1000; // Daily cleanup

  constructor(config: AuditLoggerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? DEFAULT_AUDIT_CONFIG.enabled,
      logLevel: config.logLevel ?? DEFAULT_AUDIT_CONFIG.logLevel,
      includeIpAddress: config.includeIpAddress ?? DEFAULT_AUDIT_CONFIG.includeIpAddress,
      includeUserAgent: config.includeUserAgent ?? DEFAULT_AUDIT_CONFIG.includeUserAgent,
      sanitizeData: config.sanitizeData ?? DEFAULT_AUDIT_CONFIG.sanitizeData,
      retentionDays: config.retentionDays ?? DEFAULT_AUDIT_CONFIG.retentionDays,
      backend: config.backend ?? new MemoryAuditLogBackend(),
    };
    this.backend = this.config.backend;
    this.onSecurityEvent = config.onSecurityEvent;
  }

  /**
   * Log an AI request
   */
  async logRequest(
    userId: string,
    requestId: string,
    data: Omit<RequestAuditData, 'type' | 'requestId'>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      eventType: 'request',
      data: {
        type: 'request',
        requestId,
        ...data,
      },
      ...context,
    });
  }

  /**
   * Log an AI response
   */
  async logResponse(
    userId: string,
    requestId: string,
    data: Omit<ResponseAuditData, 'type' | 'requestId'>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      eventType: 'response',
      data: {
        type: 'response',
        requestId,
        ...data,
      },
      ...context,
    });
  }

  /**
   * Log an error
   */
  async logError(
    userId: string,
    error: Error,
    requestId?: string,
    context?: AuditContext
  ): Promise<void> {
    const data: ErrorAuditData = {
      type: 'error',
      requestId,
      errorType: error.constructor.name,
      errorMessage: error.message,
    };

    if (this.config.logLevel === 'detailed') {
      data.stackTrace = error.stack;
    }

    await this.log({
      userId,
      eventType: 'error',
      data,
      ...context,
    });
  }

  /**
   * Log quota exceeded event
   */
  async logQuotaExceeded(
    userId: string,
    data: Omit<QuotaAuditData, 'type'>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      eventType: 'quota-exceeded',
      data: {
        type: 'quota-exceeded',
        ...data,
      },
      ...context,
    });
  }

  /**
   * Log rate limit event
   */
  async logRateLimited(
    userId: string,
    data: Omit<RateLimitAuditData, 'type'>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      eventType: 'rate-limited',
      data: {
        type: 'rate-limited',
        ...data,
      },
      ...context,
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string,
    data: Omit<SecurityEventAuditData, 'type'>,
    context?: AuditContext
  ): Promise<void> {
    const entry = await this.log({
      userId,
      eventType: 'security-event',
      data: {
        type: 'security-event',
        ...data,
      },
      ...context,
    });

    if (this.onSecurityEvent && entry) {
      this.onSecurityEvent(entry);
    }
  }

  /**
   * Log authentication attempt
   */
  async logAuthAttempt(
    userId: string,
    data: Omit<AuthAuditData, 'type'>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      eventType: 'auth-attempt',
      data: {
        type: 'auth-attempt',
        ...data,
      },
      ...context,
    });
  }

  /**
   * Log configuration change
   */
  async logConfigChange(
    userId: string,
    data: Omit<ConfigChangeAuditData, 'type'>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      eventType: 'config-change',
      data: {
        type: 'config-change',
        ...data,
      },
      ...context,
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(
    userId: string,
    data: Omit<DataAccessAuditData, 'type'>,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      eventType: 'data-access',
      data: {
        type: 'data-access',
        ...data,
      },
      ...context,
    });
  }

  /**
   * Query audit logs
   */
  async query(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    return this.backend.query(query);
  }

  /**
   * Get log count
   */
  async count(query?: AuditLogQuery): Promise<number> {
    return this.backend.count(query);
  }

  /**
   * Manually trigger cleanup
   */
  async cleanup(): Promise<number> {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    return this.backend.cleanup(cutoff);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AuditLoggerConfig>): void {
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.logLevel) this.config.logLevel = config.logLevel;
    if (config.includeIpAddress !== undefined) this.config.includeIpAddress = config.includeIpAddress;
    if (config.includeUserAgent !== undefined) this.config.includeUserAgent = config.includeUserAgent;
    if (config.sanitizeData !== undefined) this.config.sanitizeData = config.sanitizeData;
    if (config.retentionDays !== undefined) this.config.retentionDays = config.retentionDays;
    if (config.backend) this.backend = config.backend;
    if (config.onSecurityEvent) this.onSecurityEvent = config.onSecurityEvent;
  }

  /**
   * Core logging function
   */
  private async log(params: {
    userId: string;
    eventType: AuditEventType;
    data: AuditEventData;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogEntry | null> {
    if (!this.config.enabled) return null;

    // Check if event should be logged at current log level
    if (!this.shouldLog(params.eventType)) {
      return null;
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      userId: params.userId,
      eventType: params.eventType,
      logLevel: this.config.logLevel,
      data: this.config.sanitizeData ? this.sanitize(params.data) : params.data,
      ...(this.config.includeIpAddress && params.ipAddress && { ipAddress: params.ipAddress }),
      ...(this.config.includeUserAgent && params.userAgent && { userAgent: params.userAgent }),
      ...(params.sessionId && { sessionId: params.sessionId }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    await this.backend.write(entry);
    this.maybeCleanup();

    return entry;
  }

  /**
   * Check if event should be logged at current log level
   */
  private shouldLog(eventType: AuditEventType): boolean {
    const level = this.config.logLevel;

    // Minimal: only security events and errors
    if (level === 'minimal') {
      return eventType === 'security-event' || eventType === 'error';
    }

    // Standard: exclude detailed data access logs
    if (level === 'standard') {
      return eventType !== 'data-access';
    }

    // Detailed: log everything
    return true;
  }

  /**
   * Sanitize sensitive data
   */
  private sanitize(data: AuditEventData): AuditEventData {
    // Deep clone to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields based on event type
    if (sanitized.type === 'request') {
      // Remove message content if present in options
      if (sanitized.options?.messages) {
        sanitized.options.messages = '[REDACTED]';
      }
    }

    if (sanitized.type === 'auth-attempt') {
      // Never log credentials
      if (sanitized.credentials) {
        delete sanitized.credentials;
      }
    }

    if (sanitized.type === 'config-change') {
      // Sanitize sensitive config values
      if (typeof sanitized.newValue === 'string' && this.isSensitive(sanitized.configKey)) {
        sanitized.newValue = '[REDACTED]';
      }
      if (typeof sanitized.oldValue === 'string' && this.isSensitive(sanitized.configKey)) {
        sanitized.oldValue = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Check if config key is sensitive
   */
  private isSensitive(key: string): boolean {
    const sensitivePatterns = ['key', 'secret', 'password', 'token', 'api', 'auth'];
    return sensitivePatterns.some((pattern) => key.toLowerCase().includes(pattern));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Maybe perform cleanup
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;

    this.lastCleanup = now;
    // Fire and forget cleanup
    void this.cleanup();
  }
}

/**
 * Audit context for additional metadata
 */
export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}
