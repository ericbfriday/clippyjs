/**
 * Request deduplication for concurrent identical requests
 *
 * Prevents duplicate in-flight requests by coalescing concurrent requests
 * for the same resource, improving performance and reducing API costs.
 */

/**
 * Pending request entry
 */
interface PendingRequest<T = unknown> {
  /** Promise resolver for all waiting requests */
  promise: Promise<T>;
  /** Number of requests waiting */
  waiters: number;
  /** Request start timestamp */
  startedAt: number;
}

/**
 * Deduplication statistics
 */
export interface DeduplicationStats {
  /** Total requests processed */
  totalRequests: number;
  /** Requests that were deduplicated */
  deduplicatedRequests: number;
  /** Unique requests executed */
  uniqueRequests: number;
  /** Deduplication rate (0-1) */
  deduplicationRate: number;
  /** Current pending requests */
  pendingCount: number;
}

/**
 * Request deduplicator configuration
 */
export interface RequestDeduplicatorConfig {
  /** Enable statistics tracking */
  enableStats?: boolean;
  /** Timeout for pending requests in ms */
  timeout?: number;
}

/**
 * Default deduplicator configuration
 */
export const DEFAULT_DEDUPLICATOR_CONFIG: Required<RequestDeduplicatorConfig> = {
  enableStats: true,
  timeout: 30000, // 30 seconds
};

/**
 * Request deduplicator
 *
 * Coalesces concurrent requests for the same resource to prevent
 * duplicate API calls and improve performance.
 *
 * Features:
 * - Automatic request coalescing
 * - Promise-based result sharing
 * - Timeout handling
 * - Statistics tracking
 * - Automatic cleanup
 *
 * Usage:
 * ```ts
 * const deduplicator = new RequestDeduplicator();
 *
 * // Multiple concurrent requests for same key
 * const results = await Promise.all([
 *   deduplicator.deduplicate('query:123', () => fetchData('123')),
 *   deduplicator.deduplicate('query:123', () => fetchData('123')),
 *   deduplicator.deduplicate('query:123', () => fetchData('123')),
 * ]);
 * // Only one fetchData() call executed, all promises resolved with same result
 *
 * // Get statistics
 * const stats = deduplicator.getStats();
 * console.log(`Deduplication rate: ${stats.deduplicationRate * 100}%`);
 * ```
 */
export class RequestDeduplicator {
  private pending = new Map<string, PendingRequest>();
  private config: Required<RequestDeduplicatorConfig>;
  private stats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    uniqueRequests: 0,
  };

  constructor(config: RequestDeduplicatorConfig = {}) {
    this.config = { ...DEFAULT_DEDUPLICATOR_CONFIG, ...config };
  }

  /**
   * Deduplicate a request by key
   *
   * If another request with the same key is in flight, this will wait
   * for that request to complete and return its result. Otherwise, it
   * will execute the provided function.
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.config.enableStats) {
      this.stats.totalRequests++;
    }

    // Check if request is already in flight
    const existing = this.pending.get(key);
    if (existing) {
      // Increment waiter count
      existing.waiters++;
      if (this.config.enableStats) {
        this.stats.deduplicatedRequests++;
      }

      // Wait for existing request
      return existing.promise as Promise<T>;
    }

    // Track unique request
    if (this.config.enableStats) {
      this.stats.uniqueRequests++;
    }

    // Create new request with timeout
    const promise = this.executeWithTimeout(fn, this.config.timeout);

    // Store pending request
    const pending: PendingRequest<T> = {
      promise,
      waiters: 1,
      startedAt: Date.now(),
    };
    this.pending.set(key, pending);

    try {
      // Execute request
      const result = await promise;
      return result;
    } finally {
      // Cleanup pending request
      this.pending.delete(key);
    }
  }

  /**
   * Check if request is currently in flight
   */
  isPending(key: string): boolean {
    return this.pending.has(key);
  }

  /**
   * Get number of waiters for a pending request
   */
  getWaiters(key: string): number {
    const pending = this.pending.get(key);
    return pending ? pending.waiters : 0;
  }

  /**
   * Get all pending request keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.pending.keys());
  }

  /**
   * Get deduplication statistics
   */
  getStats(): DeduplicationStats {
    const deduplicationRate =
      this.stats.totalRequests > 0
        ? this.stats.deduplicatedRequests / this.stats.totalRequests
        : 0;

    return {
      totalRequests: this.stats.totalRequests,
      deduplicatedRequests: this.stats.deduplicatedRequests,
      uniqueRequests: this.stats.uniqueRequests,
      deduplicationRate,
      pendingCount: this.pending.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      uniqueRequests: 0,
    };
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pending.clear();
    this.resetStats();
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Execute function
      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}
