/**
 * Cache optimization and coordination
 *
 * Provides multi-tier cache coordination, warming strategies, eviction policy
 * tuning, and performance analysis for optimal cache effectiveness.
 */

/**
 * Cache tier configuration
 */
export interface CacheTier {
  /** Tier name */
  name: string;
  /** Tier priority (higher = check first) */
  priority: number;
  /** Maximum size in bytes */
  maxSize: number;
  /** TTL in milliseconds */
  ttl: number;
  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'ttl';
}

/**
 * Cache performance metrics
 */
export interface CachePerformanceMetrics {
  /** Hit rate per tier */
  hitRates: Record<string, number>;
  /** Miss rate per tier */
  missRates: Record<string, number>;
  /** Average lookup time per tier in ms */
  avgLookupTime: Record<string, number>;
  /** Cache size per tier in bytes */
  sizes: Record<string, number>;
  /** Eviction count per tier */
  evictions: Record<string, number>;
  /** Total hits */
  totalHits: number;
  /** Total misses */
  totalMisses: number;
  /** Overall hit rate */
  overallHitRate: number;
}

/**
 * Cache warming strategy
 */
export interface WarmingStrategy {
  /** Strategy name */
  name: string;
  /** Keys to warm */
  keys: string[];
  /** Fetch function */
  fetch: (key: string) => Promise<any>;
  /** Priority (higher = warm first) */
  priority?: number;
  /** Whether to warm in background */
  background?: boolean;
}

/**
 * Eviction candidate
 */
export interface EvictionCandidate {
  /** Cache key */
  key: string;
  /** Tier */
  tier: string;
  /** Reason for eviction */
  reason: 'size' | 'ttl' | 'lru' | 'lfu';
  /** Score (higher = more likely to evict) */
  score: number;
}

/**
 * Cache optimization recommendation
 */
export interface CacheOptimizationRecommendation {
  /** Recommendation type */
  type: 'increase-size' | 'decrease-ttl' | 'change-policy' | 'add-tier' | 'warming';
  /** Target tier */
  tier: string;
  /** Description */
  description: string;
  /** Expected improvement */
  expectedImprovement: string;
  /** Priority */
  priority: 'low' | 'medium' | 'high';
}

/**
 * Cache optimizer configuration
 */
export interface CacheOptimizerConfig {
  /** Cache tiers */
  tiers?: CacheTier[];
  /** Enable auto-warming */
  autoWarming?: boolean;
  /** Warming interval in ms */
  warmingInterval?: number;
  /** Enable performance analysis */
  enableAnalysis?: boolean;
  /** Analysis interval in ms */
  analysisInterval?: number;
}

/**
 * Default cache optimizer configuration
 */
export const DEFAULT_CACHE_OPTIMIZER_CONFIG: Required<CacheOptimizerConfig> = {
  tiers: [
    {
      name: 'memory',
      priority: 3,
      maxSize: 10 * 1024 * 1024, // 10MB
      ttl: 60000, // 1 minute
      evictionPolicy: 'lru',
    },
    {
      name: 'session',
      priority: 2,
      maxSize: 5 * 1024 * 1024, // 5MB
      ttl: 300000, // 5 minutes
      evictionPolicy: 'lru',
    },
    {
      name: 'persistent',
      priority: 1,
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 3600000, // 1 hour
      evictionPolicy: 'lfu',
    },
  ],
  autoWarming: true,
  warmingInterval: 300000, // 5 minutes
  enableAnalysis: true,
  analysisInterval: 60000, // 1 minute
};

/**
 * Cache access record
 */
interface CacheAccessRecord {
  /** Tier */
  tier: string;
  /** Whether hit or miss */
  hit: boolean;
  /** Lookup time in ms */
  lookupTime: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Cache optimizer
 *
 * Coordinates multiple cache tiers, optimizes eviction policies,
 * manages cache warming, and provides performance analysis.
 *
 * Features:
 * - Multi-tier cache coordination
 * - Intelligent cache warming
 * - Eviction policy tuning
 * - Performance analysis and recommendations
 * - Automatic optimization
 *
 * Usage:
 * ```ts
 * const optimizer = new CacheOptimizer({
 *   tiers: [
 *     { name: 'memory', priority: 3, maxSize: 10MB, ttl: 60000, evictionPolicy: 'lru' },
 *     { name: 'disk', priority: 1, maxSize: 100MB, ttl: 3600000, evictionPolicy: 'lfu' },
 *   ],
 * });
 *
 * // Record cache access
 * optimizer.recordAccess('memory', true, 1.5);
 *
 * // Get performance metrics
 * const metrics = optimizer.getMetrics();
 *
 * // Get recommendations
 * const recommendations = optimizer.getRecommendations();
 * ```
 */
export class CacheOptimizer {
  private config: Required<CacheOptimizerConfig>;
  private accessRecords: CacheAccessRecord[] = [];
  private warmingStrategies: WarmingStrategy[] = [];
  private warmingInterval?: NodeJS.Timeout | number;
  private analysisInterval?: NodeJS.Timeout | number;

  constructor(config: CacheOptimizerConfig = {}) {
    this.config = { ...DEFAULT_CACHE_OPTIMIZER_CONFIG, ...config };

    if (this.config.autoWarming) {
      this.startAutoWarming();
    }

    if (this.config.enableAnalysis) {
      this.startAnalysis();
    }
  }

  /**
   * Record a cache access
   */
  recordAccess(tier: string, hit: boolean, lookupTime: number): void {
    this.accessRecords.push({
      tier,
      hit,
      lookupTime,
      timestamp: Date.now(),
    });

    // Keep last 10000 records
    if (this.accessRecords.length > 10000) {
      this.accessRecords = this.accessRecords.slice(-10000);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(windowMs: number = 300000): CachePerformanceMetrics {
    const cutoff = Date.now() - windowMs;
    const records = this.accessRecords.filter(r => r.timestamp >= cutoff);

    const hitRates: Record<string, number> = {};
    const missRates: Record<string, number> = {};
    const avgLookupTime: Record<string, number> = {};
    const sizes: Record<string, number> = {};
    const evictions: Record<string, number> = {};

    let totalHits = 0;
    let totalMisses = 0;

    // Calculate per-tier metrics
    for (const tier of this.config.tiers) {
      const tierRecords = records.filter(r => r.tier === tier.name);
      const hits = tierRecords.filter(r => r.hit).length;
      const misses = tierRecords.filter(r => !r.hit).length;
      const total = tierRecords.length;

      hitRates[tier.name] = total > 0 ? hits / total : 0;
      missRates[tier.name] = total > 0 ? misses / total : 0;

      avgLookupTime[tier.name] =
        tierRecords.length > 0
          ? tierRecords.reduce((sum, r) => sum + r.lookupTime, 0) / tierRecords.length
          : 0;

      sizes[tier.name] = 0; // Would be populated by actual cache implementation
      evictions[tier.name] = 0; // Would be populated by actual cache implementation

      totalHits += hits;
      totalMisses += misses;
    }

    const overallHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      hitRates,
      missRates,
      avgLookupTime,
      sizes,
      evictions,
      totalHits,
      totalMisses,
      overallHitRate,
    };
  }

  /**
   * Get cache tiers sorted by priority
   */
  getTiers(): CacheTier[] {
    return [...this.config.tiers].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add cache tier
   */
  addTier(tier: CacheTier): void {
    this.config.tiers.push(tier);
    this.config.tiers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register warming strategy
   */
  registerWarmingStrategy(strategy: WarmingStrategy): void {
    this.warmingStrategies.push(strategy);
    this.warmingStrategies.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Execute cache warming
   */
  async warmCache(): Promise<void> {
    console.log('[CacheOptimizer] Starting cache warming');

    for (const strategy of this.warmingStrategies) {
      if (strategy.background) {
        // Warm in background
        this.warmCacheStrategy(strategy).catch(error => {
          console.error(`[CacheOptimizer] Background warming failed for ${strategy.name}:`, error);
        });
      } else {
        // Warm synchronously
        try {
          await this.warmCacheStrategy(strategy);
        } catch (error) {
          console.error(`[CacheOptimizer] Warming failed for ${strategy.name}:`, error);
        }
      }
    }
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(): CacheOptimizationRecommendation[] {
    const recommendations: CacheOptimizationRecommendation[] = [];
    const metrics = this.getMetrics();

    // Analyze each tier
    for (const tier of this.config.tiers) {
      const hitRate = metrics.hitRates[tier.name] || 0;
      const avgLookupTime = metrics.avgLookupTime[tier.name] || 0;

      // Low hit rate
      if (hitRate < 0.5) {
        recommendations.push({
          type: 'increase-size',
          tier: tier.name,
          description: `${tier.name} has low hit rate (${Math.round(hitRate * 100)}%) - consider increasing size`,
          expectedImprovement: 'Higher hit rate, better performance',
          priority: 'high',
        });

        recommendations.push({
          type: 'warming',
          tier: tier.name,
          description: `${tier.name} could benefit from cache warming`,
          expectedImprovement: 'Improved initial hit rate',
          priority: 'medium',
        });
      }

      // High lookup time
      if (avgLookupTime > 10) {
        recommendations.push({
          type: 'change-policy',
          tier: tier.name,
          description: `${tier.name} has high lookup time (${Math.round(avgLookupTime)}ms) - consider different eviction policy`,
          expectedImprovement: 'Faster cache lookups',
          priority: 'medium',
        });
      }

      // Very high hit rate (potentially over-sized)
      if (hitRate > 0.95 && tier.maxSize > 5 * 1024 * 1024) {
        recommendations.push({
          type: 'decrease-ttl',
          tier: tier.name,
          description: `${tier.name} has very high hit rate (${Math.round(hitRate * 100)}%) - consider shorter TTL to free memory`,
          expectedImprovement: 'Reduced memory usage',
          priority: 'low',
        });
      }
    }

    // Overall low hit rate
    if (metrics.overallHitRate < 0.6) {
      recommendations.push({
        type: 'add-tier',
        tier: 'all',
        description: `Overall hit rate is low (${Math.round(metrics.overallHitRate * 100)}%) - consider adding intermediate cache tier`,
        expectedImprovement: 'Better cache utilization',
        priority: 'high',
      });
    }

    return recommendations;
  }

  /**
   * Get eviction candidates for a tier
   */
  getEvictionCandidates(tierName: string, count: number = 10): EvictionCandidate[] {
    const tier = this.config.tiers.find(t => t.name === tierName);
    if (!tier) return [];

    // This would be implemented based on actual cache data
    // Placeholder implementation
    return [];
  }

  /**
   * Optimize eviction policy for tier
   */
  optimizeEvictionPolicy(tierName: string): 'lru' | 'lfu' | 'fifo' | 'ttl' {
    const metrics = this.getMetrics();
    const hitRate = metrics.hitRates[tierName] || 0;
    const avgLookupTime = metrics.avgLookupTime[tierName] || 0;

    // If hit rate is low and lookup time is high, try LFU
    if (hitRate < 0.5 && avgLookupTime > 5) {
      return 'lfu';
    }

    // If hit rate is good but lookup time is high, try LRU
    if (hitRate > 0.7 && avgLookupTime > 5) {
      return 'lru';
    }

    // Default to LRU for most cases
    return 'lru';
  }

  /**
   * Start automatic cache warming
   */
  startAutoWarming(): void {
    if (this.warmingInterval !== undefined) return;

    this.warmingInterval = setInterval(() => {
      this.warmCache().catch(error => {
        console.error('[CacheOptimizer] Auto-warming failed:', error);
      });
    }, this.config.warmingInterval);
  }

  /**
   * Stop automatic cache warming
   */
  stopAutoWarming(): void {
    if (this.warmingInterval !== undefined) {
      clearInterval(this.warmingInterval as number);
      this.warmingInterval = undefined;
    }
  }

  /**
   * Start performance analysis
   */
  startAnalysis(): void {
    if (this.analysisInterval !== undefined) return;

    this.analysisInterval = setInterval(() => {
      const recommendations = this.getRecommendations();
      if (recommendations.length > 0) {
        console.log('[CacheOptimizer] Performance recommendations:', recommendations);
      }
    }, this.config.analysisInterval);
  }

  /**
   * Stop performance analysis
   */
  stopAnalysis(): void {
    if (this.analysisInterval !== undefined) {
      clearInterval(this.analysisInterval as number);
      this.analysisInterval = undefined;
    }
  }

  /**
   * Reset optimizer state
   */
  reset(): void {
    this.accessRecords = [];
    this.warmingStrategies = [];
    this.stopAutoWarming();
    this.stopAnalysis();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.reset();
  }

  /**
   * Warm cache using strategy
   */
  private async warmCacheStrategy(strategy: WarmingStrategy): Promise<void> {
    for (const key of strategy.keys) {
      try {
        await strategy.fetch(key);
      } catch (error) {
        console.error(`[CacheOptimizer] Failed to warm key ${key}:`, error);
      }
    }
  }
}

/**
 * Calculate optimal cache size based on hit rate
 */
export function calculateOptimalCacheSize(
  currentSize: number,
  hitRate: number,
  targetHitRate: number = 0.8
): number {
  if (hitRate >= targetHitRate) {
    return currentSize;
  }

  // Estimate: 10% size increase yields ~5% hit rate improvement
  const hitRateGap = targetHitRate - hitRate;
  const sizeMultiplier = 1 + hitRateGap * 2;

  return Math.round(currentSize * sizeMultiplier);
}

/**
 * Calculate cache efficiency score (0-100)
 */
export function calculateCacheEfficiency(metrics: CachePerformanceMetrics): number {
  const hitRateScore = metrics.overallHitRate * 50; // 0-50 points

  // Average lookup time score (lower is better)
  const avgLookupTimes = Object.values(metrics.avgLookupTime);
  const avgLookupTime = avgLookupTimes.reduce((sum, t) => sum + t, 0) / avgLookupTimes.length;
  const lookupScore = Math.max(0, 50 - avgLookupTime * 5); // 0-50 points

  return Math.round(hitRateScore + lookupScore);
}

/**
 * Default cache optimizer instance
 */
export const cacheOptimizer = new CacheOptimizer();
