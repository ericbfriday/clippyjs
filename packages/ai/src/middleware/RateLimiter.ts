/**
 * Rate limiting middleware for AI operations
 *
 * Implements per-user and per-session rate limiting using sliding window algorithm.
 * Supports request count limits and token usage limits with flexible time windows.
 */

/**
 * Rate limit window configuration
 */
export interface RateWindow {
  /** Window duration in milliseconds */
  durationMs: number;
  /** Maximum requests allowed in window */
  maxRequests?: number;
  /** Maximum tokens allowed in window */
  maxTokens?: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Enable rate limiting */
  enabled?: boolean;
  /** Per-minute limits */
  perMinute?: RateWindow;
  /** Per-hour limits */
  perHour?: RateWindow;
  /** Per-day limits */
  perDay?: RateWindow;
  /** Callback when limit is exceeded */
  onLimitExceeded?: (userId: string, windowName: string, stats: RateLimitStats) => void;
  /** Custom identifier function */
  getIdentifier?: (context: unknown) => string;
}

/**
 * Default rate limiter configuration
 */
export const DEFAULT_RATE_LIMITER_CONFIG: Required<Omit<RateLimiterConfig, 'onLimitExceeded' | 'getIdentifier'>> = {
  enabled: true,
  perMinute: {
    durationMs: 60 * 1000,
    maxRequests: 10,
    maxTokens: 10000,
  },
  perHour: {
    durationMs: 60 * 60 * 1000,
    maxRequests: 100,
    maxTokens: 100000,
  },
  perDay: {
    durationMs: 24 * 60 * 60 * 1000,
    maxRequests: 1000,
    maxTokens: 1000000,
  },
};

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  /** Window name (perMinute, perHour, perDay) */
  window: string;
  /** Current request count in window */
  requestCount: number;
  /** Current token count in window */
  tokenCount: number;
  /** Maximum requests allowed */
  maxRequests?: number;
  /** Maximum tokens allowed */
  maxTokens?: number;
  /** Timestamp when limit resets (ms since epoch) */
  resetsAt: number;
  /** Milliseconds until reset */
  resetsIn: number;
  /** Whether limit is exceeded */
  isExceeded: boolean;
}

/**
 * Request entry for tracking
 */
interface RequestEntry {
  timestamp: number;
  tokens: number;
}

/**
 * Rate limiter
 *
 * Implements sliding window rate limiting for AI operations.
 *
 * Features:
 * - Per-user and per-session rate limiting
 * - Multiple time windows (minute/hour/day)
 * - Request count and token usage limits
 * - Automatic cleanup of old entries
 * - Custom identifier support
 *
 * Usage:
 * ```ts
 * const limiter = new RateLimiter({
 *   perMinute: { durationMs: 60000, maxRequests: 10, maxTokens: 10000 },
 *   onLimitExceeded: (userId, window, stats) => {
 *     console.warn(`User ${userId} exceeded ${window} limit`);
 *   }
 * });
 *
 * // Check limits before request
 * const check = limiter.checkLimit('user-123');
 * if (!check.allowed) {
 *   throw new Error(`Rate limit exceeded. Resets in ${check.minResetsIn}ms`);
 * }
 *
 * // Record request after completion
 * limiter.recordRequest('user-123', { tokens: 500 });
 *
 * // Get usage stats
 * const stats = limiter.getStats('user-123');
 * ```
 */
export class RateLimiter {
  private config: Required<Omit<RateLimiterConfig, 'onLimitExceeded' | 'getIdentifier'>>;
  private onLimitExceeded?: (userId: string, windowName: string, stats: RateLimitStats) => void;
  private getIdentifier?: (context: unknown) => string;
  private requestHistory = new Map<string, RequestEntry[]>();
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 60000; // Clean up every minute

  constructor(config: RateLimiterConfig = {}) {
    this.config = {
      enabled: config.enabled ?? DEFAULT_RATE_LIMITER_CONFIG.enabled,
      perMinute: config.perMinute ?? DEFAULT_RATE_LIMITER_CONFIG.perMinute,
      perHour: config.perHour ?? DEFAULT_RATE_LIMITER_CONFIG.perHour,
      perDay: config.perDay ?? DEFAULT_RATE_LIMITER_CONFIG.perDay,
    };
    this.onLimitExceeded = config.onLimitExceeded;
    this.getIdentifier = config.getIdentifier;
  }

  /**
   * Check if request is allowed
   */
  checkLimit(identifier: string, context?: unknown): {
    allowed: boolean;
    stats: RateLimitStats[];
    minResetsIn?: number;
    exceededWindow?: string;
  } {
    if (!this.config.enabled) {
      return { allowed: true, stats: [] };
    }

    const id = this.getIdentifier ? this.getIdentifier(context) : identifier;
    this.maybeCleanup();

    const stats = this.calculateStats(id);
    const exceeded = stats.find((s) => s.isExceeded);

    if (exceeded && this.onLimitExceeded) {
      this.onLimitExceeded(id, exceeded.window, exceeded);
    }

    return {
      allowed: !exceeded,
      stats,
      minResetsIn: exceeded?.resetsIn,
      exceededWindow: exceeded?.window,
    };
  }

  /**
   * Record a completed request
   */
  recordRequest(identifier: string, options: { tokens?: number; context?: unknown } = {}): void {
    if (!this.config.enabled) return;

    const id = this.getIdentifier ? this.getIdentifier(options.context) : identifier;
    const entry: RequestEntry = {
      timestamp: Date.now(),
      tokens: options.tokens ?? 0,
    };

    const history = this.requestHistory.get(id) || [];
    history.push(entry);
    this.requestHistory.set(id, history);
  }

  /**
   * Get current usage statistics
   */
  getStats(identifier: string, context?: unknown): RateLimitStats[] {
    const id = this.getIdentifier ? this.getIdentifier(context) : identifier;
    return this.calculateStats(id);
  }

  /**
   * Reset limits for identifier
   */
  reset(identifier: string): void {
    this.requestHistory.delete(identifier);
  }

  /**
   * Reset all limits
   */
  resetAll(): void {
    this.requestHistory.clear();
  }

  /**
   * Get all tracked identifiers
   */
  getTrackedIdentifiers(): string[] {
    return Array.from(this.requestHistory.keys());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RateLimiterConfig>): void {
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.perMinute) this.config.perMinute = config.perMinute;
    if (config.perHour) this.config.perHour = config.perHour;
    if (config.perDay) this.config.perDay = config.perDay;
    if (config.onLimitExceeded) this.onLimitExceeded = config.onLimitExceeded;
    if (config.getIdentifier) this.getIdentifier = config.getIdentifier;
  }

  /**
   * Calculate statistics for all windows
   */
  private calculateStats(identifier: string): RateLimitStats[] {
    const now = Date.now();
    const history = this.requestHistory.get(identifier) || [];

    const windows = [
      { name: 'perMinute', config: this.config.perMinute },
      { name: 'perHour', config: this.config.perHour },
      { name: 'perDay', config: this.config.perDay },
    ];

    return windows.map(({ name, config }) => {
      const windowStart = now - config.durationMs;
      const recentEntries = history.filter((e) => e.timestamp > windowStart);

      const requestCount = recentEntries.length;
      const tokenCount = recentEntries.reduce((sum, e) => sum + e.tokens, 0);

      const oldestEntry = recentEntries[0];
      const resetsAt = oldestEntry ? oldestEntry.timestamp + config.durationMs : now;
      const resetsIn = Math.max(0, resetsAt - now);

      const requestExceeded = config.maxRequests !== undefined && requestCount >= config.maxRequests;
      const tokenExceeded = config.maxTokens !== undefined && tokenCount >= config.maxTokens;

      return {
        window: name,
        requestCount,
        tokenCount,
        maxRequests: config.maxRequests,
        maxTokens: config.maxTokens,
        resetsAt,
        resetsIn,
        isExceeded: requestExceeded || tokenExceeded,
      };
    });
  }

  /**
   * Clean up old entries periodically
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;

    this.lastCleanup = now;
    const maxWindow = Math.max(
      this.config.perMinute.durationMs,
      this.config.perHour.durationMs,
      this.config.perDay.durationMs
    );

    for (const [id, history] of this.requestHistory.entries()) {
      const cutoff = now - maxWindow;
      const filtered = history.filter((e) => e.timestamp > cutoff);

      if (filtered.length === 0) {
        this.requestHistory.delete(id);
      } else if (filtered.length < history.length) {
        this.requestHistory.set(id, filtered);
      }
    }
  }
}
