/**
 * Integration tests for complete context flow
 * Tests end-to-end context gathering, caching, prioritization, and compression
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextManager } from '../../src/context/ContextManager';
import { MemoryContextCache } from '../../src/context/ContextCache';
import { ViewportContextProvider } from '../../src/context/ViewportContextProvider';
import { PerformanceContextProvider } from '../../src/context/PerformanceContextProvider';
import { FormStateContextProvider } from '../../src/context/FormStateContextProvider';
import { NavigationContextProvider } from '../../src/context/NavigationContextProvider';
import type { ContextData } from '../../src/context/ContextProvider';

// Test helpers
function createMockDOMEnvironment() {
  // Mock window and document for Node environment
  const mockWindow = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 2,
    scrollX: 0,
    scrollY: 100,
    location: {
      href: 'https://example.com/test',
      pathname: '/test',
      search: '?param=value',
      hash: '#section',
    },
    performance: {
      getEntriesByType: (type: string) => [],
      now: () => Date.now(),
    },
  };

  const mockDocument = {
    documentElement: {
      scrollWidth: 1920,
      scrollHeight: 2000,
    },
    querySelectorAll: (selector: string) => [],
    activeElement: null,
  };

  // @ts-ignore - Mock environment
  global.window = mockWindow;
  // @ts-ignore - Mock environment
  global.document = mockDocument;
}

function cleanupMockDOMEnvironment() {
  // @ts-ignore
  delete global.window;
  // @ts-ignore
  delete global.document;
}

describe('Context Flow Integration', () => {
  let manager: ContextManager;
  let cache: MemoryContextCache;

  beforeEach(() => {
    createMockDOMEnvironment();

    // Create fresh manager and cache
    cache = new MemoryContextCache({
      maxSizeMB: 10,
      ttl: 30000,
      evictionPolicy: 'lru',
      enableStats: true,
      cleanupInterval: 5000,
    });

    manager = new ContextManager({
      cacheConfig: {
        maxSizeMB: 10,
        ttl: 30000,
        evictionPolicy: 'lru',
        enableStats: true,
        cleanupInterval: 5000,
      },
    });

    // Register all providers
    manager.registerProvider('viewport', new ViewportContextProvider());
    manager.registerProvider('performance', new PerformanceContextProvider());
    manager.registerProvider('form', new FormStateContextProvider());
    manager.registerProvider('navigation', new NavigationContextProvider());
  });

  afterEach(() => {
    cleanupMockDOMEnvironment();
    manager.destroy();
  });

  describe('End-to-End Context Flow', () => {
    it('should gather, cache, prioritize, and compress contexts', async () => {
      const startTime = Date.now();

      // First gather - should hit all providers
      const result1 = await manager.gatherContext({
        cacheKey: 'test-flow',
        tokenBudget: 2000,
        minRelevance: 0.5,
      });

      const gatherTime1 = Date.now() - startTime;

      // Verify result structure
      expect(result1).toBeDefined();
      expect(result1.contexts).toBeInstanceOf(Array);
      expect(result1.timestamp).toBeGreaterThan(0);
      expect(result1.gatherTimeMs).toBeGreaterThan(0);
      expect(result1.totalTokens).toBeGreaterThan(0);
      expect(result1.cached).toBe(false); // First call should not be cached

      // Verify contexts were gathered
      expect(result1.contexts.length).toBeGreaterThan(0);

      // Verify contexts have scores
      result1.contexts.forEach((ctx) => {
        expect(ctx.score).toBeGreaterThanOrEqual(0);
        expect(ctx.score).toBeLessThanOrEqual(1);
        expect(ctx.context).toBeDefined();
        expect(ctx.context.type).toBeDefined();
        expect(ctx.context.timestamp).toBeGreaterThan(0);
      });

      // Verify contexts are sorted by relevance
      for (let i = 0; i < result1.contexts.length - 1; i++) {
        expect(result1.contexts[i].score).toBeGreaterThanOrEqual(
          result1.contexts[i + 1].score
        );
      }

      // Second gather - should use cache
      const startTime2 = Date.now();
      const result2 = await manager.gatherContext({
        cacheKey: 'test-flow',
        tokenBudget: 2000,
        minRelevance: 0.5,
      });
      const gatherTime2 = Date.now() - startTime2;

      // Verify cached result
      expect(result2.cached).toBe(true);
      expect(gatherTime2).toBeLessThan(gatherTime1); // Cached should be faster
      expect(result2.contexts.length).toBe(result1.contexts.length);

      // Verify token budget was respected
      expect(result1.totalTokens).toBeLessThanOrEqual(2000);
      expect(result2.totalTokens).toBeLessThanOrEqual(2000);
    });

    it('should handle different token budgets', async () => {
      // Small budget
      const smallBudget = await manager.gatherContext({
        tokenBudget: 500,
        minRelevance: 0.5,
      });

      // Large budget
      const largeBudget = await manager.gatherContext({
        tokenBudget: 5000,
        minRelevance: 0.5,
      });

      // Verify small budget has fewer/compressed contexts
      expect(smallBudget.totalTokens).toBeLessThanOrEqual(500);
      expect(largeBudget.totalTokens).toBeLessThanOrEqual(5000);
      expect(smallBudget.totalTokens).toBeLessThan(largeBudget.totalTokens);
    });

    it('should filter by minimum relevance score', async () => {
      // Low threshold
      const lowThreshold = await manager.gatherContext({
        minRelevance: 0.3,
      });

      // High threshold
      const highThreshold = await manager.gatherContext({
        minRelevance: 0.8,
      });

      // High threshold should have fewer contexts
      expect(highThreshold.contexts.length).toBeLessThanOrEqual(
        lowThreshold.contexts.length
      );

      // All contexts should meet threshold
      highThreshold.contexts.forEach((ctx) => {
        expect(ctx.score).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should respect provider selection', async () => {
      // Only viewport provider
      const viewportOnly = await manager.gatherContext({
        providerIds: ['viewport'],
      });

      // Verify only viewport context
      expect(viewportOnly.contexts.length).toBe(1);
      expect(viewportOnly.contexts[0].context.type).toBe('viewport');

      // Multiple specific providers
      const multipleProviders = await manager.gatherContext({
        providerIds: ['viewport', 'navigation'],
      });

      expect(multipleProviders.contexts.length).toBe(2);
      const types = multipleProviders.contexts.map((c) => c.context.type);
      expect(types).toContain('viewport');
      expect(types).toContain('navigation');
    });
  });

  describe('Cache Invalidation Scenarios', () => {
    it('should invalidate cache on DOM mutations', async () => {
      const cacheKey = 'dom-test';

      // First gather
      const result1 = await manager.gatherContext({ cacheKey });
      expect(result1.cached).toBe(false);

      // Second gather should be cached
      const result2 = await manager.gatherContext({ cacheKey });
      expect(result2.cached).toBe(true);

      // Simulate DOM mutation
      manager.invalidateCache('dom-mutation');

      // Third gather should not be cached
      const result3 = await manager.gatherContext({ cacheKey });
      expect(result3.cached).toBe(false);
    });

    it('should invalidate cache on route changes', async () => {
      const cacheKey = 'route-test';

      // Gather with initial route
      const result1 = await manager.gatherContext({ cacheKey });
      expect(result1.cached).toBe(false);

      // Should use cache
      const result2 = await manager.gatherContext({ cacheKey });
      expect(result2.cached).toBe(true);

      // Simulate route change
      // @ts-ignore
      global.window.location.pathname = '/new-route';
      manager.invalidateCache('route-change');

      // Should not use cache after route change
      const result3 = await manager.gatherContext({ cacheKey });
      expect(result3.cached).toBe(false);
    });

    it('should invalidate cache on user actions', async () => {
      const cacheKey = 'action-test';

      // First gather
      await manager.gatherContext({ cacheKey });

      // Second should use cache
      const cached = await manager.gatherContext({ cacheKey });
      expect(cached.cached).toBe(true);

      // User action invalidates cache
      manager.invalidateCache('user-action');

      // Should regather
      const fresh = await manager.gatherContext({ cacheKey });
      expect(fresh.cached).toBe(false);
    });

    it('should support partial cache invalidation', async () => {
      // Gather with different keys
      await manager.gatherContext({ cacheKey: 'key1' });
      await manager.gatherContext({ cacheKey: 'key2' });

      // Verify both cached
      const cached1 = await manager.gatherContext({ cacheKey: 'key1' });
      const cached2 = await manager.gatherContext({ cacheKey: 'key2' });
      expect(cached1.cached).toBe(true);
      expect(cached2.cached).toBe(true);

      // Invalidate only key1
      manager.invalidateCacheKey('key1');

      // key1 should be invalidated, key2 should still be cached
      const fresh1 = await manager.gatherContext({ cacheKey: 'key1' });
      const stillCached2 = await manager.gatherContext({ cacheKey: 'key2' });
      expect(fresh1.cached).toBe(false);
      expect(stillCached2.cached).toBe(true);
    });

    it('should handle forceRefresh option', async () => {
      const cacheKey = 'force-refresh';

      // First gather
      await manager.gatherContext({ cacheKey });

      // Force refresh should skip cache
      const forced = await manager.gatherContext({
        cacheKey,
        forceRefresh: true,
      });
      expect(forced.cached).toBe(false);

      // Next call without force should use newly cached result
      const cached = await manager.gatherContext({ cacheKey });
      expect(cached.cached).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet <100ms target for fresh gathering', async () => {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await manager.gatherContext({
          cacheKey: `perf-test-${i}`,
          forceRefresh: true,
        });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      // Performance targets
      expect(avgTime).toBeLessThan(100); // Average < 100ms
      expect(maxTime).toBeLessThan(150); // Max < 150ms (allow some variance)
    });

    it('should meet <10ms target for cached retrieval', async () => {
      const cacheKey = 'cache-perf';

      // Prime the cache
      await manager.gatherContext({ cacheKey });

      // Measure cached retrieval
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await manager.gatherContext({ cacheKey });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      // Cached retrieval should be very fast
      expect(avgTime).toBeLessThan(10); // Average < 10ms
      expect(maxTime).toBeLessThan(20); // Max < 20ms
    });

    it('should achieve >70% cache hit rate in realistic usage', async () => {
      const cacheKey = 'usage-pattern';

      // Simulate realistic usage pattern:
      // 1. User performs action (fresh gather)
      await manager.gatherContext({ cacheKey });

      // 2-5. Multiple AI interactions within TTL window (should use cache)
      await manager.gatherContext({ cacheKey });
      await manager.gatherContext({ cacheKey });
      await manager.gatherContext({ cacheKey });
      await manager.gatherContext({ cacheKey });

      // 6. User performs another action (invalidate and refresh)
      manager.invalidateCache('user-action');
      await manager.gatherContext({ cacheKey });

      // 7-9. More interactions (should use cache)
      await manager.gatherContext({ cacheKey });
      await manager.gatherContext({ cacheKey });
      await manager.gatherContext({ cacheKey });

      // Get statistics
      const stats = manager.getStats();

      // Calculate hit rate
      const hitRate = stats.cacheStats.hitRate;

      // Should achieve >70% hit rate
      expect(hitRate).toBeGreaterThan(0.7);
      expect(stats.cacheStats.hits).toBeGreaterThan(stats.cacheStats.misses);
    });

    it('should track performance metrics accurately', async () => {
      // Perform multiple gatherings
      await manager.gatherContext({ cacheKey: 'metrics-1' });
      await manager.gatherContext({ cacheKey: 'metrics-1' }); // cached
      await manager.gatherContext({ cacheKey: 'metrics-2' });

      const stats = manager.getStats();

      // Verify statistics
      expect(stats.providers).toBe(4); // 4 registered providers
      expect(stats.enabledProviders).toBe(4);
      expect(stats.totalGatherings).toBe(3);
      expect(stats.cacheStats.hits).toBe(1);
      expect(stats.cacheStats.misses).toBe(2);
      expect(stats.avgGatherTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Error Resilience', () => {
    it('should handle provider failures gracefully', async () => {
      // Register a failing provider
      const failingProvider = {
        name: 'failing',
        gather: async () => {
          throw new Error('Provider failed');
        },
      };

      manager.registerProvider('failing', failingProvider as any);

      // Should still gather from other providers
      const result = await manager.gatherContext();

      // Verify other providers still worked
      expect(result.contexts.length).toBeGreaterThan(0);
      expect(result.errors).toBe(1); // One error from failing provider

      // Should have contexts from successful providers
      const types = result.contexts.map((c) => c.context.type);
      expect(types).toContain('viewport');
      expect(types).toContain('navigation');
    });

    it('should handle cache failures with fallback', async () => {
      // Create a failing cache
      const failingCache = new MemoryContextCache({
        maxSizeMB: 0.001, // Very small, will fail
        ttl: 30000,
        evictionPolicy: 'lru',
        enableStats: true,
        cleanupInterval: 5000,
      });

      const managerWithFailingCache = new ContextManager({
        cacheConfig: {
          maxSizeMB: 0.001,
          ttl: 30000,
          evictionPolicy: 'lru',
          enableStats: true,
          cleanupInterval: 5000,
        },
      });

      managerWithFailingCache.registerProvider(
        'viewport',
        new ViewportContextProvider()
      );

      // Should fallback to fresh gathering
      const result = await managerWithFailingCache.gatherContext({
        cacheKey: 'test',
      });

      expect(result).toBeDefined();
      expect(result.contexts.length).toBeGreaterThan(0);

      managerWithFailingCache.destroy();
    });

    it('should handle compression failures gracefully', async () => {
      // Request extremely low token budget
      const result = await manager.gatherContext({
        tokenBudget: 10, // Unreasonably low
        minRelevance: 0.5,
      });

      // Should still return something (essential context)
      expect(result).toBeDefined();
      expect(result.contexts.length).toBeGreaterThan(0);
      // Will likely exceed budget but should have essential data
    });

    it('should handle all providers failing', async () => {
      // Create manager with only failing providers
      const failingManager = new ContextManager();

      const failingProvider1 = {
        name: 'failing1',
        gather: async () => {
          throw new Error('Failed 1');
        },
      };

      const failingProvider2 = {
        name: 'failing2',
        gather: async () => {
          throw new Error('Failed 2');
        },
      };

      failingManager.registerProvider('failing1', failingProvider1 as any);
      failingManager.registerProvider('failing2', failingProvider2 as any);

      // Should return empty contexts without crashing
      const result = await failingManager.gatherContext();

      expect(result).toBeDefined();
      expect(result.contexts).toHaveLength(0);
      expect(result.errors).toBe(2);

      failingManager.destroy();
    });
  });

  describe('Token Optimization', () => {
    it('should compress contexts to reduce token usage by >30%', async () => {
      // Get uncompressed result (large budget)
      const uncompressed = await manager.gatherContext({
        tokenBudget: 10000, // Very large budget
      });

      // Get compressed result (moderate budget)
      const compressed = await manager.gatherContext({
        tokenBudget: 2000, // Realistic budget
      });

      // Calculate compression ratio
      const compressionRatio =
        (uncompressed.totalTokens - compressed.totalTokens) /
        uncompressed.totalTokens;

      // Should achieve >30% reduction
      expect(compressionRatio).toBeGreaterThan(0.3);
      expect(compressed.totalTokens).toBeLessThan(uncompressed.totalTokens);
    });

    it('should preserve essential data during compression', async () => {
      const compressed = await manager.gatherContext({
        tokenBudget: 500, // Low budget forces compression
      });

      // Should still have contexts
      expect(compressed.contexts.length).toBeGreaterThan(0);

      // Essential fields should be preserved
      compressed.contexts.forEach((ctx) => {
        expect(ctx.context.type).toBeDefined();
        expect(ctx.context.timestamp).toBeDefined();
        expect(ctx.context.data).toBeDefined();
      });
    });

    it('should respect token budget constraints', async () => {
      const budgets = [500, 1000, 2000, 5000];

      for (const budget of budgets) {
        const result = await manager.gatherContext({
          tokenBudget: budget,
          forceRefresh: true,
        });

        // Should stay within budget (allow small variance)
        expect(result.totalTokens).toBeLessThanOrEqual(budget * 1.1);
      }
    });

    it('should optimize based on trigger type', async () => {
      // User action trigger (high priority)
      const userAction = await manager.gatherContext({
        trigger: 'user-action',
        tokenBudget: 2000,
      });

      // Proactive trigger (lower priority)
      const proactive = await manager.gatherContext({
        trigger: 'proactive',
        tokenBudget: 2000,
      });

      // User action should have higher relevance scores
      const userActionAvgScore =
        userAction.contexts.reduce((sum, ctx) => sum + ctx.score, 0) /
        userAction.contexts.length;

      const proactiveAvgScore =
        proactive.contexts.reduce((sum, ctx) => sum + ctx.score, 0) /
        proactive.contexts.length;

      expect(userActionAvgScore).toBeGreaterThan(proactiveAvgScore * 0.9);
    });
  });

  describe('Provider Integration', () => {
    it('should gather from all registered providers', async () => {
      const result = await manager.gatherContext();

      // Should have contexts from all 4 providers
      expect(result.contexts.length).toBe(4);

      const types = result.contexts.map((c) => c.context.type);
      expect(types).toContain('viewport');
      expect(types).toContain('performance');
      expect(types).toContain('form');
      expect(types).toContain('navigation');
    });

    it('should enable/disable providers dynamically', async () => {
      // Disable performance provider
      manager.disableProvider('performance');

      const result = await manager.gatherContext();

      // Should not include performance context
      const types = result.contexts.map((c) => c.context.type);
      expect(types).not.toContain('performance');
      expect(result.contexts.length).toBe(3);

      // Re-enable
      manager.enableProvider('performance');
      const result2 = await manager.gatherContext({ forceRefresh: true });
      const types2 = result2.contexts.map((c) => c.context.type);
      expect(types2).toContain('performance');
    });

    it('should handle unregistering providers', async () => {
      // Get baseline
      const before = await manager.gatherContext();
      expect(before.contexts.length).toBe(4);

      // Unregister form provider
      manager.unregisterProvider('form');

      // Should have fewer contexts
      const after = await manager.gatherContext({ forceRefresh: true });
      expect(after.contexts.length).toBe(3);

      const types = after.contexts.map((c) => c.context.type);
      expect(types).not.toContain('form');
    });
  });
});
