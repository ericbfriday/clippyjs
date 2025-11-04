import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextPrioritizer,
  DEFAULT_PRIORITIZER_CONFIG,
  type PrioritizerConfig,
  type ScoredContext,
} from '../../../src/context/ContextPrioritizer';
import type { ContextData } from '../../../src/context/ContextProvider';

describe('ContextPrioritizer', () => {
  let prioritizer: ContextPrioritizer;

  beforeEach(() => {
    prioritizer = new ContextPrioritizer();
  });

  describe('Construction and Configuration', () => {
    it('should initialize with default config', () => {
      const config = prioritizer.getConfig();
      expect(config).toEqual(DEFAULT_PRIORITIZER_CONFIG);
    });

    it('should accept partial config override', () => {
      const customPrioritizer = new ContextPrioritizer({
        recencyWeight: 2.0,
        sizePenalty: 0.5,
      });

      const config = customPrioritizer.getConfig();
      expect(config.recencyWeight).toBe(2.0);
      expect(config.sizePenalty).toBe(0.5);
      expect(config.typeWeights).toEqual(DEFAULT_PRIORITIZER_CONFIG.typeWeights);
    });

    it('should update config dynamically', () => {
      prioritizer.updateConfig({ recencyWeight: 2.5 });
      const config = prioritizer.getConfig();
      expect(config.recencyWeight).toBe(2.5);
    });

    it('should return readonly config copy', () => {
      const config = prioritizer.getConfig();
      // TypeScript would prevent mutation, but verify it's a copy
      config.recencyWeight = 999;
      const newConfig = prioritizer.getConfig();
      expect(newConfig.recencyWeight).toBe(DEFAULT_PRIORITIZER_CONFIG.recencyWeight);
    });
  });

  describe('Basic Scoring', () => {
    it('should score single context', () => {
      const context: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: { test: 'data' },
      };

      const scored = prioritizer.score([context]);

      expect(scored).toHaveLength(1);
      expect(scored[0].context).toBe(context);
      expect(scored[0].score).toBeGreaterThan(0);
      expect(scored[0].score).toBeLessThanOrEqual(1);
      expect(scored[0].source).toBe('dom');
    });

    it('should score multiple contexts', () => {
      const contexts: ContextData[] = [
        { provider: 'dom', timestamp: new Date(), data: {} },
        { provider: 'form', timestamp: new Date(), data: {} },
        { provider: 'viewport', timestamp: new Date(), data: {} },
      ];

      const scored = prioritizer.score(contexts);

      expect(scored).toHaveLength(3);
      expect(scored.every((s) => s.score > 0 && s.score <= 1)).toBe(true);
    });

    it('should return empty array for empty input', () => {
      const scored = prioritizer.score([]);
      expect(scored).toEqual([]);
    });

    it('should normalize scores to 0-1 range', () => {
      const context: ContextData = {
        provider: 'form', // High type weight
        timestamp: new Date(), // Recent (recency boost)
        data: { small: 'data' }, // Small size
      };

      const scored = prioritizer.score([context], { trigger: 'user-action' }); // Trigger boost

      expect(scored[0].score).toBeLessThanOrEqual(1.0);
      expect(scored[0].score).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('Recency Scoring', () => {
    it('should boost recent contexts (< 5 seconds)', () => {
      const recentContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(Date.now() - 1000), // 1 second ago
        data: {},
      };

      const oldContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(Date.now() - 10000), // 10 seconds ago
        data: {},
      };

      const scored = prioritizer.score([recentContext, oldContext]);

      expect(scored[0].context).toBe(recentContext); // Recent should score higher
      expect(scored[0].score).toBeGreaterThan(scored[1].score);
    });

    it('should not boost contexts older than 5 seconds', () => {
      const oldContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(Date.now() - 6000), // 6 seconds ago
        data: {},
      };

      const veryOldContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(Date.now() - 60000), // 60 seconds ago
        data: {},
      };

      const scored = prioritizer.score([oldContext, veryOldContext]);

      // Both are old, so scores should be similar (no recency boost)
      expect(Math.abs(scored[0].score - scored[1].score)).toBeLessThan(0.01);
    });
  });

  describe('Type Weight Scoring', () => {
    it('should prioritize form contexts highest', () => {
      const contexts: ContextData[] = [
        { provider: 'performance', timestamp: new Date(), data: {} },
        { provider: 'form', timestamp: new Date(), data: {} },
        { provider: 'dom', timestamp: new Date(), data: {} },
      ];

      const scored = prioritizer.score(contexts);

      // Form should be first (highest type weight: 1.5)
      expect(scored[0].source).toBe('form');
      // Performance should be last (lowest type weight: 0.8)
      expect(scored[2].source).toBe('performance');
    });

    it('should prioritize user-action contexts second highest', () => {
      const contexts: ContextData[] = [
        { provider: 'dom', timestamp: new Date(), data: {} },
        { provider: 'user-action', timestamp: new Date(), data: {} },
        { provider: 'viewport', timestamp: new Date(), data: {} },
      ];

      const scored = prioritizer.score(contexts);

      // user-action has weight 1.4, viewport 1.2, dom 1.0
      expect(scored[0].source).toBe('user-action');
      expect(scored[1].source).toBe('viewport');
      expect(scored[2].source).toBe('dom');
    });

    it('should use default weight (1.0) for unknown types', () => {
      const unknownContext: ContextData = {
        provider: 'unknown-type',
        timestamp: new Date(),
        data: {},
      };

      const domContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: {},
      };

      const scored = prioritizer.score([unknownContext, domContext]);

      // Both should have similar scores (both use 1.0 weight)
      expect(Math.abs(scored[0].score - scored[1].score)).toBeLessThan(0.01);
    });

    it('should allow custom type weights', () => {
      const customPrioritizer = new ContextPrioritizer({
        typeWeights: {
          custom: 2.0,
          dom: 0.5,
        },
      });

      const contexts: ContextData[] = [
        { provider: 'dom', timestamp: new Date(), data: {} },
        { provider: 'custom', timestamp: new Date(), data: {} },
      ];

      const scored = customPrioritizer.score(contexts);

      expect(scored[0].source).toBe('custom'); // Higher custom weight
      expect(scored[0].score).toBeGreaterThan(scored[1].score);
    });
  });

  describe('Size Penalty Scoring', () => {
    it('should penalize large contexts (>5KB)', () => {
      const smallContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: { small: 'data' },
      };

      // Create large context >5KB JSON
      const largeData: Record<string, string> = {};
      for (let i = 0; i < 500; i++) {
        largeData[`key${i}`] = 'x'.repeat(20);
      }
      const largeContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: largeData,
      };

      const scored = prioritizer.score([smallContext, largeContext]);

      expect(scored[0].context).toBe(smallContext); // Small should score higher
      expect(scored[0].score).toBeGreaterThan(scored[1].score);
    });

    it('should not penalize contexts under 5KB', () => {
      const context1: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: { test: 'small' },
      };

      const context2: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: { test: 'also small' },
      };

      const scored = prioritizer.score([context1, context2]);

      // Both small, scores should be very similar
      expect(Math.abs(scored[0].score - scored[1].score)).toBeLessThan(0.01);
    });

    it('should use custom size penalty', () => {
      const strictPrioritizer = new ContextPrioritizer({
        sizePenalty: 0.5, // Harsher penalty
      });

      // Create large context
      const largeData: Record<string, string> = {};
      for (let i = 0; i < 500; i++) {
        largeData[`key${i}`] = 'x'.repeat(20);
      }
      const largeContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: largeData,
      };

      const scored = strictPrioritizer.score([largeContext]);
      const scoredDefault = prioritizer.score([largeContext]);

      // Stricter penalty should result in lower score
      expect(scored[0].score).toBeLessThan(scoredDefault[0].score);
    });

    it('should handle JSON stringification errors gracefully', () => {
      // Create circular reference (will cause JSON.stringify to fail)
      const circularData: any = { test: 'data' };
      circularData.self = circularData;

      const context: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: circularData,
      };

      // Should not throw, should use fallback estimate
      expect(() => prioritizer.score([context])).not.toThrow();
      const scored = prioritizer.score([context]);
      expect(scored[0].score).toBeGreaterThan(0);
    });
  });

  describe('Trigger Boost Scoring', () => {
    it('should boost user-action trigger', () => {
      const context: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: {},
      };

      const withTrigger = prioritizer.score([context], { trigger: 'user-action' });
      const withoutTrigger = prioritizer.score([context]);

      expect(withTrigger[0].score).toBeGreaterThan(withoutTrigger[0].score);
    });

    it('should not boost proactive trigger (default 1.0)', () => {
      const context: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: {},
      };

      const proactive = prioritizer.score([context], { trigger: 'proactive' });
      const noTrigger = prioritizer.score([context]);

      expect(Math.abs(proactive[0].score - noTrigger[0].score)).toBeLessThan(0.01);
    });

    it('should apply special boost for form + user-action', () => {
      const formContext: ContextData = {
        provider: 'form',
        timestamp: new Date(),
        data: {},
      };

      const domContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: {},
      };

      const scored = prioritizer.score([formContext, domContext], {
        trigger: 'user-action',
      });

      // Form with user-action should get extra boost (1.2x on top of trigger boost)
      expect(scored[0].source).toBe('form');
      expect(scored[0].score).toBeGreaterThan(scored[1].score);
    });

    it('should handle unknown trigger types', () => {
      const context: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: {},
      };

      // @ts-expect-error - Testing unknown trigger
      const scored = prioritizer.score([context], { trigger: 'unknown' });

      // Should not crash, should use default boost (1.0)
      expect(scored[0].score).toBeGreaterThan(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by score descending (highest first)', () => {
      const contexts: ContextData[] = [
        { provider: 'performance', timestamp: new Date(), data: {} }, // Low weight
        { provider: 'form', timestamp: new Date(), data: {} }, // High weight
        { provider: 'viewport', timestamp: new Date(), data: {} }, // Medium weight
        { provider: 'dom', timestamp: new Date(), data: {} }, // Base weight
      ];

      const scored = prioritizer.score(contexts);

      // Verify descending order
      for (let i = 0; i < scored.length - 1; i++) {
        expect(scored[i].score).toBeGreaterThanOrEqual(scored[i + 1].score);
      }
    });

    it('should maintain stable sort for equal scores', () => {
      const contexts: ContextData[] = [
        { provider: 'dom', timestamp: new Date(), data: { id: 1 } },
        { provider: 'dom', timestamp: new Date(), data: { id: 2 } },
        { provider: 'dom', timestamp: new Date(), data: { id: 3 } },
      ];

      const scored = prioritizer.score(contexts);

      // All should have same score (same provider, same time)
      expect(scored[0].score).toBeCloseTo(scored[1].score, 5);
      expect(scored[1].score).toBeCloseTo(scored[2].score, 5);
    });
  });

  describe('Complex Scoring Scenarios', () => {
    it('should combine multiple factors correctly', () => {
      const recentFormContext: ContextData = {
        provider: 'form', // High type weight: 1.5
        timestamp: new Date(Date.now() - 1000), // Recent: 1.5x boost
        data: { small: 'data' }, // Small: no penalty
      };

      const oldPerformanceContext: ContextData = {
        provider: 'performance', // Low type weight: 0.8
        timestamp: new Date(Date.now() - 10000), // Old: no boost
        data: { test: 'data' },
      };

      const scored = prioritizer.score([recentFormContext, oldPerformanceContext], {
        trigger: 'user-action', // 1.2x boost + 1.2x for form
      });

      // Recent form with user-action should score much higher
      expect(scored[0].source).toBe('form');
      expect(scored[0].score).toBeGreaterThan(scored[1].score * 2);
    });

    it('should handle edge case: all factors at extremes', () => {
      // Create massive context
      const massiveData: Record<string, string> = {};
      for (let i = 0; i < 2000; i++) {
        massiveData[`key${i}`] = 'x'.repeat(50);
      }

      const extremeContext: ContextData = {
        provider: 'performance', // Lowest type weight
        timestamp: new Date(Date.now() - 60000), // Very old
        data: massiveData, // Very large (size penalty)
      };

      const scored = prioritizer.score([extremeContext]);

      // Should still produce valid score (no crash)
      expect(scored[0].score).toBeGreaterThan(0);
      expect(scored[0].score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined data gracefully', () => {
      const context: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: null as any,
      };

      expect(() => prioritizer.score([context])).not.toThrow();
      const scored = prioritizer.score([context]);
      expect(scored[0].score).toBeGreaterThan(0);
    });

    it('should handle very old timestamps', () => {
      const ancientContext: ContextData = {
        provider: 'dom',
        timestamp: new Date('1970-01-01'),
        data: {},
      };

      expect(() => prioritizer.score([ancientContext])).not.toThrow();
      const scored = prioritizer.score([ancientContext]);
      expect(scored[0].score).toBeGreaterThan(0);
    });

    it('should handle future timestamps', () => {
      const futureContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(Date.now() + 10000), // 10 seconds in future
        data: {},
      };

      expect(() => prioritizer.score([futureContext])).not.toThrow();
      const scored = prioritizer.score([futureContext]);
      expect(scored[0].score).toBeGreaterThan(0);
    });

    it('should handle empty data object', () => {
      const emptyContext: ContextData = {
        provider: 'dom',
        timestamp: new Date(),
        data: {},
      };

      const scored = prioritizer.score([emptyContext]);
      expect(scored[0].score).toBeGreaterThan(0);
    });

    it('should handle contexts with identical properties', () => {
      const contexts: ContextData[] = [
        { provider: 'dom', timestamp: new Date(), data: { test: 'data' } },
        { provider: 'dom', timestamp: new Date(), data: { test: 'data' } },
      ];

      const scored = prioritizer.score(contexts);

      expect(scored).toHaveLength(2);
      expect(scored[0].score).toBeCloseTo(scored[1].score, 5);
    });
  });
});
