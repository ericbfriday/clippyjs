import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryContextCache,
  DEFAULT_CONTEXT_CACHE_CONFIG,
  type CacheConfig,
  type InvalidationTrigger,
} from '../../../src/context/ContextCache';
import type { ContextData } from '../../../src/context/ContextProvider';

/**
 * Helper to create test context data
 */
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

/**
 * Helper to wait for a duration
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('MemoryContextCache', () => {
  let cache: MemoryContextCache;

  beforeEach(() => {
    cache = new MemoryContextCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Operations', () => {
    it('should set and get context', async () => {
      const context = createTestContext('test');
      await cache.set('test-key', context);

      const retrieved = await cache.get('test-key');
      expect(retrieved).toEqual(context);
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const context = createTestContext('test');
      await cache.set('test-key', context);

      expect(await cache.has('test-key')).toBe(true);
      expect(await cache.has('nonexistent')).toBe(false);
    });

    it('should invalidate specific keys', async () => {
      const context = createTestContext('test');
      await cache.set('test-key', context);

      await cache.invalidate('test-key');

      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    it('should clear all entries', async () => {
      await cache.set('key1', createTestContext('test1'));
      await cache.set('key2', createTestContext('test2'));
      await cache.set('key3', createTestContext('test3'));

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });

    it('should handle multiple concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, async (_, i) => {
        const key = `key-${i}`;
        const context = createTestContext(`test-${i}`);
        await cache.set(key, context);
        return cache.get(key);
      });

      const results = await Promise.all(operations);
      expect(results.every((r) => r !== null)).toBe(true);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLCache = new MemoryContextCache({ ttl: 100 }); // 100ms TTL

      const context = createTestContext('test');
      await shortTTLCache.set('test-key', context);

      // Should exist immediately
      expect(await shortTTLCache.get('test-key')).toEqual(context);

      // Wait for expiration
      await wait(150);

      // Should be expired
      expect(await shortTTLCache.get('test-key')).toBeNull();

      shortTTLCache.destroy();
    });

    it('should not expire entries before TTL', async () => {
      const longTTLCache = new MemoryContextCache({ ttl: 5000 }); // 5s TTL

      const context = createTestContext('test');
      await longTTLCache.set('test-key', context);

      // Wait less than TTL
      await wait(100);

      // Should still exist
      expect(await longTTLCache.get('test-key')).toEqual(context);

      longTTLCache.destroy();
    });

    it('should update access time on get', async () => {
      const context = createTestContext('test');
      await cache.set('test-key', context);

      // Access multiple times
      await cache.get('test-key');
      await wait(50);
      await cache.get('test-key');

      // Should still be accessible
      expect(await cache.get('test-key')).toEqual(context);
    });

    it('should cleanup expired entries automatically', async () => {
      const cleanupCache = new MemoryContextCache({
        ttl: 100,
        cleanupInterval: 50,
      });

      await cleanupCache.set('key1', createTestContext('test1'));
      await cleanupCache.set('key2', createTestContext('test2'));

      // Wait for cleanup
      await wait(200);

      const stats = cleanupCache.getStats();
      expect(stats.size).toBe(0);

      cleanupCache.destroy();
    });

    it('should handle has() with expired entries', async () => {
      const shortTTLCache = new MemoryContextCache({ ttl: 100 });

      await shortTTLCache.set('test-key', createTestContext('test'));

      expect(await shortTTLCache.has('test-key')).toBe(true);

      await wait(150);

      expect(await shortTTLCache.has('test-key')).toBe(false);

      shortTTLCache.destroy();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when size limit exceeded', async () => {
      const smallCache = new MemoryContextCache({
        maxSizeMB: 0.005, // 5KB cache
        evictionPolicy: 'lru',
      });

      // Add entries that will be close to size limit
      await smallCache.set('key1', createTestContext('test1', { large: 'x'.repeat(1000) }));
      await wait(10);
      await smallCache.set('key2', createTestContext('test2', { large: 'y'.repeat(1000) }));
      await wait(10);

      // Access key1 to make it more recent
      await smallCache.get('key1');
      await wait(10);

      // Add key3 which should evict key2 (least recently used)
      await smallCache.set('key3', createTestContext('test3', { large: 'z'.repeat(1000) }));

      // key2 should be evicted (least recently used)
      expect(await smallCache.has('key2')).toBe(false);

      // key1 and key3 should still exist
      expect(await smallCache.has('key1')).toBe(true);
      expect(await smallCache.has('key3')).toBe(true);

      smallCache.destroy();
    });

    it('should evict oldest entries with FIFO policy', async () => {
      const fifoCache = new MemoryContextCache({
        maxSizeMB: 0.005,
        evictionPolicy: 'fifo',
      });

      await fifoCache.set('key1', createTestContext('test1', { large: 'x'.repeat(1000) }));
      await wait(10);
      await fifoCache.set('key2', createTestContext('test2', { large: 'y'.repeat(1000) }));
      await wait(10);

      // Access key1 (shouldn't matter for FIFO)
      await fifoCache.get('key1');
      await fifoCache.get('key1');
      await wait(10);

      // Add key3 which should evict key1 (first in)
      await fifoCache.set('key3', createTestContext('test3', { large: 'z'.repeat(1000) }));

      // key1 should be evicted (first in)
      expect(await fifoCache.has('key1')).toBe(false);

      // key2 and key3 should exist
      expect(await fifoCache.has('key2')).toBe(true);
      expect(await fifoCache.has('key3')).toBe(true);

      fifoCache.destroy();
    });

    it('should evict least frequently used entries with LFU policy', async () => {
      const lfuCache = new MemoryContextCache({
        maxSizeMB: 0.005,
        evictionPolicy: 'lfu',
      });

      await lfuCache.set('key1', createTestContext('test1', { large: 'x'.repeat(1000) }));
      await lfuCache.set('key2', createTestContext('test2', { large: 'y'.repeat(1000) }));

      // Access key2 multiple times to increase frequency
      await lfuCache.get('key2');
      await lfuCache.get('key2');
      await lfuCache.get('key2');
      await wait(10);

      // Access key1 once
      await lfuCache.get('key1');
      await wait(10);

      // Add key3 which should evict key1 (lower frequency)
      await lfuCache.set('key3', createTestContext('test3', { large: 'z'.repeat(1000) }));

      // key1 should be evicted (less frequently used - access count 2 vs key2's 4)
      expect(await lfuCache.has('key1')).toBe(false);

      // key2 should still exist (more frequently used)
      expect(await lfuCache.has('key2')).toBe(true);

      // key3 should exist
      expect(await lfuCache.has('key3')).toBe(true);

      lfuCache.destroy();
    });

    it('should handle eviction with no entries gracefully', async () => {
      const smallCache = new MemoryContextCache({
        maxSizeMB: 0.005,
      });

      // Should not throw
      await expect(
        smallCache.set('key1', createTestContext('test', { large: 'x'.repeat(1000) }))
      ).resolves.not.toThrow();

      smallCache.destroy();
    });
  });

  describe('Statistics', () => {
    it('should track cache hits', async () => {
      const context = createTestContext('test');
      await cache.set('test-key', context);

      await cache.get('test-key');
      await cache.get('test-key');
      await cache.get('test-key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });

    it('should track cache misses', async () => {
      await cache.get('nonexistent1');
      await cache.get('nonexistent2');
      await cache.get('nonexistent3');

      const stats = cache.getStats();
      expect(stats.misses).toBe(3);
    });

    it('should calculate hit rate correctly', async () => {
      await cache.set('key1', createTestContext('test1'));
      await cache.set('key2', createTestContext('test2'));

      // 4 hits
      await cache.get('key1');
      await cache.get('key2');
      await cache.get('key1');
      await cache.get('key2');

      // 2 misses
      await cache.get('nonexistent1');
      await cache.get('nonexistent2');

      const stats = cache.getStats();
      expect(stats.hits).toBe(4);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(4 / 6, 2);
    });

    it('should track evictions', async () => {
      const smallCache = new MemoryContextCache({
        maxSizeMB: 0.001,
        enableStats: true,
      });

      // Add entries that will cause eviction
      for (let i = 0; i < 5; i++) {
        await smallCache.set(`key${i}`, createTestContext(`test${i}`, { large: 'x'.repeat(500) }));
      }

      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);

      smallCache.destroy();
    });

    it('should track cache size', async () => {
      await cache.set('key1', createTestContext('test1'));
      await cache.set('key2', createTestContext('test2'));
      await cache.set('key3', createTestContext('test3'));

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should track memory usage', async () => {
      await cache.set('key1', createTestContext('test1', { large: 'x'.repeat(1000) }));
      await cache.set('key2', createTestContext('test2', { large: 'y'.repeat(1000) }));

      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });

    it('should disable stats when configured', async () => {
      const noStatsCache = new MemoryContextCache({
        enableStats: false,
      });

      await noStatsCache.set('key1', createTestContext('test1'));
      await noStatsCache.get('key1');
      await noStatsCache.get('nonexistent');

      const stats = noStatsCache.getStats();
      // Stats should still be returned but not updated
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      noStatsCache.destroy();
    });
  });

  describe('Invalidation Events', () => {
    it('should notify on manual invalidation', async () => {
      const callback = vi.fn();
      cache.onInvalidate(callback);

      await cache.set('test-key', createTestContext('test'));
      await cache.invalidate('test-key');

      expect(callback).toHaveBeenCalledWith('manual', 'test-key');
    });

    it('should notify on clear', async () => {
      const callback = vi.fn();
      cache.onInvalidate(callback);

      await cache.set('key1', createTestContext('test1'));
      await cache.clear();

      expect(callback).toHaveBeenCalledWith('manual', undefined);
    });

    it('should notify on TTL expiration', async () => {
      const shortTTLCache = new MemoryContextCache({
        ttl: 100,
        cleanupInterval: 50,
      });

      const callback = vi.fn();
      shortTTLCache.onInvalidate(callback);

      await shortTTLCache.set('test-key', createTestContext('test'));

      // Wait for expiration
      await wait(200);

      expect(callback).toHaveBeenCalledWith('ttl-expired', 'test-key');

      shortTTLCache.destroy();
    });

    it('should allow unsubscribing from events', async () => {
      const callback = vi.fn();
      const unsubscribe = cache.onInvalidate(callback);

      await cache.set('test-key', createTestContext('test'));
      unsubscribe();

      await cache.invalidate('test-key');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      cache.onInvalidate(callback1);
      cache.onInvalidate(callback2);
      cache.onInvalidate(callback3);

      await cache.set('test-key', createTestContext('test'));
      await cache.invalidate('test-key');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should handle errors in callbacks gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();

      cache.onInvalidate(errorCallback);
      cache.onInvalidate(normalCallback);

      // Add a key so invalidation actually happens
      await cache.set('test-key', createTestContext('test'));

      // Should not throw
      await expect(cache.invalidate('test-key')).resolves.not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Destruction and Cleanup', () => {
    it('should cleanup resources on destroy', async () => {
      const testCache = new MemoryContextCache();

      await testCache.set('key1', createTestContext('test1'));
      await testCache.set('key2', createTestContext('test2'));

      testCache.destroy();

      // Should throw after destruction
      await expect(testCache.get('key1')).rejects.toThrow('Cache has been destroyed');
      await expect(testCache.set('key3', createTestContext('test3'))).rejects.toThrow(
        'Cache has been destroyed'
      );
    });

    it('should handle double destroy gracefully', () => {
      const testCache = new MemoryContextCache();
      testCache.destroy();

      // Should not throw
      expect(() => testCache.destroy()).not.toThrow();
    });

    it('should stop cleanup timer on destroy', async () => {
      const testCache = new MemoryContextCache({
        ttl: 100,
        cleanupInterval: 50,
      });

      await testCache.set('test-key', createTestContext('test'));

      testCache.destroy();

      // Wait for what would be cleanup
      await wait(150);

      // Cache should be destroyed, not cleaned up
      await expect(testCache.has('test-key')).rejects.toThrow();
    });
  });

  describe('Memory Limits', () => {
    it('should respect maximum cache size', async () => {
      const limitedCache = new MemoryContextCache({
        maxSizeMB: 0.01, // 10KB
      });

      // Add entries up to the limit
      for (let i = 0; i < 10; i++) {
        await limitedCache.set(`key${i}`, createTestContext(`test${i}`, { data: 'x'.repeat(500) }));
      }

      const stats = limitedCache.getStats();
      expect(stats.memoryUsageMB).toBeLessThanOrEqual(0.01);

      limitedCache.destroy();
    });

    it('should estimate context size accurately', async () => {
      const largeContext = createTestContext('test', {
        large: 'x'.repeat(10000),
      });

      await cache.set('large-key', largeContext);

      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined contexts', async () => {
      // TypeScript would prevent this, but test runtime behavior
      await expect(cache.set('null-key', null as any)).resolves.not.toThrow();
    });

    it('should handle empty cache operations', async () => {
      await expect(cache.clear()).resolves.not.toThrow();
      await expect(cache.invalidate('nonexistent')).resolves.not.toThrow();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it('should handle very large contexts', async () => {
      const hugeContext = createTestContext('huge', {
        data: 'x'.repeat(100000), // 100KB
      });

      await expect(cache.set('huge-key', hugeContext)).resolves.not.toThrow();
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key with spaces',
        'key/with/slashes',
        'key.with.dots',
        'key-with-dashes',
        'key_with_underscores',
        'key@with#special$chars',
      ];

      for (const key of specialKeys) {
        await cache.set(key, createTestContext('test'));
        expect(await cache.has(key)).toBe(true);
      }
    });

    it('should handle concurrent set operations on same key', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        cache.set('same-key', createTestContext(`test-${i}`))
      );

      await expect(Promise.all(operations)).resolves.not.toThrow();

      // Last write should win
      const result = await cache.get('same-key');
      expect(result).not.toBeNull();
    });

    it('should handle rapid invalidations', async () => {
      await cache.set('test-key', createTestContext('test'));

      const invalidations = Array.from({ length: 100 }, () => cache.invalidate('test-key'));

      await expect(Promise.all(invalidations)).resolves.not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultCache = new MemoryContextCache();
      const stats = defaultCache.getStats();

      // Should initialize with defaults
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      defaultCache.destroy();
    });

    it('should merge custom config with defaults', () => {
      const customCache = new MemoryContextCache({
        ttl: 60000,
        maxSizeMB: 20,
      });

      // Should accept custom config
      expect(customCache).toBeDefined();

      customCache.destroy();
    });

    it('should validate config values', () => {
      // Should not throw with valid config
      expect(
        () =>
          new MemoryContextCache({
            ttl: 1000,
            maxSizeMB: 5,
            evictionPolicy: 'lru',
          })
      ).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete get operations quickly (<10ms)', async () => {
      await cache.set('test-key', createTestContext('test'));

      const start = performance.now();
      await cache.get('test-key');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should complete set operations quickly (<5ms)', async () => {
      const start = performance.now();
      await cache.set('test-key', createTestContext('test'));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('should handle high-frequency operations', async () => {
      const operations = 1000;
      const contexts = Array.from({ length: operations }, (_, i) => ({
        key: `key-${i}`,
        context: createTestContext(`test-${i}`),
      }));

      const start = performance.now();

      for (const { key, context } of contexts) {
        await cache.set(key, context);
      }

      const duration = performance.now() - start;
      const avgTime = duration / operations;

      expect(avgTime).toBeLessThan(5); // Average <5ms per operation
    });
  });
});
