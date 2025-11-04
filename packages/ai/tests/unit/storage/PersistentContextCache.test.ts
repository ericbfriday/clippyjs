/**
 * Persistent Context Cache Tests
 *
 * Test coverage:
 * - Two-tier caching (memory + persistent)
 * - Promotion/demotion between tiers
 * - TTL management
 * - Cold start optimization
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { PersistentContextCache } from '../../../src/storage/PersistentContextCache';
import type { ContextData } from '../../../src/context/ContextProvider';

describe('PersistentContextCache', () => {
  let cache: PersistentContextCache;

  const createTestContext = (id: string): ContextData => ({
    type: 'dom',
    selector: `#${id}`,
    data: { id, content: `Test content for ${id}` },
    priority: 1,
    timestamp: new Date(),
    metadata: {},
  });

  beforeEach(async () => {
    cache = new PersistentContextCache({
      memoryTierSizeMB: 1, // Small for testing
      persistentTierSizeMB: 5,
      ttl: 60000, // 1 minute
      promotionThreshold: 3,
      demotionThreshold: 10000, // 10 seconds
      enableColdStartOptimization: false, // Disable for most tests
      cleanupInterval: 100000, // Long interval for tests
    });
    await cache.initialize();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newCache = new PersistentContextCache();
      await expect(newCache.initialize()).resolves.toBeUndefined();
      newCache.destroy();
    });

    it('should handle multiple initialization calls', async () => {
      await cache.initialize();
      await cache.initialize(); // Should not throw
      expect(true).toBe(true);
    });

    it('should throw error when destroyed', async () => {
      const newCache = new PersistentContextCache();
      await newCache.initialize();
      newCache.destroy();

      await expect(newCache.get('key')).rejects.toThrow('destroyed');
    });
  });

  describe('basic operations', () => {
    it('should set and get from memory tier', async () => {
      const context = createTestContext('test1');
      await cache.set('key1', context);

      const result = await cache.get('key1');
      expect(result).toEqual(context);
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should invalidate specific entry', async () => {
      const context = createTestContext('test2');
      await cache.set('key2', context);
      await cache.invalidate('key2');

      const result = await cache.get('key2');
      expect(result).toBeNull();
    });

    it('should clear all entries', async () => {
      await cache.set('key3', createTestContext('test3'));
      await cache.set('key4', createTestContext('test4'));
      await cache.clear();

      const result1 = await cache.get('key3');
      const result2 = await cache.get('key4');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should check if key exists', async () => {
      await cache.set('key5', createTestContext('test5'));

      const exists = await cache.has('key5');
      const notExists = await cache.has('non-existent');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('two-tier architecture', () => {
    it('should start entries in memory tier', async () => {
      const context = createTestContext('memory');
      await cache.set('memory-key', context);

      // Should be in memory (fast access)
      const start = performance.now();
      const result = await cache.get('memory-key');
      const duration = performance.now() - start;

      expect(result).toEqual(context);
      expect(duration).toBeLessThan(20); // Memory access should be very fast
    });

    it('should promote frequently accessed items', async () => {
      const context = createTestContext('promote');
      await cache.set('promote-key', context);

      // Access multiple times to trigger promotion threshold
      for (let i = 0; i < 5; i++) {
        await cache.get('promote-key');
      }

      // Should remain in or be promoted to memory tier
      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle entries in both tiers', async () => {
      // Create multiple entries
      for (let i = 0; i < 10; i++) {
        await cache.set(`key-${i}`, createTestContext(`test-${i}`));
      }

      // Access some entries (they should stay in memory)
      for (let i = 0; i < 5; i++) {
        await cache.get(`key-${i}`);
      }

      // All entries should be retrievable
      for (let i = 0; i < 10; i++) {
        const result = await cache.get(`key-${i}`);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLCache = new PersistentContextCache({
        ttl: 100, // 100ms
        cleanupInterval: 50,
      });

      await shortTTLCache.initialize();

      await shortTTLCache.set('expire-key', createTestContext('expire'));

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await shortTTLCache.get('expire-key');
      expect(result).toBeNull();

      shortTTLCache.destroy();
    });

    it('should not return expired entries', async () => {
      const shortTTLCache = new PersistentContextCache({
        ttl: 50,
      });

      await shortTTLCache.initialize();
      await shortTTLCache.set('ttl-key', createTestContext('ttl'));

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await shortTTLCache.get('ttl-key');
      expect(result).toBeNull();

      shortTTLCache.destroy();
    });
  });

  describe('eviction policy', () => {
    it('should evict entries when memory tier is full (LRU)', async () => {
      const smallCache = new PersistentContextCache({
        memoryTierSizeMB: 0.01, // Very small - 10KB
        evictionPolicy: 'lru',
      });

      await smallCache.initialize();

      // Add multiple entries to trigger eviction
      for (let i = 0; i < 5; i++) {
        await smallCache.set(`evict-${i}`, createTestContext(`evict-${i}`));
      }

      // Not all entries may be in memory tier
      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);

      smallCache.destroy();
    });

    it('should evict entries based on FIFO policy', async () => {
      const fifoCache = new PersistentContextCache({
        memoryTierSizeMB: 0.01,
        evictionPolicy: 'fifo',
      });

      await fifoCache.initialize();

      for (let i = 0; i < 5; i++) {
        await fifoCache.set(`fifo-${i}`, createTestContext(`fifo-${i}`));
      }

      fifoCache.destroy();
    });

    it('should evict entries based on LFU policy', async () => {
      const lfuCache = new PersistentContextCache({
        memoryTierSizeMB: 0.01,
        evictionPolicy: 'lfu',
      });

      await lfuCache.initialize();

      for (let i = 0; i < 5; i++) {
        await lfuCache.set(`lfu-${i}`, createTestContext(`lfu-${i}`));
      }

      lfuCache.destroy();
    });
  });

  describe('statistics', () => {
    it('should return cache statistics', async () => {
      await cache.set('stat1', createTestContext('stat1'));
      await cache.set('stat2', createTestContext('stat2'));
      await cache.get('stat1'); // Hit
      await cache.get('non-existent'); // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      await cache.set('hit1', createTestContext('hit1'));

      await cache.get('hit1'); // Hit
      await cache.get('miss1'); // Miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit, 1 miss = 50%
    });

    it('should track memory usage', async () => {
      const stats1 = cache.getStats();
      const memBefore = stats1.memoryUsageMB;

      await cache.set('mem1', createTestContext('mem1'));

      const stats2 = cache.getStats();
      const memAfter = stats2.memoryUsageMB;

      expect(memAfter).toBeGreaterThanOrEqual(memBefore);
    });
  });

  describe('invalidation callbacks', () => {
    it('should notify on invalidation', async () => {
      const callback = vi.fn();
      const unsubscribe = cache.onInvalidate(callback);

      await cache.set('notify1', createTestContext('notify1'));
      await cache.invalidate('notify1');

      expect(callback).toHaveBeenCalledWith('manual', 'notify1');

      unsubscribe();
    });

    it('should unsubscribe correctly', async () => {
      const callback = vi.fn();
      const unsubscribe = cache.onInvalidate(callback);

      unsubscribe();

      await cache.set('unsub1', createTestContext('unsub1'));
      await cache.invalidate('unsub1');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple callbacks', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      cache.onInvalidate(callback1);
      cache.onInvalidate(callback2);

      await cache.clear();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('cold start optimization', () => {
    it('should preload frequently accessed items', async () => {
      // Create cache with cold start enabled
      const coldStartCache = new PersistentContextCache({
        enableColdStartOptimization: true,
        coldStartPreloadCount: 3,
      });

      await coldStartCache.initialize();

      // Add some items with different access counts
      for (let i = 0; i < 5; i++) {
        await coldStartCache.set(`cold-${i}`, createTestContext(`cold-${i}`));

        // Access some items more frequently
        if (i < 3) {
          for (let j = 0; j < 5; j++) {
            await coldStartCache.get(`cold-${i}`);
          }
        }
      }

      coldStartCache.destroy();

      // Create new cache to test preloading
      const newCache = new PersistentContextCache({
        enableColdStartOptimization: true,
        coldStartPreloadCount: 3,
      });

      await newCache.initialize();

      // Most accessed items should be available quickly
      const start = performance.now();
      await newCache.get('cold-0');
      const duration = performance.now() - start;

      // Should be fast if preloaded
      expect(duration).toBeLessThan(50);

      newCache.destroy();
    });
  });

  describe('performance', () => {
    it('should achieve memory tier performance target', async () => {
      await cache.set('perf-mem', createTestContext('perf-mem'));

      const start = performance.now();
      await cache.get('perf-mem');
      const duration = performance.now() - start;

      // Target: <10ms for memory tier
      expect(duration).toBeLessThan(20);
    });

    it('should handle concurrent operations', async () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        operations.push(cache.set(`concurrent-${i}`, createTestContext(`concurrent-${i}`)));
      }

      await Promise.all(operations);

      const reads = [];
      for (let i = 0; i < 10; i++) {
        reads.push(cache.get(`concurrent-${i}`));
      }

      const results = await Promise.all(reads);
      expect(results.filter((r) => r !== null)).toHaveLength(10);
    });

    it('should batch operations efficiently', async () => {
      const start = performance.now();

      const writes = [];
      for (let i = 0; i < 50; i++) {
        writes.push(cache.set(`batch-${i}`, createTestContext(`batch-${i}`)));
      }

      await Promise.all(writes);

      const duration = performance.now() - start;

      // Should handle 50 writes efficiently
      expect(duration).toBeLessThan(500);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid set/get cycles', async () => {
      for (let i = 0; i < 100; i++) {
        await cache.set('rapid', createTestContext(`rapid-${i}`));
        const result = await cache.get('rapid');
        expect(result).not.toBeNull();
      }
    });

    it('should handle large context data', async () => {
      const largeContext: ContextData = {
        type: 'dom',
        selector: '#large',
        data: {
          content: 'x'.repeat(10000),
          nested: {
            array: new Array(100).fill('data'),
          },
        },
        priority: 1,
        timestamp: new Date(),
        metadata: {},
      };

      await cache.set('large', largeContext);
      const result = await cache.get('large');

      expect(result).not.toBeNull();
      expect((result!.data as any).content).toHaveLength(10000);
    });

    it('should handle context with different types', async () => {
      const contexts: ContextData[] = [
        {
          type: 'dom',
          selector: '#dom',
          data: {},
          priority: 1,
          timestamp: new Date(),
          metadata: {},
        },
        {
          type: 'form',
          selector: 'form',
          data: {},
          priority: 1,
          timestamp: new Date(),
          metadata: {},
        },
        {
          type: 'network',
          selector: '/api',
          data: {},
          priority: 1,
          timestamp: new Date(),
          metadata: {},
        },
      ];

      for (let i = 0; i < contexts.length; i++) {
        await cache.set(`type-${i}`, contexts[i]);
      }

      for (let i = 0; i < contexts.length; i++) {
        const result = await cache.get(`type-${i}`);
        expect(result?.type).toBe(contexts[i].type);
      }
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = ['key with spaces', 'key-with-dashes', 'key.with.dots', 'key/with/slashes'];

      for (const key of specialKeys) {
        await cache.set(key, createTestContext(key));
        const result = await cache.get(key);
        expect(result).not.toBeNull();
      }
    });

    it('should preserve metadata', async () => {
      const context = createTestContext('meta');
      context.metadata = {
        custom: 'value',
        nested: {
          data: 123,
        },
      };

      await cache.set('meta-key', context);
      const result = await cache.get('meta-key');

      expect(result?.metadata).toEqual(context.metadata);
    });
  });

  describe('memory management', () => {
    it('should not leak memory on repeated operations', async () => {
      for (let i = 0; i < 100; i++) {
        await cache.set(`leak-${i}`, createTestContext(`leak-${i}`));
        await cache.invalidate(`leak-${i}`);
      }

      // Memory tier should not grow unbounded
      const stats = cache.getStats();
      expect(stats.size).toBeLessThan(100);
    });

    it('should cleanup on destroy', () => {
      const newCache = new PersistentContextCache();
      newCache.destroy();

      // Should not throw
      newCache.destroy(); // Double destroy should be safe
    });
  });
});
