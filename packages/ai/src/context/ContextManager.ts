import type { ContextProvider, ContextData } from './ContextProvider';
import type { ContextCache, CacheConfig } from './ContextCache';
import { MemoryContextCache } from './ContextCache';
import {
  ContextPrioritizer,
  type PrioritizerConfig,
  type ScoredContext,
} from './ContextPrioritizer';

/**
 * Options for gathering context
 */
export interface GatherOptions {
  /**
   * Cache key for storing/retrieving gathered context
   * If not provided, caching is skipped
   */
  cacheKey?: string;

  /**
   * Maximum tokens to include in gathered context
   * Contexts will be prioritized and trimmed to fit budget
   */
  tokenBudget?: number;

  /**
   * Type of trigger that initiated gathering
   * Affects prioritization scoring
   */
  trigger?: 'user-action' | 'proactive' | 'manual';

  /**
   * Minimum relevance score (0-1) for inclusion
   * @default 0.5
   */
  minRelevance?: number;

  /**
   * Force refresh, skip cache lookup
   * @default false
   */
  forceRefresh?: boolean;

  /**
   * Only gather from specific providers (by provider name)
   * If not specified, all enabled providers are used
   */
  providerIds?: string[];
}

/**
 * Result of context gathering operation
 */
export interface GatheredContext {
  /** Scored and prioritized contexts */
  contexts: ScoredContext[];

  /** Timestamp when gathering completed */
  timestamp: number;

  /** Whether result was retrieved from cache */
  cached: boolean;

  /** Time taken to gather (milliseconds) */
  gatherTimeMs: number;

  /** Estimated total tokens in all contexts */
  totalTokens: number;

  /** Number of provider errors encountered */
  errors: number;
}

/**
 * Context manager statistics
 */
export interface ContextManagerStats {
  /** Number of registered providers */
  providers: number;

  /** Number of enabled providers */
  enabledProviders: number;

  /** Cache statistics */
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    memoryUsageMB: number;
  };

  /** Total context gatherings performed */
  totalGatherings: number;

  /** Total provider errors encountered */
  totalErrors: number;

  /** Average gather time (milliseconds) */
  avgGatherTimeMs: number;
}

/**
 * Context event types
 */
export type ContextEvent = 'context-gathered' | 'provider-error' | 'cache-hit' | 'cache-miss';

/**
 * Context event listener
 */
export type ContextListener = (
  event: ContextEvent,
  data: ScoredContext[] | Error | null
) => void;

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  /** Cache configuration */
  cacheConfig?: Partial<CacheConfig>;

  /** Prioritizer configuration */
  prioritizerConfig?: Partial<PrioritizerConfig>;

  /**
   * Maximum time to wait for provider gathering (milliseconds)
   * @default 5000 (5 seconds)
   */
  providerTimeout?: number;
}

/**
 * Default context manager configuration
 */
export const DEFAULT_CONTEXT_MANAGER_CONFIG: Required<ContextManagerConfig> = {
  cacheConfig: {},
  prioritizerConfig: {},
  providerTimeout: 5000,
};

/**
 * Context Manager
 *
 * Central orchestrator for context gathering, caching, and prioritization.
 *
 * Features:
 * - Provider registration and management
 * - Parallel context gathering from all providers
 * - Automatic caching with TTL and invalidation
 * - Relevance scoring and prioritization
 * - Token budget constraints
 * - Error handling (single provider failure doesn't break gathering)
 * - Event system for monitoring
 * - Statistics and metrics
 *
 * Performance targets:
 * - Fresh gathering: <100ms
 * - Cached retrieval: <10ms
 * - Memory usage: <10MB
 */
export class ContextManager {
  private providers = new Map<string, ContextProvider>();
  private cache: ContextCache;
  private prioritizer: ContextPrioritizer;
  private listeners = new Set<ContextListener>();
  private config: Required<ContextManagerConfig>;
  private destroyed = false;

  // Statistics
  private stats = {
    totalGatherings: 0,
    totalErrors: 0,
    totalGatherTime: 0,
  };

  constructor(config: ContextManagerConfig = {}) {
    this.config = { ...DEFAULT_CONTEXT_MANAGER_CONFIG, ...config };
    this.cache = new MemoryContextCache(this.config.cacheConfig);
    this.prioritizer = new ContextPrioritizer(this.config.prioritizerConfig);
  }

  /**
   * Register a context provider
   */
  registerProvider(provider: ContextProvider): void {
    if (this.destroyed) {
      throw new Error('ContextManager has been destroyed');
    }

    if (this.providers.has(provider.name)) {
      throw new Error(`Provider '${provider.name}' is already registered`);
    }

    this.providers.set(provider.name, provider);
  }

  /**
   * Unregister a context provider
   */
  unregisterProvider(id: string): void {
    if (this.destroyed) {
      throw new Error('ContextManager has been destroyed');
    }

    this.providers.delete(id);
  }

  /**
   * Get registered provider by name
   */
  getProvider(name: string): ContextProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Enable/disable a specific provider
   */
  setProviderEnabled(name: string, enabled: boolean): void {
    const provider = this.providers.get(name);
    if (provider) {
      provider.enabled = enabled;
    }
  }

  /**
   * Gather context from all enabled providers
   *
   * Process:
   * 1. Check cache (if cacheKey provided and not forceRefresh)
   * 2. Gather from all enabled providers in parallel
   * 3. Score and prioritize contexts
   * 4. Filter by relevance threshold
   * 5. Apply token budget if specified
   * 6. Cache result (if cacheKey provided)
   * 7. Emit event
   *
   * @param options Gathering options
   * @returns Gathered and prioritized contexts
   */
  async gatherContext(options: GatherOptions = {}): Promise<GatheredContext> {
    if (this.destroyed) {
      throw new Error('ContextManager has been destroyed');
    }

    const startTime = performance.now();
    this.stats.totalGatherings++;

    // Step 1: Check cache
    if (!options.forceRefresh && options.cacheKey) {
      const cached = await this.cache.get(options.cacheKey);
      if (cached) {
        const gatherTimeMs = performance.now() - startTime;
        this.stats.totalGatherTime += gatherTimeMs;

        const result: GatheredContext = {
          contexts: [{ context: cached, score: 1.0, source: 'cache' }],
          timestamp: Date.now(),
          cached: true,
          gatherTimeMs,
          totalTokens: this.estimateTokens(cached),
          errors: 0,
        };

        this.emit('cache-hit', result.contexts);
        return result;
      } else {
        this.emit('cache-miss', null);
      }
    }

    // Step 2: Gather from providers in parallel
    const contexts = await this.gatherFromProviders(options);

    // Step 3: Score and prioritize
    const scored = this.prioritizer.score(contexts, {
      trigger: options.trigger,
      tokenBudget: options.tokenBudget,
      minRelevance: options.minRelevance,
    });

    // Step 4: Filter by relevance
    const minRelevance = options.minRelevance ?? 0.5;
    const filtered = scored.filter((s) => s.score >= minRelevance);

    // Step 5: Apply token budget if specified
    const final =
      options.tokenBudget !== undefined
        ? this.applyTokenBudget(filtered, options.tokenBudget)
        : filtered;

    // Step 6: Cache result (combine all contexts into single ContextData)
    if (options.cacheKey && final.length > 0) {
      const combined = this.combineContexts(final);
      await this.cache.set(options.cacheKey, combined);
    }

    // Calculate stats
    const gatherTimeMs = performance.now() - startTime;
    this.stats.totalGatherTime += gatherTimeMs;

    const result: GatheredContext = {
      contexts: final,
      timestamp: Date.now(),
      cached: false,
      gatherTimeMs,
      totalTokens: this.estimateTotalTokens(final),
      errors: this.providers.size - contexts.length,
    };

    // Step 7: Emit event
    this.emit('context-gathered', result.contexts);

    return result;
  }

  /**
   * Gather contexts from all enabled providers in parallel
   */
  private async gatherFromProviders(options: GatherOptions): Promise<ContextData[]> {
    // Determine which providers to use
    const providerIds = options.providerIds || Array.from(this.providers.keys());

    // Filter to only enabled providers
    const enabledProviders = providerIds
      .map((id) => this.providers.get(id))
      .filter((p): p is ContextProvider => p !== undefined && p.enabled);

    if (enabledProviders.length === 0) {
      return [];
    }

    // Gather in parallel with timeout
    const results = await Promise.allSettled(
      enabledProviders.map((provider) =>
        this.gatherWithTimeout(provider, this.config.providerTimeout)
      )
    );

    // Separate successful and failed results
    const contexts: ContextData[] = [];
    let errorCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        contexts.push(result.value);
      } else {
        errorCount++;
        this.stats.totalErrors++;
        this.emit('provider-error', result.reason);
        console.warn('Provider gather failed:', result.reason);
      }
    }

    return contexts;
  }

  /**
   * Gather from single provider with timeout
   */
  private async gatherWithTimeout(
    provider: ContextProvider,
    timeout: number
  ): Promise<ContextData> {
    return Promise.race([
      provider.gather(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Provider '${provider.name}' timed out`)), timeout)
      ),
    ]);
  }

  /**
   * Apply token budget by trimming contexts
   */
  private applyTokenBudget(
    contexts: ScoredContext[],
    tokenBudget: number
  ): ScoredContext[] {
    const result: ScoredContext[] = [];
    let totalTokens = 0;

    // Contexts are already sorted by score (highest first)
    for (const ctx of contexts) {
      const tokens = this.estimateTokens(ctx.context);

      if (totalTokens + tokens <= tokenBudget) {
        result.push(ctx);
        totalTokens += tokens;
      } else {
        // Budget exceeded, stop adding
        break;
      }
    }

    return result;
  }

  /**
   * Combine multiple scored contexts into single ContextData for caching
   */
  private combineContexts(contexts: ScoredContext[]): ContextData {
    return {
      provider: 'combined',
      timestamp: new Date(),
      data: {
        contexts: contexts.map((sc) => ({
          ...sc.context,
          score: sc.score,
        })),
      },
    };
  }

  /**
   * Estimate tokens for a single context (rough heuristic: 4 chars per token)
   */
  private estimateTokens(context: ContextData): number {
    try {
      const jsonStr = JSON.stringify(context);
      return Math.ceil(jsonStr.length / 4);
    } catch (e) {
      return 250; // Conservative fallback: ~1KB context
    }
  }

  /**
   * Estimate total tokens for multiple scored contexts
   */
  private estimateTotalTokens(contexts: ScoredContext[]): number {
    return contexts.reduce((sum, sc) => sum + this.estimateTokens(sc.context), 0);
  }

  /**
   * Subscribe to context events
   */
  subscribe(listener: ContextListener): () => void {
    if (this.destroyed) {
      throw new Error('ContextManager has been destroyed');
    }

    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: ContextEvent, data: ScoredContext[] | Error | null): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in context listener:', e);
      }
    }
  }

  /**
   * Get context manager statistics
   */
  getStats(): ContextManagerStats {
    const cacheStats = this.cache.getStats();
    const enabledCount = Array.from(this.providers.values()).filter((p) => p.enabled).length;

    return {
      providers: this.providers.size,
      enabledProviders: enabledCount,
      cacheStats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        size: cacheStats.size,
        memoryUsageMB: cacheStats.memoryUsageMB,
      },
      totalGatherings: this.stats.totalGatherings,
      totalErrors: this.stats.totalErrors,
      avgGatherTimeMs:
        this.stats.totalGatherings > 0
          ? this.stats.totalGatherTime / this.stats.totalGatherings
          : 0,
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if (this.destroyed) {
      throw new Error('ContextManager has been destroyed');
    }

    await this.cache.clear();
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidateCache(key: string): Promise<void> {
    if (this.destroyed) {
      throw new Error('ContextManager has been destroyed');
    }

    await this.cache.invalidate(key);
  }

  /**
   * Check if cache has key
   */
  async hasCache(key: string): Promise<boolean> {
    if (this.destroyed) {
      throw new Error('ContextManager has been destroyed');
    }

    return this.cache.has(key);
  }

  /**
   * Destroy context manager and cleanup resources
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;

    // Clear providers
    this.providers.clear();

    // Destroy cache
    this.cache.destroy();

    // Clear listeners
    this.listeners.clear();

    // Reset stats
    this.stats = {
      totalGatherings: 0,
      totalErrors: 0,
      totalGatherTime: 0,
    };
  }

  /**
   * Check if manager is destroyed
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}
