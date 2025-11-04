/**
 * Performance monitoring for cache and API operations
 *
 * Tracks metrics including latency, throughput, cache hit rates,
 * and token usage to enable performance optimization.
 */

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Cache metrics */
  cache: {
    /** Cache hit rate (0-1) */
    hitRate: number;
    /** Total cache hits */
    hits: number;
    /** Total cache misses */
    misses: number;
    /** Average cache response time in ms */
    avgResponseTime: number;
  };

  /** API metrics */
  api: {
    /** Total API requests */
    totalRequests: number;
    /** Average API latency in ms */
    avgLatency: number;
    /** Min API latency in ms */
    minLatency: number;
    /** Max API latency in ms */
    maxLatency: number;
    /** Request rate (requests/second) */
    requestRate: number;
  };

  /** Token usage metrics */
  tokens: {
    /** Total tokens used */
    totalTokens: number;
    /** Tokens saved by caching */
    savedTokens: number;
    /** Token savings rate (0-1) */
    savingsRate: number;
    /** Average tokens per request */
    avgTokensPerRequest: number;
  };

  /** Time window metrics are calculated over */
  timeWindowMs: number;
}

/**
 * Operation record for metrics calculation
 */
interface OperationRecord {
  /** Operation timestamp */
  timestamp: number;
  /** Operation duration in ms */
  duration: number;
  /** Whether operation hit cache */
  cacheHit?: boolean;
  /** Tokens used in operation */
  tokens?: number;
}

/**
 * Performance monitor configuration
 */
export interface PerformanceMonitorConfig {
  /** Time window for metrics calculation in ms */
  timeWindowMs?: number;
  /** Maximum operations to track */
  maxOperations?: number;
  /** Enable detailed tracking */
  enableDetailedTracking?: boolean;
}

/**
 * Default performance monitor configuration
 */
export const DEFAULT_MONITOR_CONFIG: Required<PerformanceMonitorConfig> = {
  timeWindowMs: 300000,      // 5 minutes
  maxOperations: 10000,
  enableDetailedTracking: true,
};

/**
 * Performance monitor
 *
 * Tracks and analyzes performance metrics for cache and API operations.
 *
 * Features:
 * - Cache hit rate tracking
 * - API latency monitoring
 * - Token usage analysis
 * - Rolling time window metrics
 * - Percentile calculations
 *
 * Usage:
 * ```ts
 * const monitor = new PerformanceMonitor({
 *   timeWindowMs: 300000, // 5 minutes
 * });
 *
 * // Track cache operation
 * const start = Date.now();
 * const data = await cache.get('key');
 * monitor.recordCacheOperation(Date.now() - start, data !== null);
 *
 * // Track API operation
 * const apiStart = Date.now();
 * const response = await api.call();
 * monitor.recordAPIOperation(Date.now() - apiStart, response.tokens);
 *
 * // Get metrics
 * const metrics = monitor.getMetrics();
 * console.log(`Cache hit rate: ${metrics.cache.hitRate * 100}%`);
 * console.log(`Token savings: ${metrics.tokens.savingsRate * 100}%`);
 * ```
 */
export class PerformanceMonitor {
  private config: Required<PerformanceMonitorConfig>;
  private operations: OperationRecord[] = [];
  private startTime = Date.now();

  constructor(config: PerformanceMonitorConfig = {}) {
    this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
  }

  /**
   * Record a cache operation
   */
  recordCacheOperation(duration: number, cacheHit: boolean): void {
    this.recordOperation({
      timestamp: Date.now(),
      duration,
      cacheHit,
    });
  }

  /**
   * Record an API operation
   */
  recordAPIOperation(duration: number, tokens?: number): void {
    this.recordOperation({
      timestamp: Date.now(),
      duration,
      cacheHit: false,
      tokens,
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.cleanup();

    const now = Date.now();
    const windowStart = now - this.config.timeWindowMs;
    const windowOps = this.operations.filter(op => op.timestamp >= windowStart);

    // Calculate cache metrics
    const cacheOps = windowOps.filter(op => op.cacheHit !== undefined);
    const cacheHits = cacheOps.filter(op => op.cacheHit).length;
    const cacheMisses = cacheOps.filter(op => !op.cacheHit).length;
    const cacheHitRate = cacheOps.length > 0 ? cacheHits / cacheOps.length : 0;
    const avgCacheResponseTime =
      cacheOps.length > 0
        ? cacheOps.reduce((sum, op) => sum + op.duration, 0) / cacheOps.length
        : 0;

    // Calculate API metrics
    const apiOps = windowOps.filter(op => !op.cacheHit);
    const apiLatencies = apiOps.map(op => op.duration);
    const avgApiLatency =
      apiLatencies.length > 0
        ? apiLatencies.reduce((sum, lat) => sum + lat, 0) / apiLatencies.length
        : 0;
    const minApiLatency = apiLatencies.length > 0 ? Math.min(...apiLatencies) : 0;
    const maxApiLatency = apiLatencies.length > 0 ? Math.max(...apiLatencies) : 0;
    const requestRate = (apiOps.length / this.config.timeWindowMs) * 1000; // per second

    // Calculate token metrics
    const tokenOps = windowOps.filter(op => op.tokens !== undefined);
    const totalTokens = tokenOps.reduce((sum, op) => sum + (op.tokens || 0), 0);
    const cachedTokenOps = tokenOps.filter(op => op.cacheHit);
    const savedTokens = cachedTokenOps.reduce((sum, op) => sum + (op.tokens || 0), 0);
    const tokenSavingsRate = totalTokens > 0 ? savedTokens / (totalTokens + savedTokens) : 0;
    const avgTokensPerRequest =
      tokenOps.length > 0 ? totalTokens / tokenOps.length : 0;

    return {
      cache: {
        hitRate: cacheHitRate,
        hits: cacheHits,
        misses: cacheMisses,
        avgResponseTime: Math.round(avgCacheResponseTime),
      },
      api: {
        totalRequests: apiOps.length,
        avgLatency: Math.round(avgApiLatency),
        minLatency: Math.round(minApiLatency),
        maxLatency: Math.round(maxApiLatency),
        requestRate: Math.round(requestRate * 100) / 100,
      },
      tokens: {
        totalTokens,
        savedTokens,
        savingsRate: Math.round(tokenSavingsRate * 100) / 100,
        avgTokensPerRequest: Math.round(avgTokensPerRequest),
      },
      timeWindowMs: this.config.timeWindowMs,
    };
  }

  /**
   * Get percentile latency value
   */
  getPercentile(percentile: number): number {
    this.cleanup();

    const now = Date.now();
    const windowStart = now - this.config.timeWindowMs;
    const latencies = this.operations
      .filter(op => op.timestamp >= windowStart && !op.cacheHit)
      .map(op => op.duration)
      .sort((a, b) => a - b);

    if (latencies.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * latencies.length) - 1;
    return Math.round(latencies[Math.max(0, index)]);
  }

  /**
   * Get p50, p95, p99 latencies
   */
  getPercentiles(): { p50: number; p95: number; p99: number } {
    return {
      p50: this.getPercentile(50),
      p95: this.getPercentile(95),
      p99: this.getPercentile(99),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.operations = [];
    this.startTime = Date.now();
  }

  /**
   * Get total uptime in ms
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Record an operation
   */
  private recordOperation(record: OperationRecord): void {
    this.operations.push(record);

    // Limit operation history
    if (this.operations.length > this.config.maxOperations) {
      this.operations = this.operations.slice(-this.config.maxOperations);
    }
  }

  /**
   * Remove operations outside time window
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.timeWindowMs;
    this.operations = this.operations.filter(op => op.timestamp >= windowStart);
  }
}
