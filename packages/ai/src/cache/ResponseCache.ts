/**
 * Response caching system with TTL and LRU eviction
 *
 * Provides intelligent caching to reduce latency and token usage through
 * time-based expiration (TTL) and size-based eviction (LRU).
 */

/**
 * Cache entry with value and metadata
 */
interface CacheEntry<T = unknown> {
  /** Cached value */
  value: T;
  /** Expiration timestamp (ms since epoch) */
  expiresAt: number;
  /** Last access timestamp for LRU */
  lastAccessed: number;
  /** Creation timestamp */
  createdAt: number;
  /** Size in bytes (approximate) */
  size: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number;
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Number of cache entries */
  entryCount: number;
  /** Number of evictions */
  evictions: number;
  /** Number of expirations */
  expirations: number;
}

/**
 * Cache configuration
 */
export interface ResponseCacheConfig {
  /** Maximum cache size in MB */
  maxSizeMB?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Enable automatic cleanup of expired entries */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval?: number;
  /** Enable cache statistics tracking */
  enableStats?: boolean;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: Required<ResponseCacheConfig> = {
  maxSizeMB: 50,              // 50MB default
  defaultTTL: 3600000,        // 1 hour
  autoCleanup: true,
  cleanupInterval: 60000,     // 1 minute
  enableStats: true,
};

/**
 * Response cache with TTL and LRU eviction
 *
 * Features:
 * - Time-based expiration (TTL)
 * - Size-based eviction (LRU)
 * - Pattern-based invalidation
 * - Comprehensive statistics
 * - Automatic cleanup
 *
 * Usage:
 * ```ts
 * const cache = new ResponseCache({
 *   maxSizeMB: 100,
 *   defaultTTL: 3600000, // 1 hour
 * });
 *
 * // Store response
 * await cache.set('query:12345', response, 1800000); // 30 minutes
 *
 * // Retrieve response
 * const cached = await cache.get('query:12345');
 *
 * // Invalidate by pattern
 * await cache.invalidate('query:*');
 *
 * // Get statistics
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${stats.hitRate * 100}%`);
 * ```
 */
export class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private config: Required<ResponseCacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private totalSize = 0; // Total size in bytes

  constructor(config: ResponseCacheConfig = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };

    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Get value from cache
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    // Check expiration
    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.cache.delete(key);
      this.totalSize -= entry.size;
      if (this.config.enableStats) {
        this.stats.misses++;
        this.stats.expirations++;
      }
      return null;
    }

    // Update last accessed for LRU
    entry.lastAccessed = now;

    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const effectiveTTL = ttl ?? this.config.defaultTTL;
    const size = this.estimateSize(value);

    // Check if we need to evict entries
    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    await this.ensureCapacity(size, maxSizeBytes);

    // Create entry
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + effectiveTTL,
      lastAccessed: now,
      createdAt: now,
      size,
    };

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.totalSize -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.totalSize += size;
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Delete specific key
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
    }
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching pattern
   *
   * Supports glob-like patterns:
   * - `user:*` - all keys starting with "user:"
   * - `*:123` - all keys ending with ":123"
   * - `*query*` - all keys containing "query"
   */
  async invalidate(pattern: string): Promise<number> {
    const regex = this.patternToRegex(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const entry = this.cache.get(key);
        if (entry) {
          this.totalSize -= entry.size;
        }
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.totalSize = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      size: this.totalSize,
      maxSize: this.config.maxSizeMB * 1024 * 1024,
      entryCount: this.cache.size,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in bytes
   */
  size(): number {
    return this.totalSize;
  }

  /**
   * Dispose cache and cleanup resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.totalSize = 0;
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(requiredSize: number, maxSize: number): Promise<void> {
    // If new entry fits, no eviction needed
    if (this.totalSize + requiredSize <= maxSize) {
      return;
    }

    // Evict least recently used entries until we have space
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    for (const { key, entry } of entries) {
      if (this.totalSize + requiredSize <= maxSize) {
        break;
      }

      this.cache.delete(key);
      this.totalSize -= entry.size;
      if (this.config.enableStats) {
        this.stats.evictions++;
      }
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        this.totalSize -= entry.size;
        cleanedCount++;
        if (this.config.enableStats) {
          this.stats.expirations++;
        }
      }
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: unknown): number {
    try {
      // Rough estimation based on JSON serialization
      const json = JSON.stringify(value);
      return new Blob([json]).size;
    } catch {
      // Fallback for non-serializable values
      return 1024; // 1KB default
    }
  }

  /**
   * Convert glob pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Convert * to .*
    const regexPattern = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }
}
