/**
 * Persistent Context Cache
 *
 * Two-tier caching system with:
 * - Memory tier (hot): Fast access for frequently used contexts
 * - IndexedDB tier (cold): Persistent storage for less frequently used
 * - Automatic promotion/demotion between tiers
 * - TTL management across both tiers
 * - Cold start optimization
 *
 * Performance targets:
 * - Memory hit: <10ms (p95)
 * - IndexedDB hit: <100ms (p95)
 * - Cold start: 60-80% faster than memory-only
 */

import type { ContextData } from '../context/ContextProvider';
import type {
  ContextCache,
  ContextCacheStats,
  CacheConfig,
  InvalidationTrigger,
  InvalidationCallback,
} from '../context/ContextCache';
import { DEFAULT_CONTEXT_CACHE_CONFIG } from '../context/ContextCache';
import { IndexedDBStorage, isIndexedDBSupported } from './IndexedDBStorage';

/**
 * Two-tier cache configuration
 */
export interface TwoTierCacheConfig extends CacheConfig {
  /**
   * Memory tier size limit in MB
   * @default 5
   */
  memoryTierSizeMB: number;

  /**
   * IndexedDB tier size limit in MB
   * @default 50
   */
  persistentTierSizeMB: number;

  /**
   * Promotion threshold: access count to promote to memory
   * @default 3
   */
  promotionThreshold: number;

  /**
   * Demotion threshold: time since last access (ms) to demote to persistent
   * @default 60000 (1 minute)
   */
  demotionThreshold: number;

  /**
   * Enable cold start optimization (preload frequently used)
   * @default true
   */
  enableColdStartOptimization: boolean;

  /**
   * Number of items to preload on cold start
   * @default 10
   */
  coldStartPreloadCount: number;
}

/**
 * Cache entry with tier metadata
 */
interface TierCacheEntry {
  data: ContextData;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  sizeBytes: number;
  tier: 'memory' | 'persistent';
}

/**
 * Default two-tier cache configuration
 */
export const DEFAULT_TWO_TIER_CONFIG: TwoTierCacheConfig = {
  ...DEFAULT_CONTEXT_CACHE_CONFIG,
  memoryTierSizeMB: 5,
  persistentTierSizeMB: 50,
  promotionThreshold: 3,
  demotionThreshold: 60000,
  enableColdStartOptimization: true,
  coldStartPreloadCount: 10,
};

/**
 * Two-tier persistent context cache
 *
 * Features:
 * - Memory tier for hot data (fast access)
 * - IndexedDB tier for cold data (persistent)
 * - Automatic promotion/demotion based on access patterns
 * - TTL management across both tiers
 * - Cold start optimization (preload frequently used)
 * - Backward compatible with ContextCache interface
 *
 * Flow:
 * 1. New items start in memory tier
 * 2. Frequently accessed items stay in memory
 * 3. Infrequently accessed items demoted to persistent tier
 * 4. Items accessed in persistent tier promoted back to memory
 * 5. On cold start, preload most frequently accessed items
 *
 * @example
 * ```typescript
 * const cache = new PersistentContextCache({
 *   memoryTierSizeMB: 5,
 *   persistentTierSizeMB: 50,
 * });
 * await cache.initialize();
 *
 * await cache.set('key1', contextData);
 * const data = await cache.get('key1'); // Memory hit
 * ```
 */
export class PersistentContextCache implements ContextCache {
  private config: TwoTierCacheConfig;
  private memoryCache = new Map<string, TierCacheEntry>();
  private persistentStorage: IndexedDBStorage<TierCacheEntry> | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    promotions: 0,
    demotions: 0,
    memoryHits: 0,
    persistentHits: 0,
  };
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private demotionTimer: ReturnType<typeof setInterval> | null = null;
  private invalidationCallbacks: Set<InvalidationCallback> = new Set();
  private initialized = false;
  private destroyed = false;

  constructor(config: Partial<TwoTierCacheConfig> = {}) {
    this.config = { ...DEFAULT_TWO_TIER_CONFIG, ...config };
  }

  /**
   * Initialize cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    // Initialize persistent storage if supported
    if (isIndexedDBSupported()) {
      this.persistentStorage = new IndexedDBStorage<TierCacheEntry>({
        dbName: 'clippy-context-cache',
        storeName: 'contexts',
        version: 1,
      });

      await this.persistentStorage.initialize();

      // Cold start optimization
      if (this.config.enableColdStartOptimization) {
        await this.coldStartPreload();
      }
    } else {
      console.warn('IndexedDB not supported. Using memory-only cache.');
    }

    this.initialized = true;
    this.startCleanupTimer();
    this.startDemotionTimer();
  }

  /**
   * Get cached context
   */
  async get(key: string): Promise<ContextData | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    const now = Date.now();

    // Try memory tier first
    const memoryEntry = this.memoryCache.get(key);

    if (memoryEntry) {
      // Check TTL
      if (this.isExpired(memoryEntry, now)) {
        this.memoryCache.delete(key);
        this.notifyInvalidation('ttl-expired', key);
        this.stats.misses++;
        return null;
      }

      // Update access metadata
      memoryEntry.lastAccessedAt = now;
      memoryEntry.accessCount++;

      this.stats.hits++;
      this.stats.memoryHits++;

      return memoryEntry.data;
    }

    // Try persistent tier
    if (this.persistentStorage) {
      const persistentEntry = await this.persistentStorage.get(key);

      if (persistentEntry) {
        // Check TTL
        if (this.isExpired(persistentEntry, now)) {
          await this.persistentStorage.delete(key);
          this.notifyInvalidation('ttl-expired', key);
          this.stats.misses++;
          return null;
        }

        // Update access metadata
        persistentEntry.lastAccessedAt = now;
        persistentEntry.accessCount++;

        // Consider promotion to memory tier
        if (persistentEntry.accessCount >= this.config.promotionThreshold) {
          await this.promoteToMemory(key, persistentEntry);
        } else {
          // Update in persistent storage
          await this.persistentStorage.set(key, persistentEntry);
        }

        this.stats.hits++;
        this.stats.persistentHits++;

        return persistentEntry.data;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set context in cache
   */
  async set(key: string, context: ContextData): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    const now = Date.now();
    const sizeBytes = this.estimateSize(context);

    // Create cache entry (starts in memory tier)
    const entry: TierCacheEntry = {
      data: context,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      sizeBytes,
      tier: 'memory',
    };

    // Check if we need to evict from memory
    const memoryMaxBytes = this.config.memoryTierSizeMB * 1024 * 1024;
    const currentMemorySize = this.calculateMemorySize();

    if (currentMemorySize + sizeBytes > memoryMaxBytes) {
      await this.evictFromMemory(sizeBytes);
    }

    this.memoryCache.set(key, entry);
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(key: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    // Remove from both tiers
    const memoryDeleted = this.memoryCache.delete(key);
    let persistentDeleted = false;

    if (this.persistentStorage) {
      persistentDeleted = await this.persistentStorage.has(key);
      if (persistentDeleted) {
        await this.persistentStorage.delete(key);
      }
    }

    if (memoryDeleted || persistentDeleted) {
      this.notifyInvalidation('manual', key);
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    this.memoryCache.clear();

    if (this.persistentStorage) {
      await this.persistentStorage.clear();
    }

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
      size: this.memoryCache.size,
      memoryUsageMB: this.calculateMemorySize() / (1024 * 1024),
      hitRate,
    };
  }

  /**
   * Check if key exists and is valid
   */
  async has(key: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.destroyed) {
      throw new Error('Cache has been destroyed');
    }

    const now = Date.now();

    // Check memory tier
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry, now)) {
      return true;
    }

    // Check persistent tier
    if (this.persistentStorage) {
      const persistentEntry = await this.persistentStorage.get(key);
      if (persistentEntry && !this.isExpired(persistentEntry, now)) {
        return true;
      }
    }

    return false;
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
    this.stopDemotionTimer();
    this.memoryCache.clear();
    this.invalidationCallbacks.clear();

    if (this.persistentStorage) {
      this.persistentStorage.destroy();
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: TierCacheEntry, now: number): boolean {
    const age = now - entry.createdAt;
    return age > this.config.ttl;
  }

  /**
   * Promote entry from persistent to memory tier
   */
  private async promoteToMemory(key: string, entry: TierCacheEntry): Promise<void> {
    // Check if we need to evict from memory
    const memoryMaxBytes = this.config.memoryTierSizeMB * 1024 * 1024;
    const currentMemorySize = this.calculateMemorySize();

    if (currentMemorySize + entry.sizeBytes > memoryMaxBytes) {
      await this.evictFromMemory(entry.sizeBytes);
    }

    // Move to memory
    entry.tier = 'memory';
    this.memoryCache.set(key, entry);

    // Remove from persistent
    if (this.persistentStorage) {
      await this.persistentStorage.delete(key);
    }

    this.stats.promotions++;
  }

  /**
   * Demote entry from memory to persistent tier
   */
  private async demoteToPersistent(key: string, entry: TierCacheEntry): Promise<void> {
    if (!this.persistentStorage) return;

    // Move to persistent
    entry.tier = 'persistent';
    await this.persistentStorage.set(key, entry);

    // Remove from memory
    this.memoryCache.delete(key);

    this.stats.demotions++;
  }

  /**
   * Evict entries from memory tier
   */
  private async evictFromMemory(neededBytes: number): Promise<void> {
    const memoryMaxBytes = this.config.memoryTierSizeMB * 1024 * 1024;
    const currentSize = this.calculateMemorySize();
    const targetSize = memoryMaxBytes - neededBytes;

    if (currentSize + neededBytes <= memoryMaxBytes) {
      return;
    }

    let freedBytes = 0;

    // Sort entries based on eviction policy
    const entries = Array.from(this.memoryCache.entries());

    switch (this.config.evictionPolicy) {
      case 'lru':
        entries.sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
        break;
      case 'fifo':
        entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
        break;
      case 'lfu':
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
    }

    // Evict until we have enough space
    for (const [key, entry] of entries) {
      // Try to demote to persistent tier instead of deleting
      if (this.persistentStorage) {
        await this.demoteToPersistent(key, entry);
      } else {
        this.memoryCache.delete(key);
      }

      freedBytes += entry.sizeBytes;
      this.stats.evictions++;

      if (currentSize - freedBytes + neededBytes <= memoryMaxBytes) {
        break;
      }
    }
  }

  /**
   * Calculate total memory tier size
   */
  private calculateMemorySize(): number {
    let total = 0;
    const entries = Array.from(this.memoryCache.values());
    for (const entry of entries) {
      total += entry.sizeBytes;
    }
    return total;
  }

  /**
   * Estimate size of context data
   */
  private estimateSize(context: ContextData): number {
    try {
      const jsonStr = JSON.stringify(context);
      return jsonStr.length * 2; // UTF-16
    } catch (e) {
      return 1024; // 1KB fallback
    }
  }

  /**
   * Cold start preload: load most frequently accessed items
   */
  private async coldStartPreload(): Promise<void> {
    if (!this.persistentStorage) return;

    try {
      const keys = await this.persistentStorage.keys();
      const entries: Array<[string, TierCacheEntry]> = [];

      // Load all entries to find most frequently accessed
      for (const key of keys) {
        const entry = await this.persistentStorage.get(key);
        if (entry) {
          entries.push([key, entry]);
        }
      }

      // Sort by access count
      entries.sort((a, b) => b[1].accessCount - a[1].accessCount);

      // Preload top N items to memory
      const toPreload = entries.slice(0, this.config.coldStartPreloadCount);

      for (const [key, entry] of toPreload) {
        entry.tier = 'memory';
        this.memoryCache.set(key, entry);
      }
    } catch (error) {
      console.error('Cold start preload failed:', error);
    }
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return;

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
   * Start demotion timer
   */
  private startDemotionTimer(): void {
    if (typeof window === 'undefined') return;

    this.demotionTimer = setInterval(() => {
      this.runDemotion();
    }, 30000); // Run every 30 seconds
  }

  /**
   * Stop demotion timer
   */
  private stopDemotionTimer(): void {
    if (this.demotionTimer) {
      clearInterval(this.demotionTimer);
      this.demotionTimer = null;
    }
  }

  /**
   * Remove expired entries from both tiers
   */
  private async cleanupExpired(): Promise<void> {
    if (this.destroyed) return;

    const now = Date.now();
    const expiredKeys: string[] = [];

    // Check memory tier
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry, now)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
      this.notifyInvalidation('ttl-expired', key);
    }

    // Check persistent tier
    if (this.persistentStorage) {
      const keys = await this.persistentStorage.keys();

      for (const key of keys) {
        const entry = await this.persistentStorage.get(key);
        if (entry && this.isExpired(entry, now)) {
          await this.persistentStorage.delete(key);
          this.notifyInvalidation('ttl-expired', key);
        }
      }
    }
  }

  /**
   * Run demotion: move stale entries from memory to persistent
   */
  private async runDemotion(): Promise<void> {
    if (this.destroyed || !this.persistentStorage) return;

    const now = Date.now();
    const toDemote: Array<[string, TierCacheEntry]> = [];

    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      const timeSinceAccess = now - entry.lastAccessedAt;

      if (timeSinceAccess > this.config.demotionThreshold) {
        toDemote.push([key, entry]);
      }
    }

    for (const [key, entry] of toDemote) {
      await this.demoteToPersistent(key, entry);
    }
  }

  /**
   * Notify invalidation callbacks
   */
  private notifyInvalidation(trigger: InvalidationTrigger, key?: string): void {
    const callbacks = Array.from(this.invalidationCallbacks);
    for (const callback of callbacks) {
      try {
        callback(trigger, key);
      } catch (e) {
        console.error('Error in invalidation callback:', e);
      }
    }
  }
}
