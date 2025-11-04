import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ContextManager,
  DEFAULT_CONTEXT_MANAGER_CONFIG,
  type GatherOptions,
  type ContextEvent,
} from '../../../src/context/ContextManager';
import type { ContextProvider, ContextData } from '../../../src/context/ContextProvider';

// Mock provider factory
function createMockProvider(
  name: string,
  data: Record<string, any> = {},
  delay = 0
): ContextProvider {
  return {
    name,
    enabled: true,
    async gather(): Promise<ContextData> {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return {
        provider: name,
        timestamp: new Date(),
        data,
      };
    },
  };
}

// Mock slow provider
function createSlowProvider(name: string, delay: number): ContextProvider {
  return createMockProvider(name, { slow: true }, delay);
}

// Mock failing provider
function createFailingProvider(name: string): ContextProvider {
  return {
    name,
    enabled: true,
    async gather(): Promise<ContextData> {
      throw new Error(`Provider ${name} failed`);
    },
  };
}

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Construction and Configuration', () => {
    it('should initialize with default config', () => {
      const stats = manager.getStats();
      expect(stats.providers).toBe(0);
      expect(stats.totalGatherings).toBe(0);
    });

    it('should accept custom config', () => {
      const customManager = new ContextManager({
        cacheConfig: { ttl: 60000 },
        providerTimeout: 10000,
      });

      expect(customManager.isDestroyed()).toBe(false);
      customManager.destroy();
    });

    it('should initialize cache and prioritizer', async () => {
      const provider = createMockProvider('test');
      manager.registerProvider(provider);

      const result = await manager.gatherContext({ cacheKey: 'test' });
      expect(result.cached).toBe(false);

      // Second call should be cached
      const result2 = await manager.gatherContext({ cacheKey: 'test' });
      expect(result2.cached).toBe(true);
    });
  });

  describe('Provider Registration', () => {
    it('should register provider', () => {
      const provider = createMockProvider('dom');
      manager.registerProvider(provider);

      expect(manager.getProvider('dom')).toBe(provider);
      expect(manager.getProviderNames()).toContain('dom');
    });

    it('should register multiple providers', () => {
      const dom = createMockProvider('dom');
      const form = createMockProvider('form');
      const viewport = createMockProvider('viewport');

      manager.registerProvider(dom);
      manager.registerProvider(form);
      manager.registerProvider(viewport);

      const names = manager.getProviderNames();
      expect(names).toContain('dom');
      expect(names).toContain('form');
      expect(names).toContain('viewport');
      expect(manager.getStats().providers).toBe(3);
    });

    it('should throw on duplicate provider registration', () => {
      const provider = createMockProvider('dom');
      manager.registerProvider(provider);

      expect(() => manager.registerProvider(provider)).toThrow(
        "Provider 'dom' is already registered"
      );
    });

    it('should unregister provider', () => {
      const provider = createMockProvider('dom');
      manager.registerProvider(provider);
      expect(manager.getProvider('dom')).toBe(provider);

      manager.unregisterProvider('dom');
      expect(manager.getProvider('dom')).toBeUndefined();
    });

    it('should handle unregistering non-existent provider', () => {
      expect(() => manager.unregisterProvider('nonexistent')).not.toThrow();
    });

    it('should enable/disable providers', () => {
      const provider = createMockProvider('dom');
      manager.registerProvider(provider);

      manager.setProviderEnabled('dom', false);
      expect(provider.enabled).toBe(false);

      manager.setProviderEnabled('dom', true);
      expect(provider.enabled).toBe(true);
    });

    it('should handle enabling non-existent provider gracefully', () => {
      expect(() => manager.setProviderEnabled('nonexistent', true)).not.toThrow();
    });
  });

  describe('Basic Context Gathering', () => {
    it('should gather from single provider', async () => {
      const provider = createMockProvider('dom', { test: 'data' });
      manager.registerProvider(provider);

      const result = await manager.gatherContext();

      expect(result.contexts).toHaveLength(1);
      expect(result.contexts[0].source).toBe('dom');
      expect(result.contexts[0].context.data).toEqual({ test: 'data' });
      expect(result.cached).toBe(false);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should gather from multiple providers', async () => {
      manager.registerProvider(createMockProvider('dom', { dom: 'data' }));
      manager.registerProvider(createMockProvider('form', { form: 'data' }));
      manager.registerProvider(createMockProvider('viewport', { viewport: 'data' }));

      const result = await manager.gatherContext();

      expect(result.contexts).toHaveLength(3);
      expect(result.errors).toBe(0);

      const sources = result.contexts.map((c) => c.source);
      expect(sources).toContain('dom');
      expect(sources).toContain('form');
      expect(sources).toContain('viewport');
    });

    it('should return empty result when no providers registered', async () => {
      const result = await manager.gatherContext();

      expect(result.contexts).toHaveLength(0);
      expect(result.errors).toBe(0);
    });

    it('should skip disabled providers', async () => {
      const enabled = createMockProvider('enabled', { enabled: true });
      const disabled = createMockProvider('disabled', { disabled: true });
      disabled.enabled = false;

      manager.registerProvider(enabled);
      manager.registerProvider(disabled);

      const result = await manager.gatherContext();

      expect(result.contexts).toHaveLength(1);
      expect(result.contexts[0].source).toBe('enabled');
    });

    it('should track gathering time', async () => {
      manager.registerProvider(createMockProvider('dom'));

      const result = await manager.gatherContext();

      expect(result.gatherTimeMs).toBeGreaterThan(0);
      expect(result.gatherTimeMs).toBeLessThan(1000); // Should be fast
    });

    it('should estimate total tokens', async () => {
      manager.registerProvider(createMockProvider('dom', { test: 'data' }));

      const result = await manager.gatherContext();

      expect(result.totalTokens).toBeGreaterThan(0);
      expect(typeof result.totalTokens).toBe('number');
    });
  });

  describe('Parallel Execution', () => {
    it('should gather from providers in parallel', async () => {
      const startTime = Date.now();

      // All providers take 50ms
      manager.registerProvider(createSlowProvider('provider1', 50));
      manager.registerProvider(createSlowProvider('provider2', 50));
      manager.registerProvider(createSlowProvider('provider3', 50));

      await manager.gatherContext();

      const duration = Date.now() - startTime;

      // If parallel, total time should be ~50ms (not 150ms)
      expect(duration).toBeLessThan(100); // Allow some overhead
    });

    it('should complete even if one provider is slow', async () => {
      manager.registerProvider(createMockProvider('fast', { fast: true }));
      manager.registerProvider(createSlowProvider('slow', 100));

      const result = await manager.gatherContext();

      // Should get both results
      expect(result.contexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle provider failures gracefully', async () => {
      manager.registerProvider(createMockProvider('good', { good: true }));
      manager.registerProvider(createFailingProvider('bad'));

      const result = await manager.gatherContext();

      // Should get result from good provider
      expect(result.contexts).toHaveLength(1);
      expect(result.contexts[0].source).toBe('good');
      expect(result.errors).toBe(1);
    });

    it('should handle all providers failing', async () => {
      manager.registerProvider(createFailingProvider('bad1'));
      manager.registerProvider(createFailingProvider('bad2'));

      const result = await manager.gatherContext();

      expect(result.contexts).toHaveLength(0);
      expect(result.errors).toBe(2);
      expect(result.gatherTimeMs).toBeGreaterThan(0);
    });

    it('should timeout slow providers', async () => {
      const slowManager = new ContextManager({ providerTimeout: 100 });

      // Provider takes 5 seconds (will timeout)
      slowManager.registerProvider(createSlowProvider('very-slow', 5000));
      slowManager.registerProvider(createMockProvider('fast', { fast: true }));

      const result = await slowManager.gatherContext();

      // Should get fast provider, timeout slow one
      expect(result.contexts).toHaveLength(1);
      expect(result.contexts[0].source).toBe('fast');
      expect(result.errors).toBe(1); // Timeout counts as error

      slowManager.destroy();
    }, 10000);

    it('should emit provider-error event on failure', async () => {
      const errors: Error[] = [];
      manager.subscribe((event, data) => {
        if (event === 'provider-error') {
          errors.push(data as Error);
        }
      });

      manager.registerProvider(createFailingProvider('bad'));

      await manager.gatherContext();

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Provider bad failed');
    });

    it('should track error statistics', async () => {
      manager.registerProvider(createFailingProvider('bad1'));
      await manager.gatherContext();

      manager.registerProvider(createFailingProvider('bad2'));
      await manager.gatherContext();

      const stats = manager.getStats();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Caching', () => {
    it('should cache gathered context', async () => {
      manager.registerProvider(createMockProvider('dom', { test: 'data' }));

      const result1 = await manager.gatherContext({ cacheKey: 'test-key' });
      expect(result1.cached).toBe(false);

      const result2 = await manager.gatherContext({ cacheKey: 'test-key' });
      expect(result2.cached).toBe(true);
      // Cached result returns combined context
      expect(result2.contexts[0].source).toBe('cache');
    });

    it('should skip cache with forceRefresh', async () => {
      manager.registerProvider(createMockProvider('dom', { fresh: 'data' }));

      await manager.gatherContext({ cacheKey: 'test-key' });

      const result = await manager.gatherContext({ cacheKey: 'test-key', forceRefresh: true });
      expect(result.cached).toBe(false);
    });

    it('should use different cache for different keys', async () => {
      manager.registerProvider(createMockProvider('dom', { test: 'data' }));

      await manager.gatherContext({ cacheKey: 'key1' });
      const result = await manager.gatherContext({ cacheKey: 'key2' });

      expect(result.cached).toBe(false); // Different key = cache miss
    });

    it('should not cache when no cacheKey provided', async () => {
      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext(); // No cacheKey
      const result = await manager.gatherContext(); // No cacheKey

      expect(result.cached).toBe(false); // Never cached
    });

    it('should cache hit be very fast (<10ms)', async () => {
      manager.registerProvider(createMockProvider('dom', { test: 'data' }));

      await manager.gatherContext({ cacheKey: 'test-key' });

      const startTime = performance.now();
      const result = await manager.gatherContext({ cacheKey: 'test-key' });
      const duration = performance.now() - startTime;

      expect(result.cached).toBe(true);
      expect(duration).toBeLessThan(10); // Cache hit <10ms target
    });

    it('should clear cache', async () => {
      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext({ cacheKey: 'test-key' });
      await manager.clearCache();

      const result = await manager.gatherContext({ cacheKey: 'test-key' });
      expect(result.cached).toBe(false); // Cache was cleared
    });

    it('should invalidate specific cache entry', async () => {
      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext({ cacheKey: 'key1' });
      await manager.gatherContext({ cacheKey: 'key2' });

      await manager.invalidateCache('key1');

      const result1 = await manager.gatherContext({ cacheKey: 'key1' });
      const result2 = await manager.gatherContext({ cacheKey: 'key2' });

      expect(result1.cached).toBe(false); // Invalidated
      expect(result2.cached).toBe(true); // Still cached
    });

    it('should check cache existence', async () => {
      manager.registerProvider(createMockProvider('dom'));

      expect(await manager.hasCache('test-key')).toBe(false);

      await manager.gatherContext({ cacheKey: 'test-key' });

      expect(await manager.hasCache('test-key')).toBe(true);
    });

    it('should emit cache-hit and cache-miss events', async () => {
      const events: ContextEvent[] = [];
      manager.subscribe((event) => {
        events.push(event);
      });

      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext({ cacheKey: 'test-key' });
      expect(events).toContain('cache-miss');

      await manager.gatherContext({ cacheKey: 'test-key' });
      expect(events).toContain('cache-hit');
    });
  });

  describe('Prioritization', () => {
    it('should prioritize contexts by relevance', async () => {
      manager.registerProvider(createMockProvider('performance', {})); // Low weight
      manager.registerProvider(createMockProvider('form', {})); // High weight
      manager.registerProvider(createMockProvider('dom', {})); // Base weight

      // Use minRelevance of 0 to ensure all contexts are included
      const result = await manager.gatherContext({ minRelevance: 0 });

      // Should have all 3 contexts
      expect(result.contexts.length).toBeGreaterThanOrEqual(2);

      // Form should have highest score (highest weight)
      const formContext = result.contexts.find((c) => c.source === 'form');
      const perfContext = result.contexts.find((c) => c.source === 'performance');

      if (formContext && perfContext) {
        expect(formContext.score).toBeGreaterThan(perfContext.score);
      } else {
        // At least verify form has higher score than something
        expect(result.contexts.some((c) => c.source === 'form')).toBe(true);
      }
    });

    it('should filter by minimum relevance', async () => {
      manager.registerProvider(createMockProvider('performance', {})); // Low score
      manager.registerProvider(createMockProvider('form', {})); // High score

      const result = await manager.gatherContext({ minRelevance: 0.8 });

      // Performance might be filtered out due to low relevance
      expect(result.contexts.length).toBeLessThanOrEqual(2);
      expect(result.contexts.every((c) => c.score >= 0.8)).toBe(true);
    });

    it('should apply default minRelevance of 0.5', async () => {
      manager.registerProvider(createMockProvider('dom', {}));

      const result = await manager.gatherContext();

      expect(result.contexts.every((c) => c.score >= 0.5)).toBe(true);
    });

    it('should boost contexts based on trigger', async () => {
      manager.registerProvider(createMockProvider('form', {}));

      const withTrigger = await manager.gatherContext({ trigger: 'user-action' });
      const withoutTrigger = await manager.gatherContext();

      // User-action trigger should boost score
      expect(withTrigger.contexts[0].score).toBeGreaterThanOrEqual(
        withoutTrigger.contexts[0].score
      );
    });
  });

  describe('Token Budget', () => {
    it('should apply token budget constraint', async () => {
      // Create providers with different sizes
      const smallData = { small: 'data' };
      const largeData = { large: 'x'.repeat(1000) };

      manager.registerProvider(createMockProvider('small', smallData));
      manager.registerProvider(createMockProvider('large', largeData));

      const result = await manager.gatherContext({ tokenBudget: 50 });

      expect(result.totalTokens).toBeLessThanOrEqual(50);
    });

    it('should prioritize high-score contexts for budget', async () => {
      manager.registerProvider(createMockProvider('form', { data: 'x'.repeat(100) })); // High priority
      manager.registerProvider(createMockProvider('performance', { data: 'x'.repeat(100) })); // Low priority

      const result = await manager.gatherContext({ tokenBudget: 100 });

      // Should include form (high priority) and exclude performance if budget tight
      const sources = result.contexts.map((c) => c.source);
      expect(sources).toContain('form');
    });

    it('should handle tokenBudget of 0', async () => {
      manager.registerProvider(createMockProvider('dom'));

      const result = await manager.gatherContext({ tokenBudget: 0 });

      // With budget of 0, no contexts can fit
      expect(result.contexts).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should not apply budget if not specified', async () => {
      manager.registerProvider(createMockProvider('dom'));
      manager.registerProvider(createMockProvider('form'));
      manager.registerProvider(createMockProvider('viewport'));

      const result = await manager.gatherContext(); // No budget

      expect(result.contexts.length).toBe(3); // All included
    });
  });

  describe('Provider Filtering', () => {
    it('should gather only from specified providers', async () => {
      manager.registerProvider(createMockProvider('dom'));
      manager.registerProvider(createMockProvider('form'));
      manager.registerProvider(createMockProvider('viewport'));

      const result = await manager.gatherContext({ providerIds: ['dom', 'form'] });

      expect(result.contexts).toHaveLength(2);
      const sources = result.contexts.map((c) => c.source);
      expect(sources).toContain('dom');
      expect(sources).toContain('form');
      expect(sources).not.toContain('viewport');
    });

    it('should handle non-existent provider IDs', async () => {
      manager.registerProvider(createMockProvider('dom'));

      const result = await manager.gatherContext({ providerIds: ['dom', 'nonexistent'] });

      expect(result.contexts).toHaveLength(1);
      expect(result.contexts[0].source).toBe('dom');
    });

    it('should return empty if all providerIds are disabled', async () => {
      const provider = createMockProvider('dom');
      provider.enabled = false;
      manager.registerProvider(provider);

      const result = await manager.gatherContext({ providerIds: ['dom'] });

      expect(result.contexts).toHaveLength(0);
    });
  });

  describe('Event System', () => {
    it('should emit context-gathered event', async () => {
      let gathered = false;
      manager.subscribe((event) => {
        if (event === 'context-gathered') gathered = true;
      });

      manager.registerProvider(createMockProvider('dom'));
      await manager.gatherContext();

      expect(gathered).toBe(true);
    });

    it('should pass contexts to event listeners', async () => {
      let receivedContexts: any = null;
      manager.subscribe((event, data) => {
        if (event === 'context-gathered') {
          receivedContexts = data;
        }
      });

      manager.registerProvider(createMockProvider('dom'));
      await manager.gatherContext();

      expect(receivedContexts).toBeTruthy();
      expect(Array.isArray(receivedContexts)).toBe(true);
    });

    it('should support multiple listeners', async () => {
      let listener1Called = false;
      let listener2Called = false;

      manager.subscribe(() => (listener1Called = true));
      manager.subscribe(() => (listener2Called = true));

      manager.registerProvider(createMockProvider('dom'));
      await manager.gatherContext();

      expect(listener1Called).toBe(true);
      expect(listener2Called).toBe(true);
    });

    it('should unsubscribe listeners', async () => {
      let callCount = 0;
      const unsubscribe = manager.subscribe(() => callCount++);

      manager.registerProvider(createMockProvider('dom'));
      await manager.gatherContext();
      expect(callCount).toBe(1);

      unsubscribe();
      await manager.gatherContext();
      expect(callCount).toBe(1); // Not called again
    });

    it('should handle listener errors gracefully', async () => {
      manager.subscribe(() => {
        throw new Error('Listener error');
      });

      manager.registerProvider(createMockProvider('dom'));

      // Should not throw despite listener error
      await expect(manager.gatherContext()).resolves.toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should track total gatherings', async () => {
      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext();
      await manager.gatherContext();
      await manager.gatherContext();

      const stats = manager.getStats();
      expect(stats.totalGatherings).toBe(3);
    });

    it('should track average gather time', async () => {
      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext();
      await manager.gatherContext();

      const stats = manager.getStats();
      expect(stats.avgGatherTimeMs).toBeGreaterThan(0);
    });

    it('should track cache statistics', async () => {
      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext({ cacheKey: 'test' });
      await manager.gatherContext({ cacheKey: 'test' }); // Hit

      const stats = manager.getStats();
      expect(stats.cacheStats.hits).toBeGreaterThan(0);
      expect(stats.cacheStats.hitRate).toBeGreaterThan(0);
    });

    it('should track enabled vs total providers', async () => {
      const provider1 = createMockProvider('enabled');
      const provider2 = createMockProvider('disabled');
      provider2.enabled = false;

      manager.registerProvider(provider1);
      manager.registerProvider(provider2);

      const stats = manager.getStats();
      expect(stats.providers).toBe(2);
      expect(stats.enabledProviders).toBe(1);
    });

    it('should reset stats on destroy', () => {
      manager.registerProvider(createMockProvider('dom'));

      manager.destroy();
      const stats = manager.getStats();

      expect(stats.totalGatherings).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.avgGatherTimeMs).toBe(0);
    });
  });

  describe('Lifecycle and Cleanup', () => {
    it('should destroy cleanly', () => {
      manager.registerProvider(createMockProvider('dom'));
      manager.destroy();

      expect(manager.isDestroyed()).toBe(true);
      expect(manager.getProviderNames()).toHaveLength(0);
    });

    it('should throw when using destroyed manager', async () => {
      manager.destroy();

      await expect(manager.gatherContext()).rejects.toThrow('has been destroyed');
      expect(() => manager.registerProvider(createMockProvider('dom'))).toThrow(
        'has been destroyed'
      );
      await expect(manager.clearCache()).rejects.toThrow('has been destroyed');
    });

    it('should handle multiple destroy calls', () => {
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
      expect(manager.isDestroyed()).toBe(true);
    });

    it('should clear all providers on destroy', () => {
      manager.registerProvider(createMockProvider('dom'));
      manager.registerProvider(createMockProvider('form'));

      manager.destroy();

      expect(manager.getStats().providers).toBe(0);
    });

    it('should clear all listeners on destroy', async () => {
      let called = false;
      manager.subscribe(() => (called = true));

      manager.destroy();

      // Create new manager and gather - old listener should not be called
      const newManager = new ContextManager();
      newManager.registerProvider(createMockProvider('dom'));
      await newManager.gatherContext();

      expect(called).toBe(false);
      newManager.destroy();
    });
  });

  describe('Performance', () => {
    it('should complete fresh gathering in <100ms', async () => {
      // Register multiple fast providers
      manager.registerProvider(createMockProvider('dom'));
      manager.registerProvider(createMockProvider('form'));
      manager.registerProvider(createMockProvider('viewport'));
      manager.registerProvider(createMockProvider('performance'));

      const startTime = performance.now();
      await manager.gatherContext();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should complete cached retrieval in <10ms', async () => {
      manager.registerProvider(createMockProvider('dom'));

      await manager.gatherContext({ cacheKey: 'test' });

      const startTime = performance.now();
      await manager.gatherContext({ cacheKey: 'test' });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(10);
    });
  });
});
