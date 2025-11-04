import type { ContextData } from './ContextProvider';

/**
 * Configuration for context cache
 */
export interface CacheConfig {
  /**
   * Maximum cache size in megabytes
   * @default 10
   */
  maxSizeMB: number;

  /**
   * Time-to-live for cached items in milliseconds
   * @default 30000 (30 seconds)
   */
  ttl: number;

  /**
   * Cache eviction policy
   * - 'lru': Least Recently Used (default)
   * - 'fifo': First In First Out
   * - 'lfu': Least Frequently Used
   * @default 'lru'
   */
  evictionPolicy: 'lru' | 'fifo' | 'lfu';

  /**
   * Enable cache statistics tracking
   * @default true
   */
  enableStats: boolean;

  /**
   * Interval for TTL cleanup in milliseconds
   * @default 5000 (5 seconds)
   */
  cleanupInterval: number;
}

/**
 * Context cache statistics for monitoring and debugging
 */
export interface ContextCacheStats {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Total evictions performed */
  evictions: number;

  /** Current number of items in cache */
  size: number;

  /** Current memory usage in megabytes */
  memoryUsageMB: number;

  /** Cache hit rate (hits / (hits + misses)) */
  hitRate: number;
}

/**
 * Internal cache entry with metadata
 */
interface CacheEntry {
  /** Cached context data */
  data: ContextData;

  /** Timestamp when entry was created */
  createdAt: number;

  /** Timestamp when entry was last accessed */
  lastAccessedAt: number;

  /** Number of times entry has been accessed */
  accessCount: number;

  /** Estimated size in bytes */
  sizeBytes: number;
}

/**
 * Invalidation trigger types
 */
export type InvalidationTrigger =
  | 'manual'
  | 'dom-mutation'
  | 'route-change'
  | 'user-action'
  | 'ttl-expired';

/**
 * Invalidation callback function
 */
export type InvalidationCallback = (trigger: InvalidationTrigger, key?: string) => void;

/**
 * Context cache interface for storing and retrieving context data
 * with intelligent caching, TTL expiration, and LRU eviction
 */
export interface ContextCache {
  /**
   * Get cached context by key
   * @param key Cache key
   * @returns Promise resolving to cached context or null if not found/expired
   */
  get(key: string): Promise<ContextData | null>;

  /**
   * Set context in cache
   * @param key Cache key
   * @param context Context data to cache
   * @returns Promise resolving when set complete
   */
  set(key: string, context: ContextData): Promise<void>;

  /**
   * Invalidate specific cache entry
   * @param key Cache key to invalidate
   * @returns Promise resolving when invalidation complete
   */
  invalidate(key: string): Promise<void>;

  /**
   * Clear entire cache
   * @returns Promise resolving when cache cleared
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   * @returns Current cache statistics
   */
  getStats(): ContextCacheStats;

  /**
   * Check if key exists in cache and is valid
   * @param key Cache key
   * @returns Promise resolving to true if key exists and valid
   */
  has(key: string): Promise<boolean>;

  /**
   * Subscribe to invalidation events
   * @param callback Function to call on invalidation
   * @returns Unsubscribe function
   */
  onInvalidate(callback: InvalidationCallback): () => void;

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void;
}

/**
 * Default context cache configuration
 */
export const DEFAULT_CONTEXT_CACHE_CONFIG: CacheConfig = {
  maxSizeMB: 10,
  ttl: 30000, // 30 seconds
  evictionPolicy: 'lru',
  enableStats: true,
  cleanupInterval: 5000, // 5 seconds
};

/**
 * In-memory context cache implementation with TTL and LRU eviction
 *
 * Features:
 * - Time-to-live (TTL) expiration with automatic cleanup
 * - LRU/FIFO/LFU eviction when size limit exceeded
 * - Memory usage tracking and limits
 * - Cache hit/miss statistics
 * - DOM mutation, route change, and user action invalidation
 *
 * Performance targets:
 * - Cache hit retrieval: <10ms
 * - Cache set operation: <5ms
 * - TTL cleanup: <5ms
 * - Memory usage: <10MB total
 */
export class MemoryContextCache implements ContextCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private invalidationCallbacks: Set<InvalidationCallback> = new Set();
  private mutationObserver: MutationObserver | null = null;
  private destroyed = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
    this.setupInvalidationListeners();
  }

  /**
   * Get cached context with automatic expiration check
   */
  async get(key: string): Promise<ContextData | null> {
    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    // Check TTL expiration
    const now = Date.now();
    const age = now - entry.createdAt;

    if (age > this.config.ttl) {
      // Expired - remove and return null
      this.cache.delete(key);
      this.notifyInvalidation('ttl-expired', key);
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    // Update access metadata
    entry.lastAccessedAt = now;
    entry.accessCount++;

    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return entry.data;
  }

  /**
   * Set context in cache with automatic eviction if needed
   */
  async set(key: string, context: ContextData): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    const now = Date.now();
    const sizeBytes = this.estimateSize(context);

    // Check if we need to evict
    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    const currentSize = this.calculateTotalSize();

    if (currentSize + sizeBytes > maxSizeBytes) {
      await this.evict(sizeBytes);
    }

    // Create cache entry
    const entry: CacheEntry = {
      data: context,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      sizeBytes,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(key: string): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    const existed = this.cache.delete(key);
    if (existed) {
      this.notifyInvalidation('manual', key);
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    this.cache.clear();
    this.notifyInvalidation('manual');
  }

  /**
   * Get cache statistics
   */
  getStats(): ContextCacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      memoryUsageMB: this.calculateTotalSize() / (1024 * 1024),
      hitRate,
    };
  }

  /**
   * Check if key exists and is valid
   */
  async has(key: string): Promise<boolean> {
    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check TTL
    const age = Date.now() - entry.createdAt;
    if (age > this.config.ttl) {
      this.cache.delete(key);
      this.notifyInvalidation('ttl-expired', key);
      return false;
    }

    return true;
  }

  /**
   * Subscribe to invalidation events
   */
  onInvalidate(callback: InvalidationCallback): () => void {
    this.invalidationCallbacks.add(callback);
    return () => {
      this.invalidationCallbacks.delete(callback);
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.stopCleanupTimer();
    this.teardownInvalidationListeners();
    this.cache.clear();
    this.invalidationCallbacks.clear();
  }

  /**
   * Evict entries to free up space
   */
  private async evict(neededBytes: number): Promise<void> {
    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    const currentSize = this.calculateTotalSize();
    const targetSize = maxSizeBytes - neededBytes;

    // If we don't need to evict, return early
    if (currentSize + neededBytes <= maxSizeBytes) {
      return;
    }

    let freedBytes = 0;

    // Sort entries based on eviction policy
    const entries = Array.from(this.cache.entries());

    switch (this.config.evictionPolicy) {
      case 'lru':
        // Least Recently Used - evict oldest lastAccessedAt
        entries.sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
        break;

      case 'fifo':
        // First In First Out - evict oldest createdAt
        entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
        break;

      case 'lfu':
        // Least Frequently Used - evict lowest accessCount
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
    }

    // Evict until we have enough space
    for (const [key, entry] of entries) {
      const sizeAfterEviction = currentSize - freedBytes - entry.sizeBytes;

      this.cache.delete(key);
      freedBytes += entry.sizeBytes;

      if (this.config.enableStats) {
        this.stats.evictions++;
      }

      // Stop when we've freed enough space
      if (sizeAfterEviction + neededBytes <= maxSizeBytes) {
        break;
      }
    }
  }

  /**
   * Calculate total cache size in bytes
   */
  private calculateTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.sizeBytes;
    }
    return total;
  }

  /**
   * Estimate size of context data in bytes
   */
  private estimateSize(context: ContextData): number {
    try {
      // Rough estimate: JSON string length * 2 (for UTF-16)
      const jsonStr = JSON.stringify(context);
      return jsonStr.length * 2;
    } catch (e) {
      // Fallback to conservative estimate
      return 1024; // 1KB default
    }
  }

  /**
   * Start automatic TTL cleanup timer
   */
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return; // Skip in SSR

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    if (this.destroyed) return;

    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.createdAt;
      if (age > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.notifyInvalidation('ttl-expired', key);
    }
  }

  /**
   * Setup DOM mutation, route change, and user action listeners
   */
  private setupInvalidationListeners(): void {
    if (typeof window === 'undefined') return; // Skip in SSR

    // DOM mutation observer
    this.mutationObserver = new MutationObserver((mutations) => {
      // Debounce mutations - only invalidate if significant changes
      const significantChanges = mutations.some(
        (m) => m.type === 'childList' || (m.type === 'attributes' && m.attributeName !== 'style')
      );

      if (significantChanges) {
        this.handleDOMMutation();
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-*'], // Only watch meaningful attributes
    });

    // Route change listeners
    window.addEventListener('popstate', this.handleRouteChange);
    window.addEventListener('hashchange', this.handleRouteChange);

    // Intercept pushState and replaceState
    this.interceptHistoryAPI();

    // User action listeners (clicks, inputs, scrolls)
    window.addEventListener('click', this.handleUserAction);
    window.addEventListener('input', this.handleUserAction);
    window.addEventListener('scroll', this.handleScrollAction, { passive: true });
  }

  /**
   * Teardown invalidation listeners
   */
  private teardownInvalidationListeners(): void {
    if (typeof window === 'undefined') return;

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    window.removeEventListener('popstate', this.handleRouteChange);
    window.removeEventListener('hashchange', this.handleRouteChange);
    window.removeEventListener('click', this.handleUserAction);
    window.removeEventListener('input', this.handleUserAction);
    window.removeEventListener('scroll', this.handleScrollAction);
  }

  /**
   * Handle DOM mutations
   */
  private handleDOMMutation = (): void => {
    // Invalidate DOM-related contexts
    this.invalidateDOMContexts();
    this.notifyInvalidation('dom-mutation');
  };

  /**
   * Handle route changes
   */
  private handleRouteChange = (): void => {
    // Route changes invalidate most contexts
    this.cache.clear();
    this.notifyInvalidation('route-change');
  };

  /**
   * Handle user actions
   */
  private handleUserAction = (): void => {
    // Debounce user actions - invalidate contexts selectively
    this.invalidateUserActionContexts();
    this.notifyInvalidation('user-action');
  };

  /**
   * Handle scroll actions (debounced)
   */
  private scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  private handleScrollAction = (): void => {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.invalidateViewportContexts();
      this.notifyInvalidation('user-action');
    }, 150); // Debounce scroll events
  };

  /**
   * Invalidate DOM-related contexts
   */
  private invalidateDOMContexts(): void {
    for (const key of this.cache.keys()) {
      if (key.includes('dom') || key.includes('form')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate user action related contexts
   */
  private invalidateUserActionContexts(): void {
    for (const key of this.cache.keys()) {
      if (key.includes('user-action') || key.includes('form')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate viewport related contexts
   */
  private invalidateViewportContexts(): void {
    for (const key of this.cache.keys()) {
      if (key.includes('viewport') || key.includes('scroll')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Intercept History API for SPA route changes
   */
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

  private interceptHistoryAPI(): void {
    if (typeof window === 'undefined') return;

    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.originalPushState!.apply(history, args);
      this.handleRouteChange();
    };

    history.replaceState = (...args) => {
      this.originalReplaceState!.apply(history, args);
      this.handleRouteChange();
    };
  }

  /**
   * Notify invalidation callbacks
   */
  private notifyInvalidation(trigger: InvalidationTrigger, key?: string): void {
    for (const callback of this.invalidationCallbacks) {
      try {
        callback(trigger, key);
      } catch (e) {
        console.error('Error in invalidation callback:', e);
      }
    }
  }
}
