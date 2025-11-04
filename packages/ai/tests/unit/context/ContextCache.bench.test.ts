/**
 * Performance benchmarks for ContextCache
 *
 * Run with: npm test -- ContextCache.benchmark.ts
 *
 * Performance targets:
 * - Cache hit retrieval: <10ms
 * - Cache set operation: <5ms
 * - TTL cleanup: <5ms
 * - Memory usage: <10MB total
 * - Cache hit rate target: >70% in typical usage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryContextCache } from '../../../src/context/ContextCache';
import type { ContextData } from '../../../src/context/ContextProvider';

function createTestContext(provider: string, data: any = {}): ContextData {
  return {
    provider,
    timestamp: new Date(),
    data: {
      test: true,
      ...data,
    },
  };
}

describe('ContextCache Performance Benchmarks', () => {
  let cache: MemoryContextCache;

  beforeEach(() => {
    cache = new MemoryContextCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Cache Operations Performance', () => {
    it('should complete cache hit retrieval in <10ms', async () => {
      const context = createTestContext('test', { data: 'x'.repeat(1000) });
      await cache.set('test-key', context);

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await cache.get('test-key');
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      console.log(`Average cache hit retrieval time: ${avgTime.toFixed(3)}ms`);
      expect(avgTime).toBeLessThan(10);
    });

    it('should complete cache set operation in <5ms', async () => {
      const iterations = 100;
      const contexts = Array.from({ length: iterations }, (_, i) =>
        createTestContext(`test-${i}`, { data: 'x'.repeat(1000) })
      );

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await cache.set(`key-${i}`, contexts[i]);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      console.log(`Average cache set operation time: ${avgTime.toFixed(3)}ms`);
      expect(avgTime).toBeLessThan(5);
    });

    it('should complete has() check in <5ms', async () => {
      // Pre-populate cache
      for (let i = 0; i < 50; i++) {
        await cache.set(`key-${i}`, createTestContext(`test-${i}`));
      }

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await cache.has(`key-${i % 50}`);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      console.log(`Average has() check time: ${avgTime.toFixed(3)}ms`);
      expect(avgTime).toBeLessThan(5);
    });

    it('should complete invalidation in <5ms', async () => {
      // Pre-populate cache
      for (let i = 0; i < 50; i++) {
        await cache.set(`key-${i}`, createTestContext(`test-${i}`));
      }

      const iterations = 50;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await cache.invalidate(`key-${i}`);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      console.log(`Average invalidation time: ${avgTime.toFixed(3)}ms`);
      expect(avgTime).toBeLessThan(5);
    });
  });

  describe('Memory Usage', () => {
    it('should stay within memory limits', async () => {
      const limitedCache = new MemoryContextCache({
        maxSizeMB: 5, // 5MB limit
      });

      // Add many entries
      for (let i = 0; i < 100; i++) {
        await limitedCache.set(
          `key-${i}`,
          createTestContext(`test-${i}`, {
            large: 'x'.repeat(10000), // ~10KB per entry
          })
        );
      }

      const stats = limitedCache.getStats();
      console.log(`Memory usage: ${stats.memoryUsageMB.toFixed(3)}MB`);
      console.log(`Cache size: ${stats.size} entries`);
      console.log(`Evictions: ${stats.evictions}`);

      // Should be under limit
      expect(stats.memoryUsageMB).toBeLessThanOrEqual(5);

      limitedCache.destroy();
    });

    it('should efficiently manage memory with eviction', async () => {
      const smallCache = new MemoryContextCache({
        maxSizeMB: 0.1, // 100KB limit
        evictionPolicy: 'lru',
      });

      // Add entries that will exceed limit
      for (let i = 0; i < 50; i++) {
        await smallCache.set(
          `key-${i}`,
          createTestContext(`test-${i}`, {
            data: 'x'.repeat(2000), // ~2KB per entry
          })
        );
      }

      const stats = smallCache.getStats();
      console.log(`Final memory usage: ${stats.memoryUsageMB.toFixed(3)}MB`);
      console.log(`Final cache size: ${stats.size} entries`);
      console.log(`Total evictions: ${stats.evictions}`);

      // Should have evicted to stay under limit
      expect(stats.memoryUsageMB).toBeLessThanOrEqual(0.1);
      expect(stats.evictions).toBeGreaterThan(0);

      smallCache.destroy();
    });
  });

  describe('Cache Hit Rate', () => {
    it('should achieve >70% hit rate in typical usage pattern', async () => {
      // Simulate typical usage: repeated access to common contexts
      const commonKeys = ['dom', 'viewport', 'user-action', 'form', 'navigation'];

      // Initial population
      for (const key of commonKeys) {
        await cache.set(key, createTestContext(key));
      }

      // Simulate 100 context gathering operations
      // 80% access common contexts (cache hits)
      // 20% access new contexts (cache misses)
      for (let i = 0; i < 100; i++) {
        if (Math.random() < 0.8) {
          // 80% - access common context
          const key = commonKeys[Math.floor(Math.random() * commonKeys.length)];
          await cache.get(key);
        } else {
          // 20% - access new context
          await cache.get(`dynamic-${i}`);
        }
      }

      const stats = cache.getStats();
      console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
      console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);

      // Should achieve >70% hit rate
      expect(stats.hitRate).toBeGreaterThan(0.7);
    });
  });

  describe('High-Load Performance', () => {
    it('should handle 1000 operations efficiently', async () => {
      const operations = 1000;
      const start = performance.now();

      // Mix of operations
      for (let i = 0; i < operations; i++) {
        const op = i % 3;

        if (op === 0) {
          // Set
          await cache.set(`key-${i}`, createTestContext(`test-${i}`));
        } else if (op === 1) {
          // Get
          await cache.get(`key-${i - 1}`);
        } else {
          // Has
          await cache.has(`key-${i - 2}`);
        }
      }

      const duration = performance.now() - start;
      const avgTime = duration / operations;

      console.log(`Total time for ${operations} operations: ${duration.toFixed(2)}ms`);
      console.log(`Average time per operation: ${avgTime.toFixed(3)}ms`);

      const stats = cache.getStats();
      console.log(`Final cache size: ${stats.size} entries`);
      console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);

      // Should maintain good performance under load
      expect(avgTime).toBeLessThan(5);
    });

    it('should handle concurrent operations efficiently', async () => {
      const concurrentOps = 50;
      const start = performance.now();

      // Run many operations concurrently
      const promises = Array.from({ length: concurrentOps }, async (_, i) => {
        await cache.set(`key-${i}`, createTestContext(`test-${i}`));
        await cache.get(`key-${i}`);
        await cache.has(`key-${i}`);
      });

      await Promise.all(promises);

      const duration = performance.now() - start;
      console.log(
        `Time for ${concurrentOps} concurrent operation sets: ${duration.toFixed(2)}ms`
      );

      const stats = cache.getStats();
      console.log(`Final cache size: ${stats.size} entries`);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Real-World Simulation', () => {
    it('should perform well in realistic context gathering scenario', async () => {
      // Simulate a web application with multiple context types
      const contextTypes = [
        { key: 'dom', updateFreq: 0.3 }, // 30% of time
        { key: 'viewport', updateFreq: 0.2 }, // 20% of time
        { key: 'user-action', updateFreq: 0.25 }, // 25% of time
        { key: 'form', updateFreq: 0.15 }, // 15% of time
        { key: 'navigation', updateFreq: 0.1 }, // 10% of time
      ];

      const totalOps = 200;
      let cacheHits = 0;
      let cacheMisses = 0;

      const start = performance.now();

      for (let i = 0; i < totalOps; i++) {
        // Select context type based on frequency
        const rand = Math.random();
        let cumulative = 0;
        let selectedType = contextTypes[0];

        for (const type of contextTypes) {
          cumulative += type.updateFreq;
          if (rand <= cumulative) {
            selectedType = type;
            break;
          }
        }

        // Try to get from cache
        const cached = await cache.get(selectedType.key);

        if (cached) {
          cacheHits++;
        } else {
          cacheMisses++;
          // Cache miss - gather and cache
          const context = createTestContext(selectedType.key, {
            data: 'x'.repeat(1000),
          });
          await cache.set(selectedType.key, context);
        }

        // Occasionally invalidate to simulate DOM changes
        if (Math.random() < 0.05) {
          // 5% chance
          await cache.invalidate('dom');
        }
      }

      const duration = performance.now() - start;
      const avgTime = duration / totalOps;
      const hitRate = cacheHits / (cacheHits + cacheMisses);

      console.log('\n--- Real-World Simulation Results ---');
      console.log(`Total operations: ${totalOps}`);
      console.log(`Total time: ${duration.toFixed(2)}ms`);
      console.log(`Average time per operation: ${avgTime.toFixed(3)}ms`);
      console.log(`Cache hits: ${cacheHits}`);
      console.log(`Cache misses: ${cacheMisses}`);
      console.log(`Hit rate: ${(hitRate * 100).toFixed(1)}%`);

      const stats = cache.getStats();
      console.log(`Final cache size: ${stats.size} entries`);
      console.log(`Memory usage: ${stats.memoryUsageMB.toFixed(3)}MB`);

      // Performance assertions
      expect(avgTime).toBeLessThan(10); // Average <10ms
      expect(hitRate).toBeGreaterThan(0.5); // >50% hit rate realistic
    });
  });
});
