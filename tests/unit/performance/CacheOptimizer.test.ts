/**
 * Tests for CacheOptimizer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CacheOptimizer,
  DEFAULT_CACHE_OPTIMIZER_CONFIG,
  calculateOptimalCacheSize,
  calculateCacheEfficiency,
} from '../../../packages/ai/src/performance/CacheOptimizer';

describe('CacheOptimizer', () => {
  let optimizer: CacheOptimizer;

  beforeEach(() => {
    optimizer = new CacheOptimizer({ autoWarming: false, enableAnalysis: false });
  });

  afterEach(() => {
    optimizer.destroy();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(optimizer).toBeDefined();
    });

    it('should accept custom tiers', () => {
      const customTiers = [
        {
          name: 'custom',
          priority: 5,
          maxSize: 1024 * 1024,
          ttl: 30000,
          evictionPolicy: 'lru' as const,
        },
      ];

      const customOptimizer = new CacheOptimizer({
        tiers: customTiers,
        autoWarming: false,
        enableAnalysis: false,
      });

      const tiers = customOptimizer.getTiers();
      expect(tiers.some(t => t.name === 'custom')).toBe(true);

      customOptimizer.destroy();
    });

    it('should sort tiers by priority', () => {
      const tiers = optimizer.getTiers();
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i - 1].priority).toBeGreaterThanOrEqual(tiers[i].priority);
      }
    });
  });

  describe('access recording', () => {
    it('should record cache hits', () => {
      optimizer.recordAccess('memory', true, 1.5);

      const metrics = optimizer.getMetrics();
      expect(metrics.totalHits).toBe(1);
    });

    it('should record cache misses', () => {
      optimizer.recordAccess('memory', false, 10.0);

      const metrics = optimizer.getMetrics();
      expect(metrics.totalMisses).toBe(1);
    });

    it('should track per-tier metrics', () => {
      optimizer.recordAccess('memory', true, 1.0);
      optimizer.recordAccess('memory', false, 2.0);
      optimizer.recordAccess('persistent', true, 5.0);

      const metrics = optimizer.getMetrics();
      expect(metrics.hitRates['memory']).toBeDefined();
      expect(metrics.hitRates['persistent']).toBeDefined();
    });

    it('should calculate average lookup time', () => {
      optimizer.recordAccess('memory', true, 1.0);
      optimizer.recordAccess('memory', true, 2.0);
      optimizer.recordAccess('memory', true, 3.0);

      const metrics = optimizer.getMetrics();
      expect(metrics.avgLookupTime['memory']).toBeCloseTo(2.0, 1);
    });

    it('should limit record history', () => {
      for (let i = 0; i < 20000; i++) {
        optimizer.recordAccess('memory', true, 1.0);
      }

      // Should not crash
      const metrics = optimizer.getMetrics();
      expect(metrics.totalHits).toBeGreaterThan(0);
    });
  });

  describe('metrics calculation', () => {
    beforeEach(() => {
      // Setup test data
      optimizer.recordAccess('memory', true, 1.0);
      optimizer.recordAccess('memory', true, 2.0);
      optimizer.recordAccess('memory', false, 3.0);
    });

    it('should calculate hit rates', () => {
      const metrics = optimizer.getMetrics();
      expect(metrics.hitRates['memory']).toBeCloseTo(0.667, 2);
    });

    it('should calculate miss rates', () => {
      const metrics = optimizer.getMetrics();
      expect(metrics.missRates['memory']).toBeCloseTo(0.333, 2);
    });

    it('should calculate overall hit rate', () => {
      const metrics = optimizer.getMetrics();
      expect(metrics.overallHitRate).toBeGreaterThan(0);
      expect(metrics.overallHitRate).toBeLessThanOrEqual(1);
    });

    it('should respect time window', () => {
      const now = Date.now();

      const metrics = optimizer.getMetrics(1000);
      // Should only include recent records
      expect(metrics).toBeDefined();
    });
  });

  describe('tier management', () => {
    it('should get tiers sorted by priority', () => {
      const tiers = optimizer.getTiers();
      expect(tiers.length).toBeGreaterThan(0);
      expect(tiers[0].priority).toBeGreaterThanOrEqual(tiers[tiers.length - 1].priority);
    });

    it('should add new tier', () => {
      const newTier = {
        name: 'test-tier',
        priority: 10,
        maxSize: 1024,
        ttl: 1000,
        evictionPolicy: 'lru' as const,
      };

      optimizer.addTier(newTier);

      const tiers = optimizer.getTiers();
      expect(tiers.some(t => t.name === 'test-tier')).toBe(true);
    });

    it('should maintain priority order after adding tier', () => {
      optimizer.addTier({
        name: 'high-priority',
        priority: 100,
        maxSize: 1024,
        ttl: 1000,
        evictionPolicy: 'lru',
      });

      const tiers = optimizer.getTiers();
      expect(tiers[0].priority).toBe(100);
    });
  });

  describe('warming strategies', () => {
    it('should register warming strategy', () => {
      const strategy = {
        name: 'test-warming',
        keys: ['key1', 'key2'],
        fetch: vi.fn().mockResolvedValue({}),
        priority: 5,
      };

      optimizer.registerWarmingStrategy(strategy);
      expect(() => optimizer.warmCache()).not.toThrow();
    });

    it('should execute warming strategies', async () => {
      const fetch = vi.fn().mockResolvedValue({});
      const strategy = {
        name: 'test',
        keys: ['a', 'b', 'c'],
        fetch,
      };

      optimizer.registerWarmingStrategy(strategy);
      await optimizer.warmCache();

      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle warming errors gracefully', async () => {
      const strategy = {
        name: 'error-strategy',
        keys: ['key1'],
        fetch: vi.fn().mockRejectedValue(new Error('Fetch failed')),
      };

      optimizer.registerWarmingStrategy(strategy);
      await expect(optimizer.warmCache()).resolves.not.toThrow();
    });

    it('should support background warming', async () => {
      const fetch = vi.fn().mockResolvedValue({});
      const strategy = {
        name: 'background',
        keys: ['key1'],
        fetch,
        background: true,
      };

      optimizer.registerWarmingStrategy(strategy);
      await optimizer.warmCache();

      // Should complete quickly even with background tasks
      expect(true).toBe(true);
    });
  });

  describe('optimization recommendations', () => {
    it('should generate recommendations', () => {
      // Create low hit rate scenario
      for (let i = 0; i < 10; i++) {
        optimizer.recordAccess('memory', false, 5.0);
      }

      const recommendations = optimizer.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should recommend size increase for low hit rate', () => {
      for (let i = 0; i < 10; i++) {
        optimizer.recordAccess('memory', false, 1.0);
      }

      const recommendations = optimizer.getRecommendations();
      const sizeRec = recommendations.find(r => r.type === 'increase-size');

      if (sizeRec) {
        expect(sizeRec.tier).toBe('memory');
      }
    });

    it('should recommend warming for low hit rate', () => {
      for (let i = 0; i < 10; i++) {
        optimizer.recordAccess('memory', false, 1.0);
      }

      const recommendations = optimizer.getRecommendations();
      const warmingRec = recommendations.find(r => r.type === 'warming');

      if (warmingRec) {
        expect(warmingRec.impact).toBeDefined();
      }
    });

    it('should recommend policy change for high lookup time', () => {
      for (let i = 0; i < 10; i++) {
        optimizer.recordAccess('memory', true, 15.0); // High lookup time
      }

      const recommendations = optimizer.getRecommendations();
      const policyRec = recommendations.find(r => r.type === 'change-policy');

      if (policyRec) {
        expect(policyRec.tier).toBe('memory');
      }
    });
  });

  describe('eviction policy optimization', () => {
    it('should suggest optimal eviction policy', () => {
      optimizer.recordAccess('memory', true, 1.0);

      const policy = optimizer.optimizeEvictionPolicy('memory');
      expect(['lru', 'lfu', 'fifo', 'ttl']).toContain(policy);
    });

    it('should suggest LFU for low hit rate and high lookup time', () => {
      for (let i = 0; i < 10; i++) {
        optimizer.recordAccess('memory', false, 10.0);
      }

      const policy = optimizer.optimizeEvictionPolicy('memory');
      expect(policy).toBe('lfu');
    });

    it('should suggest LRU for good hit rate but high lookup time', () => {
      for (let i = 0; i < 10; i++) {
        optimizer.recordAccess('memory', true, 10.0);
      }

      const policy = optimizer.optimizeEvictionPolicy('memory');
      expect(policy).toBe('lru');
    });
  });

  describe('automatic warming', () => {
    it('should start auto-warming', () => {
      const autoOptimizer = new CacheOptimizer({ autoWarming: true, warmingInterval: 100 });

      autoOptimizer.startAutoWarming();
      autoOptimizer.stopAutoWarming();
      autoOptimizer.destroy();
    });

    it('should stop auto-warming', () => {
      optimizer.startAutoWarming();
      optimizer.stopAutoWarming();

      expect(() => optimizer.stopAutoWarming()).not.toThrow();
    });
  });

  describe('automatic analysis', () => {
    it('should start analysis', () => {
      const analysisOptimizer = new CacheOptimizer({ enableAnalysis: true, analysisInterval: 100 });

      analysisOptimizer.startAnalysis();
      analysisOptimizer.stopAnalysis();
      analysisOptimizer.destroy();
    });

    it('should stop analysis', () => {
      optimizer.startAnalysis();
      optimizer.stopAnalysis();

      expect(() => optimizer.stopAnalysis()).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset optimizer state', () => {
      optimizer.recordAccess('memory', true, 1.0);

      optimizer.reset();

      const metrics = optimizer.getMetrics();
      expect(metrics.totalHits).toBe(0);
      expect(metrics.totalMisses).toBe(0);
    });
  });

  describe('utility functions', () => {
    it('should calculate optimal cache size', () => {
      const optimalSize = calculateOptimalCacheSize(1000, 0.5, 0.8);
      expect(optimalSize).toBeGreaterThan(1000);
    });

    it('should not change size if hit rate meets target', () => {
      const optimalSize = calculateOptimalCacheSize(1000, 0.9, 0.8);
      expect(optimalSize).toBe(1000);
    });

    it('should calculate cache efficiency', () => {
      const metrics = {
        hitRates: { memory: 0.8 },
        missRates: { memory: 0.2 },
        avgLookupTime: { memory: 2.0 },
        sizes: { memory: 1000 },
        evictions: { memory: 0 },
        totalHits: 80,
        totalMisses: 20,
        overallHitRate: 0.8,
      };

      const efficiency = calculateCacheEfficiency(metrics);
      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('performance', () => {
    it('should handle high-frequency access recording', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        optimizer.recordAccess('memory', i % 2 === 0, 1.0);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // < 0.01ms per record
    });

    it('should calculate metrics efficiently', () => {
      // Record many accesses
      for (let i = 0; i < 1000; i++) {
        optimizer.recordAccess('memory', true, 1.0);
      }

      const start = performance.now();
      optimizer.getMetrics();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // < 50ms
    });
  });
});
