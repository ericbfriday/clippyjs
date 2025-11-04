/**
 * Performance benchmarks for Sprint 5 optimization features
 */

import { describe, bench, expect } from 'vitest';
import { ResourceBudgetManager } from '../../packages/ai/src/performance/ResourceBudget';
import { MemoryLeakDetector } from '../../packages/ai/src/performance/MemoryLeakDetector';
import { ProductionProfiler } from '../../packages/ai/src/performance/ProductionProfiler';
import { CacheOptimizer } from '../../packages/ai/src/performance/CacheOptimizer';
import { LazyLoader } from '../../packages/ai/src/performance/LazyLoader';
import { BundleOptimizer } from '../../packages/ai/src/performance/BundleOptimizer';

describe('Sprint 5 Performance Benchmarks', () => {
  describe('ResourceBudgetManager overhead', () => {
    const manager = new ResourceBudgetManager();

    bench('budget check', () => {
      manager.checkBudget('memory', 1000);
    });

    bench('usage recording', () => {
      manager.recordUsage('memory', 1000);
    });

    bench('get current usage', () => {
      manager.getCurrentUsage('memory');
    });

    bench('get usage percentage', () => {
      manager.getUsagePercentage('memory');
    });

    bench('budget enforcement', () => {
      manager.enforceBudget();
    });

    bench('health summary generation', () => {
      manager.getHealthSummary();
    });
  });

  describe('MemoryLeakDetector performance', () => {
    const detector = new MemoryLeakDetector({ autoCleanup: false });

    // Setup
    for (let i = 0; i < 20; i++) {
      detector.takeSnapshot();
    }

    bench('take snapshot', () => {
      detector.takeSnapshot();
    });

    bench('calculate trend', () => {
      detector.calculateTrend();
    });

    bench('analyze memory', () => {
      detector.analyzeMemory();
    });

    bench('detect leaks', () => {
      detector.detectLeaks();
    });

    detector.stop();
  });

  describe('ProductionProfiler overhead', () => {
    const profiler = new ProductionProfiler({ samplingRate: 1.0 });

    bench('start span', () => {
      profiler.startSpan('benchmark-operation');
    });

    bench('end span', () => {
      const span = profiler.startSpan('test');
      profiler.endSpan(span);
    });

    bench('get metrics', () => {
      profiler.getMetrics();
    });

    bench('get optimization suggestions', () => {
      profiler.getOptimizationSuggestions();
    });

    bench('get profiling summary', () => {
      profiler.getSummary();
    });
  });

  describe('CacheOptimizer performance', () => {
    const optimizer = new CacheOptimizer({ autoWarming: false, enableAnalysis: false });

    // Setup
    for (let i = 0; i < 100; i++) {
      optimizer.recordAccess('memory', i % 2 === 0, 1.0);
    }

    bench('record access', () => {
      optimizer.recordAccess('memory', true, 1.5);
    });

    bench('get metrics', () => {
      optimizer.getMetrics();
    });

    bench('get recommendations', () => {
      optimizer.getRecommendations();
    });

    bench('optimize eviction policy', () => {
      optimizer.optimizeEvictionPolicy('memory');
    });

    optimizer.destroy();
  });

  describe('LazyLoader performance', () => {
    const loader = new LazyLoader();

    const mockFactory = () => Promise.resolve({ default: () => null });

    bench('check if preloaded', () => {
      loader.isPreloaded('test-component');
    });

    bench('get loading state', () => {
      loader.getLoadingState('test-component');
    });

    bench('get preloaded chunks', () => {
      loader.getPreloadedChunks();
    });
  });

  describe('BundleOptimizer performance', () => {
    const optimizer = new BundleOptimizer();

    // Setup
    optimizer.recordBundleSize('main.js', 100000);
    optimizer.recordBundleSize('vendor.js', 200000);
    optimizer.recordModuleUsage('react', 'App');
    optimizer.recordModuleUsage('lodash', 'utils');

    bench('record bundle size', () => {
      optimizer.recordBundleSize('test.js', 50000);
    });

    bench('record module usage', () => {
      optimizer.recordModuleUsage('module', 'user');
    });

    bench('analyze bundles', () => {
      optimizer.analyzeBundles({
        'main.js': 100000,
        'vendor.js': 200000,
      });
    });

    bench('get optimal chunk config', () => {
      optimizer.getOptimalChunkConfig();
    });

    bench('get bundle size recommendations', () => {
      optimizer.getBundleSizeRecommendations();
    });

    bench('should tree shake', () => {
      optimizer.shouldTreeShake('lodash-es');
    });
  });

  describe('Integrated workflow overhead', () => {
    const budgetManager = new ResourceBudgetManager();
    const profiler = new ProductionProfiler({ samplingRate: 1.0 });
    const cacheOptimizer = new CacheOptimizer({ autoWarming: false, enableAnalysis: false });

    bench('complete operation tracking', () => {
      // Check budget
      const canRun = budgetManager.checkBudget('memory', 1000);

      if (canRun) {
        // Profile operation
        const span = profiler.startSpan('operation');

        // Simulate cache access
        cacheOptimizer.recordAccess('memory', true, 1.5);

        // Record usage
        budgetManager.recordUsage('memory', 1000);

        // End profiling
        profiler.endSpan(span);
      }
    });

    bench('complete analysis cycle', () => {
      budgetManager.enforceBudget();
      profiler.getOptimizationSuggestions();
      cacheOptimizer.getRecommendations();
    });

    cacheOptimizer.destroy();
  });

  describe('Cache effectiveness gains', () => {
    bench('uncached operation simulation', () => {
      // Simulate slow operation
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    });

    // Simulate cached result
    const cachedResult = 499500;

    bench('cached operation simulation', () => {
      return cachedResult;
    });
  });

  describe('Memory leak detection overhead', () => {
    const detector = new MemoryLeakDetector({
      snapshotInterval: 10000, // Not auto-running in bench
      autoCleanup: false,
    });

    bench('full detection cycle', () => {
      detector.takeSnapshot();
      detector.calculateTrend();
      detector.detectLeaks();
    });

    detector.stop();
  });
});

describe('Performance impact measurements', () => {
  describe('baseline operation (no monitoring)', () => {
    bench('baseline: simple operation', () => {
      let sum = 0;
      for (let i = 0; i < 100; i++) {
        sum += i;
      }
      return sum;
    });
  });

  describe('with resource budget checking', () => {
    const manager = new ResourceBudgetManager();

    bench('with budget check', () => {
      if (manager.checkBudget('memory', 1000)) {
        let sum = 0;
        for (let i = 0; i < 100; i++) {
          sum += i;
        }
        manager.recordUsage('memory', 1000);
        return sum;
      }
    });
  });

  describe('with profiling', () => {
    const profiler = new ProductionProfiler({ samplingRate: 1.0 });

    bench('with profiling', () => {
      const span = profiler.startSpan('operation');
      let sum = 0;
      for (let i = 0; i < 100; i++) {
        sum += i;
      }
      profiler.endSpan(span);
      return sum;
    });
  });

  describe('with profiling (10% sampling)', () => {
    const profiler = new ProductionProfiler({ samplingRate: 0.1 });

    bench('with 10% sampling', () => {
      const span = profiler.startSpan('operation');
      let sum = 0;
      for (let i = 0; i < 100; i++) {
        sum += i;
      }
      profiler.endSpan(span);
      return sum;
    });
  });

  describe('with cache optimization', () => {
    const optimizer = new CacheOptimizer({ autoWarming: false, enableAnalysis: false });

    bench('with cache tracking', () => {
      optimizer.recordAccess('memory', true, 1.0);
      let sum = 0;
      for (let i = 0; i < 100; i++) {
        sum += i;
      }
      return sum;
    });

    optimizer.destroy();
  });

  describe('with full monitoring', () => {
    const budgetManager = new ResourceBudgetManager();
    const profiler = new ProductionProfiler({ samplingRate: 0.1 }); // Production sampling
    const cacheOptimizer = new CacheOptimizer({ autoWarming: false, enableAnalysis: false });

    bench('with all monitoring (production config)', () => {
      if (budgetManager.checkBudget('memory', 1000)) {
        const span = profiler.startSpan('operation');
        cacheOptimizer.recordAccess('memory', true, 1.0);

        let sum = 0;
        for (let i = 0; i < 100; i++) {
          sum += i;
        }

        budgetManager.recordUsage('memory', 1000);
        profiler.endSpan(span);

        return sum;
      }
    });

    cacheOptimizer.destroy();
  });
});

describe('Optimization effectiveness', () => {
  describe('lazy loading impact', () => {
    bench('eager loading simulation', () => {
      // Simulate loading large module
      const data = new Array(1000).fill(0).map((_, i) => i);
      return data.reduce((sum, n) => sum + n, 0);
    });

    bench('lazy loading simulation', () => {
      // Simulate loading only when needed
      // In real scenario, this would be deferred
      return 0; // Immediate return
    });
  });

  describe('bundle optimization impact', () => {
    const optimizer = new BundleOptimizer();

    bench('analyze large bundle set', () => {
      const bundles: Record<string, number> = {};
      for (let i = 0; i < 50; i++) {
        bundles[`chunk-${i}.js`] = Math.random() * 100000;
      }
      return optimizer.analyzeBundles(bundles);
    });
  });

  describe('cache warming impact', () => {
    const optimizer = new CacheOptimizer({ autoWarming: false, enableAnalysis: false });

    bench('cold cache scenario', () => {
      optimizer.recordAccess('memory', false, 50.0); // Miss
    });

    bench('warm cache scenario', () => {
      optimizer.recordAccess('memory', true, 1.0); // Hit
    });

    optimizer.destroy();
  });
});
