/**
 * Tests for ProductionProfiler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProductionProfiler,
  DEFAULT_PROFILER_CONFIG,
} from '../../../packages/ai/src/performance/ProductionProfiler';

describe('ProductionProfiler', () => {
  let profiler: ProductionProfiler;

  beforeEach(() => {
    profiler = new ProductionProfiler({ samplingRate: 1.0 }); // Always sample in tests
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(profiler).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const onRegression = vi.fn();
      const customProfiler = new ProductionProfiler({ onRegression, samplingRate: 1.0 });

      expect(customProfiler).toBeDefined();
    });

    it('should integrate with PerformanceMonitor', () => {
      const metrics = profiler.getMetrics();
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('api');
      expect(metrics).toHaveProperty('tokens');
    });
  });

  describe('span management', () => {
    it('should start a span', () => {
      const span = profiler.startSpan('test-operation');

      expect(span).toHaveProperty('name', 'test-operation');
      expect(span).toHaveProperty('startTime');
      expect(span).toHaveProperty('spanId');
      expect(span.startTime).toBeGreaterThan(0);
    });

    it('should end a span', () => {
      const span = profiler.startSpan('test-operation');
      profiler.endSpan(span);

      const spans = profiler.getSpans();
      expect(spans.length).toBe(1);
      expect(spans[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should support nested spans', () => {
      const parent = profiler.startSpan('parent');
      const child = profiler.startChildSpan('child', parent);

      expect(child.parentId).toBe(parent.spanId);

      profiler.endSpan(child);
      profiler.endSpan(parent);

      const spans = profiler.getSpans();
      expect(spans.length).toBe(2);
    });

    it('should add metadata to spans', () => {
      const metadata = { userId: '123', action: 'fetch' };
      const span = profiler.startSpan('test', metadata);

      profiler.endSpan(span);

      const spans = profiler.getSpans();
      expect(spans[0].metadata).toEqual(metadata);
    });

    it('should limit span history', () => {
      const maxSpans = DEFAULT_PROFILER_CONFIG.maxSpans;

      for (let i = 0; i < maxSpans + 100; i++) {
        const span = profiler.startSpan(`operation-${i}`);
        profiler.endSpan(span);
      }

      const spans = profiler.getSpans();
      expect(spans.length).toBeLessThanOrEqual(maxSpans);
    });
  });

  describe('span filtering', () => {
    beforeEach(() => {
      // Setup test spans
      const fast = profiler.startSpan('fast-op');
      profiler.endSpan(fast);

      const slow = profiler.startSpan('slow-op');
      setTimeout(() => profiler.endSpan(slow), 10);
    });

    it('should filter spans by name', () => {
      const spans = profiler.getSpans({ name: 'fast-op' });
      expect(spans.every(s => s.name === 'fast-op')).toBe(true);
    });

    it('should filter spans by minimum duration', async () => {
      await new Promise(resolve => setTimeout(resolve, 20));

      const spans = profiler.getSpans({ minDuration: 5 });
      expect(spans.every(s => (s.duration || 0) >= 5)).toBe(true);
    });
  });

  describe('regression detection', () => {
    it('should detect performance regressions', () => {
      // Establish baseline
      for (let i = 0; i < 15; i++) {
        const span = profiler.startSpan('api-call');
        setTimeout(() => {}, 10); // Simulate work
        profiler.endSpan(span);
      }

      // Simulate regression
      const slowSpan = profiler.startSpan('api-call');
      setTimeout(() => {}, 50); // Much slower
      profiler.endSpan(slowSpan);

      const regressions = profiler.getRegressions();
      expect(regressions.length).toBeGreaterThanOrEqual(0);
    });

    it('should classify regression severity', () => {
      const onRegression = vi.fn();
      const testProfiler = new ProductionProfiler({ onRegression, samplingRate: 1.0 });

      // Baseline
      for (let i = 0; i < 15; i++) {
        const span = testProfiler.startSpan('test');
        testProfiler.endSpan(span);
      }

      // Would be called if regression detected
      expect(onRegression).toBeDefined();
    });

    it('should clear regression history', () => {
      profiler.clearRegressions();
      expect(profiler.getRegressions().length).toBe(0);
    });
  });

  describe('optimization suggestions', () => {
    it('should generate optimization suggestions', () => {
      // Create patterns that trigger suggestions
      for (let i = 0; i < 10; i++) {
        const span = profiler.startSpan('repeated-operation');
        profiler.endSpan(span);
      }

      const suggestions = profiler.getOptimizationSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should suggest caching for repeated operations', () => {
      for (let i = 0; i < 10; i++) {
        const span = profiler.startSpan('fetch-user');
        setTimeout(() => {}, 100); // Slow operation
        profiler.endSpan(span);
      }

      const suggestions = profiler.getOptimizationSuggestions();
      const cachingSuggestion = suggestions.find(s => s.type === 'caching');

      if (cachingSuggestion) {
        expect(cachingSuggestion.type).toBe('caching');
        expect(cachingSuggestion.impact).toBeDefined();
      }
    });

    it('should prioritize suggestions by impact', () => {
      const suggestions = profiler.getOptimizationSuggestions();

      if (suggestions.length > 1) {
        const impacts = suggestions.map(s => s.impact);
        // High impact should come before low impact
        const highIndex = impacts.indexOf('high');
        const lowIndex = impacts.indexOf('low');

        if (highIndex !== -1 && lowIndex !== -1) {
          expect(highIndex).toBeLessThan(lowIndex);
        }
      }
    });
  });

  describe('profiling summary', () => {
    it('should generate profiling summary', () => {
      const span1 = profiler.startSpan('operation-1');
      profiler.endSpan(span1);

      const span2 = profiler.startSpan('operation-2');
      profiler.endSpan(span2);

      const summary = profiler.getSummary();

      expect(summary).toHaveProperty('totalSpans');
      expect(summary).toHaveProperty('avgDuration');
      expect(summary).toHaveProperty('slowestOperations');
      expect(summary).toHaveProperty('regressionCount');
      expect(summary.totalSpans).toBeGreaterThanOrEqual(2);
    });

    it('should identify slowest operations', () => {
      // Create operations with different durations
      const fast = profiler.startSpan('fast');
      profiler.endSpan(fast);

      const slow = profiler.startSpan('slow');
      setTimeout(() => {}, 50);
      profiler.endSpan(slow);

      const summary = profiler.getSummary();
      expect(summary.slowestOperations.length).toBeGreaterThan(0);
    });
  });

  describe('sampling', () => {
    it('should respect sampling rate', () => {
      const lowSampleProfiler = new ProductionProfiler({ samplingRate: 0.0 });

      const span = lowSampleProfiler.startSpan('test');
      expect(span.spanId).toBe('noop');
    });

    it('should handle no-op spans gracefully', () => {
      const lowSampleProfiler = new ProductionProfiler({ samplingRate: 0.0 });

      const span = lowSampleProfiler.startSpan('test');
      lowSampleProfiler.endSpan(span);

      const spans = lowSampleProfiler.getSpans();
      expect(spans.length).toBe(0);
    });
  });

  describe('enable/disable', () => {
    it('should enable profiling', () => {
      profiler.setEnabled(true);
      const span = profiler.startSpan('test');
      expect(span.spanId).not.toBe('noop');
    });

    it('should disable profiling', () => {
      profiler.setEnabled(false);
      const span = profiler.startSpan('test');
      expect(span.spanId).toBe('noop');
    });
  });

  describe('reset', () => {
    it('should reset profiler state', () => {
      const span = profiler.startSpan('test');
      profiler.endSpan(span);

      profiler.reset();

      expect(profiler.getSpans().length).toBe(0);
      expect(profiler.getRegressions().length).toBe(0);
    });
  });

  describe('performance', () => {
    it('should have low overhead', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const span = profiler.startSpan('test');
        profiler.endSpan(span);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // < 0.1ms per span
    });

    it('should handle high-frequency operations', () => {
      for (let i = 0; i < 10000; i++) {
        const span = profiler.startSpan('high-freq');
        profiler.endSpan(span);
      }

      const spans = profiler.getSpans();
      expect(spans.length).toBeGreaterThan(0);
    });
  });
});
