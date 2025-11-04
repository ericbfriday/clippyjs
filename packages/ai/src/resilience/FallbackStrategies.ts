/**
 * Common fallback strategies for graceful degradation
 *
 * Provides reusable fallback patterns:
 * - Cache-based fallbacks
 * - Static response fallbacks
 * - Degraded service fallbacks
 * - Manual override fallbacks
 */

import { FallbackStrategy } from './DegradationManager';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

/**
 * Cache-based fallback strategy
 *
 * Uses cached responses when primary service fails.
 * Implements LRU eviction and TTL expiration.
 */
export class CachedResponseFallback<T> implements FallbackStrategy {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private ttl: number;
  private qualityScore: number;

  constructor(
    private getCacheKey: () => string,
    private maxCacheSize = 100,
    private cacheTTL = 3600000, // 1 hour default
    private initialQualityScore = 0.8
  ) {
    this.maxSize = maxCacheSize;
    this.ttl = cacheTTL;
    this.qualityScore = initialQualityScore;
  }

  async execute(): Promise<T> {
    const key = this.getCacheKey();
    const entry = this.cache.get(key);

    if (!entry) {
      throw new Error('No cached response available');
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      throw new Error('Cached response expired');
    }

    // Update hit count
    entry.hits++;

    return entry.value;
  }

  async isAvailable(): Promise<boolean> {
    const key = this.getCacheKey();
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  getQualityScore(): number {
    return this.qualityScore;
  }

  /**
   * Store response in cache
   */
  store(value: T): void {
    const key = this.getCacheKey();

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Evict oldest entry (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Static response fallback
 *
 * Returns a predefined static response when service fails.
 * Useful for providing minimal functionality.
 */
export class StaticResponseFallback<T> implements FallbackStrategy {
  constructor(
    private response: T,
    private qualityScore = 0.5
  ) {}

  async execute(): Promise<T> {
    return this.response;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getQualityScore(): number {
    return this.qualityScore;
  }
}

/**
 * Degraded service fallback
 *
 * Calls a degraded version of the service with reduced functionality.
 * For example, using a smaller/faster model instead of the primary one.
 */
export class DegradedServiceFallback<T> implements FallbackStrategy {
  constructor(
    private degradedOperation: () => Promise<T>,
    private availabilityCheck: () => Promise<boolean>,
    private qualityScore = 0.6
  ) {}

  async execute(): Promise<T> {
    return await this.degradedOperation();
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await this.availabilityCheck();
    } catch {
      return false;
    }
  }

  getQualityScore(): number {
    return this.qualityScore;
  }
}

/**
 * Chained fallback strategy
 *
 * Tries multiple fallback strategies in order until one succeeds.
 */
export class ChainedFallback<T> implements FallbackStrategy {
  constructor(private strategies: FallbackStrategy[]) {}

  async execute(): Promise<T> {
    const errors: Error[] = [];

    for (const strategy of this.strategies) {
      try {
        const available = await strategy.isAvailable();
        if (available) {
          return await strategy.execute();
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    throw new Error(
      `All fallback strategies failed: ${errors.map(e => e.message).join(', ')}`
    );
  }

  async isAvailable(): Promise<boolean> {
    for (const strategy of this.strategies) {
      const available = await strategy.isAvailable();
      if (available) return true;
    }
    return false;
  }

  getQualityScore(): number {
    // Return best quality score from available strategies
    let best = 0;
    for (const strategy of this.strategies) {
      best = Math.max(best, strategy.getQualityScore());
    }
    return best;
  }

  async cleanup(): Promise<void> {
    await Promise.all(
      this.strategies.map(s => s.cleanup?.())
    );
  }
}

/**
 * Timeout-based fallback
 *
 * Attempts primary operation with timeout, falls back if timeout exceeded.
 */
export class TimeoutFallback<T> implements FallbackStrategy {
  constructor(
    private primaryOperation: () => Promise<T>,
    private fallbackOperation: () => Promise<T>,
    private timeout: number,
    private qualityScore = 0.7
  ) {}

  async execute(): Promise<T> {
    try {
      return await this.executeWithTimeout(
        this.primaryOperation(),
        this.timeout
      );
    } catch (error) {
      // If timeout or error, use fallback
      return await this.fallbackOperation();
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getQualityScore(): number {
    return this.qualityScore;
  }

  private async executeWithTimeout<U>(
    promise: Promise<U>,
    ms: number
  ): Promise<U> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), ms);
    });

    return Promise.race([promise, timeout]);
  }
}

/**
 * Conditional fallback
 *
 * Uses condition to determine whether to use fallback.
 */
export class ConditionalFallback<T> implements FallbackStrategy {
  constructor(
    private condition: () => boolean | Promise<boolean>,
    private primaryStrategy: FallbackStrategy,
    private fallbackStrategy: FallbackStrategy
  ) {}

  async execute(): Promise<T> {
    const shouldUseFallback = await this.condition();

    if (shouldUseFallback) {
      return await this.fallbackStrategy.execute();
    }

    return await this.primaryStrategy.execute();
  }

  async isAvailable(): Promise<boolean> {
    const shouldUseFallback = await this.condition();

    if (shouldUseFallback) {
      return await this.fallbackStrategy.isAvailable();
    }

    return await this.primaryStrategy.isAvailable();
  }

  getQualityScore(): number {
    // Average of both strategies
    return (
      this.primaryStrategy.getQualityScore() +
      this.fallbackStrategy.getQualityScore()
    ) / 2;
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.primaryStrategy.cleanup?.(),
      this.fallbackStrategy.cleanup?.(),
    ]);
  }
}

/**
 * Rate-limited fallback
 *
 * Implements token bucket rate limiting for fallback usage.
 */
export class RateLimitedFallback<T> implements FallbackStrategy {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private strategy: FallbackStrategy,
    private maxTokens: number,
    private refillRate: number, // tokens per second
    initialTokens?: number
  ) {
    this.tokens = initialTokens ?? maxTokens;
    this.lastRefill = Date.now();
  }

  async execute(): Promise<T> {
    this.refillTokens();

    if (this.tokens < 1) {
      throw new Error('Fallback rate limit exceeded');
    }

    this.tokens -= 1;
    return await this.strategy.execute();
  }

  async isAvailable(): Promise<boolean> {
    this.refillTokens();

    if (this.tokens < 1) {
      return false;
    }

    return await this.strategy.isAvailable();
  }

  getQualityScore(): number {
    return this.strategy.getQualityScore() * 0.9; // Slightly lower due to rate limiting
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async cleanup(): Promise<void> {
    await this.strategy.cleanup?.();
  }
}

/**
 * Circuit breaker aware fallback
 *
 * Checks circuit breaker state before attempting fallback.
 */
export class CircuitBreakerFallback<T> implements FallbackStrategy {
  constructor(
    private strategy: FallbackStrategy,
    private getCircuitState: () => 'open' | 'closed' | 'half-open'
  ) {}

  async execute(): Promise<T> {
    const state = this.getCircuitState();

    if (state === 'open') {
      throw new Error('Circuit breaker is open, fallback rejected');
    }

    return await this.strategy.execute();
  }

  async isAvailable(): Promise<boolean> {
    const state = this.getCircuitState();

    if (state === 'open') {
      return false;
    }

    return await this.strategy.isAvailable();
  }

  getQualityScore(): number {
    return this.strategy.getQualityScore();
  }

  async cleanup(): Promise<void> {
    await this.strategy.cleanup?.();
  }
}

/**
 * Manual override fallback
 *
 * Allows manual control of fallback behavior via external state.
 */
export class ManualOverrideFallback<T> implements FallbackStrategy {
  private overrideActive = false;
  private overrideResponse: T | null = null;

  constructor(
    private strategy: FallbackStrategy,
    private qualityScore = 0.9
  ) {}

  async execute(): Promise<T> {
    if (this.overrideActive && this.overrideResponse !== null) {
      return this.overrideResponse;
    }

    return await this.strategy.execute();
  }

  async isAvailable(): Promise<boolean> {
    if (this.overrideActive) {
      return this.overrideResponse !== null;
    }

    return await this.strategy.isAvailable();
  }

  getQualityScore(): number {
    return this.qualityScore;
  }

  /**
   * Activate manual override
   */
  activateOverride(response: T): void {
    this.overrideActive = true;
    this.overrideResponse = response;
  }

  /**
   * Deactivate manual override
   */
  deactivateOverride(): void {
    this.overrideActive = false;
    this.overrideResponse = null;
  }

  async cleanup(): Promise<void> {
    this.deactivateOverride();
    await this.strategy.cleanup?.();
  }
}
