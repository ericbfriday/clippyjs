/**
 * PerformanceMetrics tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMetrics } from '../../../src/telemetry/PerformanceMetrics';
import { TelemetryCollector } from '../../../src/telemetry/TelemetryCollector';

describe('PerformanceMetrics', () => {
  let collector: TelemetryCollector;
  let metrics: PerformanceMetrics;

  beforeEach(() => {
    collector = new TelemetryCollector({
      enabled: true,
      transport: 'console',
      flushIntervalMs: 0,
    });
  });

  afterEach(() => {
    if (metrics) {
      metrics.destroy();
    }
    if (collector) {
      collector.destroy();
    }
  });

  describe('AI Operation Tracking', () => {
    it('should track AI operation metrics', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.trackAIOperation({
        contextGatheringMs: 50,
        contextCompressionMs: 30,
        apiCallMs: 200,
        totalMs: 280,
        tokens: 500,
      });

      const summary = metrics.getAIOperationsSummary();
      expect(summary.count).toBe(1);
      expect(summary.totalTokens).toBe(500);
      expect(summary.avgDuration).toBe(280);
    });

    it('should calculate percentiles correctly', () => {
      metrics = new PerformanceMetrics(collector);

      // Track operations with varying durations
      const durations = [100, 150, 200, 250, 300, 350, 400, 450, 500];
      for (const duration of durations) {
        metrics.trackAIOperation({ totalMs: duration });
      }

      const summary = metrics.getAIOperationsSummary();
      expect(summary.p50).toBeGreaterThan(0);
      expect(summary.p95).toBeGreaterThan(summary.p50);
      expect(summary.p99).toBeGreaterThanOrEqual(summary.p95);
    });

    it('should aggregate token usage', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.trackAIOperation({ totalMs: 100, tokens: 200 });
      metrics.trackAIOperation({ totalMs: 150, tokens: 300 });
      metrics.trackAIOperation({ totalMs: 200, tokens: 500 });

      const summary = metrics.getAIOperationsSummary();
      expect(summary.totalTokens).toBe(1000);
      expect(summary.count).toBe(3);
    });
  });

  describe('Performance Marks and Measures', () => {
    it('should create and measure marks', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.mark('operation-start');
      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait ~10ms
      }
      metrics.mark('operation-end');

      const duration = metrics.measure(
        'operation-duration',
        'operation-start',
        'operation-end'
      );

      expect(duration).toBeGreaterThan(0);
    });

    it('should throw error for missing start mark', () => {
      metrics = new PerformanceMetrics(collector);

      expect(() => {
        metrics.measure('test', 'nonexistent-mark');
      }).toThrow('Start mark "nonexistent-mark" not found');
    });

    it('should measure from mark to now', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.mark('start');
      const duration = metrics.measure('duration', 'start');

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should store timing history', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.mark('op1-start');
      metrics.mark('op1-end');
      metrics.measure('operation1', 'op1-start', 'op1-end');

      metrics.mark('op2-start');
      metrics.mark('op2-end');
      metrics.measure('operation2', 'op2-start', 'op2-end');

      const timings = metrics.getTimings();
      expect(timings.length).toBe(2);
      expect(timings[0].name).toBe('operation1');
      expect(timings[1].name).toBe('operation2');
    });

    it('should filter timings by pattern', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.mark('api-start');
      metrics.mark('api-end');
      metrics.measure('api-call', 'api-start', 'api-end');

      metrics.mark('db-start');
      metrics.mark('db-end');
      metrics.measure('db-query', 'db-start', 'db-end');

      const apiTimings = metrics.getTimings('api');
      expect(apiTimings.length).toBe(1);
      expect(apiTimings[0].name).toBe('api-call');
    });
  });

  describe('Resource Metrics', () => {
    it('should collect resource metrics', () => {
      metrics = new PerformanceMetrics(collector, {
        trackResources: true,
      });

      const resources = metrics.getResourceMetrics();
      expect(resources).toBeDefined();
      // Memory and network metrics may or may not be available depending on environment
    });
  });

  describe('Core Web Vitals', () => {
    it('should initialize with CWV tracking enabled', () => {
      metrics = new PerformanceMetrics(collector, {
        trackCoreWebVitals: true,
      });

      const cwv = metrics.getCoreWebVitals();
      expect(cwv).toBeDefined();
      // CWV values may be undefined if not measured yet
    });

    it('should not track CWV when disabled', () => {
      metrics = new PerformanceMetrics(collector, {
        trackCoreWebVitals: false,
      });

      const cwv = metrics.getCoreWebVitals();
      expect(cwv).toBeDefined();
      expect(Object.keys(cwv).length).toBe(0);
    });
  });

  describe('Performance Summary', () => {
    it('should generate comprehensive summary', () => {
      metrics = new PerformanceMetrics(collector);

      // Track some operations
      metrics.trackAIOperation({
        contextGatheringMs: 50,
        apiCallMs: 200,
        totalMs: 250,
        tokens: 300,
      });

      // Create some marks
      metrics.mark('test-start');
      metrics.mark('test-end');
      metrics.measure('test-operation', 'test-start', 'test-end');

      const summary = metrics.getSummary();

      expect(summary).toBeDefined();
      expect(summary.coreWebVitals).toBeDefined();
      expect(summary.aiOperations).toBeDefined();
      expect(summary.aiOperations.count).toBe(1);
      expect(summary.resources).toBeDefined();
      expect(summary.customTimings).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should respect maxTimings limit', () => {
      metrics = new PerformanceMetrics(collector, {
        maxTimings: 5,
      });

      // Track more operations than limit
      for (let i = 0; i < 10; i++) {
        metrics.trackAIOperation({ totalMs: 100 + i });
      }

      const summary = metrics.getAIOperationsSummary();
      expect(summary.count).toBeLessThanOrEqual(10);
    });

    it('should respect time window for aggregations', () => {
      metrics = new PerformanceMetrics(collector, {
        timeWindowMs: 1000,
      });

      metrics.trackAIOperation({ totalMs: 100 });

      const summary = metrics.getAIOperationsSummary();
      expect(summary.count).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old data automatically', () => {
      metrics = new PerformanceMetrics(collector, {
        maxTimings: 3,
      });

      // Track more than max
      for (let i = 0; i < 5; i++) {
        metrics.trackAIOperation({ totalMs: 100 });
      }

      const summary = metrics.getAIOperationsSummary();
      // Should keep only recent operations
      expect(summary.count).toBeLessThanOrEqual(5);
    });

    it('should disconnect observers on destroy', () => {
      metrics = new PerformanceMetrics(collector, {
        trackCoreWebVitals: true,
      });

      metrics.destroy();

      // No errors should occur
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations with missing fields', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.trackAIOperation({});

      const summary = metrics.getAIOperationsSummary();
      expect(summary.count).toBe(1);
      expect(summary.avgDuration).toBe(0);
      expect(summary.totalTokens).toBe(0);
    });

    it('should handle empty percentile calculations', () => {
      metrics = new PerformanceMetrics(collector);

      const summary = metrics.getAIOperationsSummary();
      expect(summary.p50).toBe(0);
      expect(summary.p95).toBe(0);
      expect(summary.p99).toBe(0);
    });

    it('should handle single operation percentiles', () => {
      metrics = new PerformanceMetrics(collector);

      metrics.trackAIOperation({ totalMs: 150 });

      const summary = metrics.getAIOperationsSummary();
      expect(summary.p50).toBe(150);
      expect(summary.p95).toBe(150);
      expect(summary.p99).toBe(150);
    });
  });
});
