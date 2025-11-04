# Performance Optimization Guide

Comprehensive guide to ClippyJS performance optimization features for production deployments.

## Overview

The performance optimization system provides production-ready tools for resource management, memory leak detection, profiling, and bundle optimization. All components are designed with minimal overhead (<2%) for production use.

## Architecture

### Component Overview

```
Performance System
├── ResourceBudgetManager    - Budget enforcement & monitoring
├── MemoryLeakDetector      - Memory leak detection & analysis
├── ProductionProfiler      - Production-safe profiling
├── LazyLoader             - Dynamic component loading
├── BundleOptimizer        - Bundle size optimization
└── CacheOptimizer         - Multi-tier cache coordination
```

### Design Principles

1. **Production-Safe**: All components designed for production with minimal overhead
2. **Zero-Cost Abstractions**: Pay only for what you use
3. **Sampling-Based**: Use sampling to reduce profiling impact
4. **Automatic Optimization**: Self-tuning where possible
5. **Observable**: Rich metrics and recommendations

## Resource Budget Management

### Overview

ResourceBudgetManager enforces resource limits to prevent memory leaks, excessive network usage, and CPU throttling.

### Basic Usage

```typescript
import { ResourceBudgetManager } from '@clippy/ai/performance';

const budgetManager = new ResourceBudgetManager({
  memory: 25 * 1024 * 1024,  // 25MB
  storage: 10 * 1024 * 1024, // 10MB
  network: 100 * 1024,       // 100KB/s
  cpuTime: 500,              // 50% of one core
});

// Check before operation
if (budgetManager.checkBudget('memory', operation.size)) {
  await performOperation();
  budgetManager.recordUsage('memory', operation.size);
} else {
  console.warn('Operation would exceed budget');
}

// Periodic enforcement
setInterval(() => {
  budgetManager.enforceBudget();
}, 1000);
```

### Configuration

```typescript
interface ResourceBudgets {
  memory: number;   // bytes
  storage: number;  // bytes
  network: number;  // bytes/second
  cpuTime: number;  // ms/second
}

interface EnforcementConfig {
  action: 'log' | 'throttle' | 'reject' | 'cleanup';
  warningThreshold: number;    // 0-1
  criticalThreshold: number;   // 0-1
  autoCleanup: boolean;
  onViolation?: (violation) => void;
}
```

### Monitoring

```typescript
// Get current usage
const usage = budgetManager.getUsage();
console.log(`Memory: ${usage.memory} bytes`);

// Get usage percentage
const memoryPercent = budgetManager.getUsagePercentage('memory');
console.log(`Memory usage: ${memoryPercent * 100}%`);

// Get health summary
const health = budgetManager.getHealthSummary();
if (!health.healthy) {
  console.error('Critical violations:', health.critical);
}
```

### Enforcement Actions

1. **log**: Log violations without taking action
2. **throttle**: Throttle high-resource operations
3. **cleanup**: Trigger automatic cleanup
4. **reject**: Reject new operations during violations

### Best Practices

- Set budgets based on target deployment environment
- Use warning thresholds to catch issues early
- Enable automatic cleanup for self-healing
- Monitor health summary regularly
- Adjust budgets based on actual usage patterns

## Memory Leak Detection

### Overview

MemoryLeakDetector monitors memory usage patterns to detect potential leaks before they cause failures.

### Basic Usage

```typescript
import { MemoryLeakDetector } from '@clippy/ai/performance';

const detector = new MemoryLeakDetector({
  snapshotInterval: 10000,
  onLeakDetected: (leak) => {
    console.error('Memory leak detected:', leak);
    if (leak.severity === 'critical') {
      triggerCleanup();
    }
  },
});

detector.start();

// Register cleanup callbacks
detector.registerCleanup(() => {
  // Clear caches
  cache.clear();
});

// Check for leaks
const leaks = detector.detectLeaks();
if (leaks.length > 0) {
  console.warn('Active memory leaks:', leaks);
}
```

### Leak Patterns

1. **steady-growth**: Consistent linear memory growth
2. **exponential-growth**: Accelerating memory growth
3. **sawtooth**: Repeated allocation without cleanup
4. **step-growth**: Sudden memory jumps
5. **no-cleanup**: Memory never released

### Leak Severity

- **low**: Growth rate manageable, monitor
- **medium**: Increasing growth rate, investigate
- **high**: Significant leak, take action soon
- **critical**: Imminent failure, immediate action required

### Memory Trends

```typescript
const trend = detector.calculateTrend();
console.log(`Growth rate: ${trend.growthRate} bytes/s`);
console.log(`Direction: ${trend.direction}`);
console.log(`Confidence: ${trend.confidence * 100}%`);
```

### Cleanup Triggers

```typescript
// Manual cleanup
await detector.triggerCleanup();

// Automatic cleanup on critical leaks
const detector = new MemoryLeakDetector({
  autoCleanup: true,
  memoryCeiling: 25 * 1024 * 1024,
});
```

### Best Practices

- Start monitoring early in application lifecycle
- Register cleanup callbacks for all major caches
- Set appropriate memory ceiling for environment
- Monitor trends to catch slow leaks
- Use automatic cleanup for production deployments

## Production Profiling

### Overview

ProductionProfiler provides production-safe profiling with sampling, flame graphs, and optimization suggestions.

### Basic Usage

```typescript
import { ProductionProfiler } from '@clippy/ai/performance';

const profiler = new ProductionProfiler({
  samplingRate: 0.1, // 10% sampling for production
  onRegression: (regression) => {
    console.warn('Performance regression:', regression);
  },
});

// Profile an operation
const span = profiler.startSpan('api-call');
try {
  await performOperation();
} finally {
  profiler.endSpan(span);
}

// Nested spans
const parentSpan = profiler.startSpan('complex-operation');
const childSpan = profiler.startChildSpan('sub-operation', parentSpan);
await performSubOperation();
profiler.endSpan(childSpan);
profiler.endSpan(parentSpan);
```

### Configuration

```typescript
interface ProductionProfilerConfig {
  enabled: boolean;
  samplingRate: number;          // 0-1
  maxSpans: number;
  enableFlameGraph: boolean;
  regressionThreshold: number;   // % slower
  onRegression?: (regression) => void;
}
```

### Optimization Suggestions

```typescript
const suggestions = profiler.getOptimizationSuggestions();

for (const suggestion of suggestions) {
  console.log(`Type: ${suggestion.type}`);
  console.log(`Target: ${suggestion.target}`);
  console.log(`Impact: ${suggestion.impact}`);
  console.log(`Recommendation: ${suggestion.recommendation}`);
}
```

### Suggestion Types

1. **caching**: Cache repeated expensive operations
2. **batching**: Batch multiple operations together
3. **lazy-loading**: Defer loading until needed
4. **memoization**: Memoize pure function results
5. **parallel**: Execute operations in parallel

### Performance Summary

```typescript
const summary = profiler.getSummary();
console.log(`Total spans: ${summary.totalSpans}`);
console.log(`Average duration: ${summary.avgDuration}ms`);
console.log(`Regressions: ${summary.regressionCount}`);

// Slowest operations
summary.slowestOperations.forEach(op => {
  console.log(`${op.name}: ${op.duration}ms`);
});
```

### Regression Detection

```typescript
// Automatic detection
const regressions = profiler.getRegressions();

for (const regression of regressions) {
  console.log(`Operation: ${regression.operation}`);
  console.log(`Baseline: ${regression.baseline}ms`);
  console.log(`Current: ${regression.current}ms`);
  console.log(`Regression: ${regression.regression * 100}%`);
  console.log(`Severity: ${regression.severity}`);
}
```

### Best Practices

- Use 10% sampling in production for minimal overhead
- Enable flame graphs only for debugging sessions
- Set regression threshold to 20% for actionable alerts
- Monitor optimization suggestions regularly
- Use metadata for context in distributed tracing

## Lazy Loading

### Overview

LazyLoader provides utilities for dynamic component loading with preloading strategies.

### Basic Usage

```typescript
import { lazyLoader } from '@clippy/ai/performance';

// Basic lazy loading
const Component = lazyLoader.load(() => import('./Component'));

// With preloading
const Component = lazyLoader.load(
  () => import('./Component'),
  { preloadDelay: 2000 }
);

// Preload on hover
lazyLoader.preloadOn('hover', 'MyComponent', () => import('./Component'));

// Preload when visible
const cleanup = lazyLoader.preloadWhenVisible(
  element,
  'MyComponent',
  () => import('./Component')
);
```

### Preload Strategies

1. **idle**: Load when browser is idle
2. **visible**: Load when component is visible
3. **interaction**: Load on user interaction
4. **delay**: Load after delay
5. **eager**: Load immediately

### Configuration

```typescript
interface LazyLoadOptions {
  preloadDelay?: number;    // ms
  retryCount?: number;
  retryDelay?: number;      // ms
  timeout?: number;         // ms
  onError?: (error) => void;
  onLoad?: () => void;
}
```

### Loading State

```typescript
const state = lazyLoader.getLoadingState('MyComponent');
console.log(`Loaded: ${state?.loaded}`);
console.log(`Loading: ${state?.loading}`);
console.log(`Error: ${state?.error}`);
```

### Preloading

```typescript
// Preload manually
await lazyLoader.preload('MyComponent', () => import('./Component'));

// Check if preloaded
if (lazyLoader.isPreloaded('MyComponent')) {
  console.log('Component already loaded');
}

// Get all preloaded chunks
const chunks = lazyLoader.getPreloadedChunks();
console.log('Preloaded:', chunks);
```

### Best Practices

- Use lazy loading for large components
- Preload critical paths on interaction
- Set appropriate retry counts for reliability
- Monitor loading states for UX
- Clear cache when memory constrained

## Bundle Optimization

### Overview

BundleOptimizer analyzes bundles and provides optimization recommendations for minimal size.

### Basic Usage

```typescript
import { bundleOptimizer } from '@clippy/ai/performance';

// Record bundle sizes
bundleOptimizer.recordBundleSize('main.js', 100000);
bundleOptimizer.recordBundleSize('vendor.js', 200000);

// Analyze bundles
const analysis = bundleOptimizer.analyzeBundles({
  'main.js': 100000,
  'vendor.js': 200000,
});

console.log(`Total size: ${analysis.totalSize} bytes`);
console.log(`Gzipped: ${analysis.gzippedSize} bytes`);
console.log(`Chunks: ${analysis.chunkCount}`);

// Get recommendations
const { status, recommendations } = bundleOptimizer.getBundleSizeRecommendations();
console.log(`Status: ${status}`);
recommendations.forEach(rec => console.log(rec));
```

### Chunk Configuration

```typescript
const chunkConfigs = bundleOptimizer.getOptimalChunkConfig();

// Use with webpack
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: chunkConfigs[0],
        common: chunkConfigs[1],
      },
    },
  },
};
```

### Tree-Shaking

```typescript
// Check if module should be tree-shaken
if (bundleOptimizer.shouldTreeShake('lodash')) {
  // Use tree-shakeable import
  import { map } from 'lodash-es';
} else {
  // Use full import
  import _ from 'lodash';
}

// Get tree-shaking config
const config = bundleOptimizer.getTreeShakingConfig();
```

### Module Usage

```typescript
// Record module usage
bundleOptimizer.recordModuleUsage('react', 'App');
bundleOptimizer.recordModuleUsage('react', 'Dashboard');

// Get usage stats
const stats = bundleOptimizer.getModuleUsageStats();
console.log('Most used modules:', stats.slice(0, 10));

// Find unused modules
const unused = bundleOptimizer.getUnusedModules();
console.log('Unused modules:', unused);
```

### Best Practices

- Keep total bundle size under 250KB
- Limit individual chunks to 200KB
- Use 3-10 chunks for optimal caching
- Enable tree-shaking for all libraries
- Monitor and remove unused modules regularly
- Use code splitting for routes

## Cache Optimization

### Overview

CacheOptimizer coordinates multiple cache tiers with intelligent warming and eviction policies.

### Basic Usage

```typescript
import { cacheOptimizer } from '@clippy/ai/performance';

// Record cache access
cacheOptimizer.recordAccess('memory', true, 1.5); // hit
cacheOptimizer.recordAccess('memory', false, 10.0); // miss

// Get performance metrics
const metrics = cacheOptimizer.getMetrics();
console.log(`Overall hit rate: ${metrics.overallHitRate * 100}%`);
console.log(`Memory hits: ${metrics.hitRates.memory * 100}%`);
```

### Cache Tiers

```typescript
const optimizer = new CacheOptimizer({
  tiers: [
    {
      name: 'memory',
      priority: 3,
      maxSize: 10 * 1024 * 1024,
      ttl: 60000,
      evictionPolicy: 'lru',
    },
    {
      name: 'persistent',
      priority: 1,
      maxSize: 50 * 1024 * 1024,
      ttl: 3600000,
      evictionPolicy: 'lfu',
    },
  ],
});
```

### Cache Warming

```typescript
// Register warming strategy
optimizer.registerWarmingStrategy({
  name: 'common-queries',
  keys: ['user:1', 'user:2', 'settings'],
  fetch: async (key) => {
    return await database.get(key);
  },
  priority: 10,
});

// Execute warming
await optimizer.warmCache();
```

### Optimization Recommendations

```typescript
const recommendations = optimizer.getRecommendations();

for (const rec of recommendations) {
  console.log(`Type: ${rec.type}`);
  console.log(`Tier: ${rec.tier}`);
  console.log(`Issue: ${rec.description}`);
  console.log(`Impact: ${rec.expectedImprovement}`);
}
```

### Eviction Policy Optimization

```typescript
// Get optimal policy for tier
const policy = optimizer.optimizeEvictionPolicy('memory');
console.log(`Recommended policy: ${policy}`);

// Update tier configuration
tierConfig.evictionPolicy = policy;
```

### Best Practices

- Use 3-tier cache hierarchy (memory, session, persistent)
- Set memory tier to 10MB with 1-minute TTL
- Use LRU for memory tier, LFU for persistent
- Enable automatic warming for critical paths
- Target 80%+ hit rate for hot data
- Monitor and tune eviction policies

## Integration Patterns

### Full Stack Integration

```typescript
import {
  ResourceBudgetManager,
  MemoryLeakDetector,
  ProductionProfiler,
  CacheOptimizer,
} from '@clippy/ai/performance';

// Initialize all components
const budgetManager = new ResourceBudgetManager();
const leakDetector = new MemoryLeakDetector({ autoCleanup: true });
const profiler = new ProductionProfiler({ samplingRate: 0.1 });
const cacheOptimizer = new CacheOptimizer();

// Start monitoring
leakDetector.start();

// Integrated operation
async function performOperation(data: any) {
  // Check budget
  if (!budgetManager.checkBudget('memory', data.size)) {
    throw new Error('Budget exceeded');
  }

  // Profile operation
  const span = profiler.startSpan('operation');

  try {
    // Check cache
    const cached = await cache.get(data.key);
    if (cached) {
      cacheOptimizer.recordAccess('memory', true, 1.0);
      return cached;
    }

    // Execute operation
    cacheOptimizer.recordAccess('memory', false, 10.0);
    const result = await heavyOperation(data);

    // Record usage
    budgetManager.recordUsage('memory', result.size);

    // Cache result
    await cache.set(data.key, result);

    return result;
  } finally {
    profiler.endSpan(span);
  }
}
```

### Monitoring Dashboard

```typescript
async function getPerformanceDashboard() {
  return {
    budget: budgetManager.getHealthSummary(),
    memory: {
      leaks: leakDetector.getActiveLeaks(),
      trend: leakDetector.calculateTrend(),
    },
    profiling: {
      summary: profiler.getSummary(),
      regressions: profiler.getRegressions(),
      suggestions: profiler.getOptimizationSuggestions(),
    },
    cache: {
      metrics: cacheOptimizer.getMetrics(),
      recommendations: cacheOptimizer.getRecommendations(),
    },
  };
}
```

## Performance Targets

### Production Goals

- **Memory ceiling**: <25MB heap usage
- **Bundle size**: <250KB total, <200KB per chunk
- **Profiling overhead**: <2% impact
- **Memory leak detection**: <100ms per check
- **Resource budget check**: <1ms per operation
- **Cache hit rate**: >80% for hot data
- **API latency**: p95 <500ms

### Monitoring

```typescript
// Periodic health check
setInterval(() => {
  const health = budgetManager.getHealthSummary();
  const leaks = leakDetector.getActiveLeaks();
  const metrics = cacheOptimizer.getMetrics();

  if (!health.healthy || leaks.length > 0 || metrics.overallHitRate < 0.8) {
    console.warn('Performance degradation detected');
    triggerAlert();
  }
}, 60000);
```

## Troubleshooting

### High Memory Usage

1. Check for memory leaks: `detector.detectLeaks()`
2. Review budget violations: `budgetManager.getViolations()`
3. Check cache sizes: `cacheOptimizer.getMetrics()`
4. Trigger cleanup: `detector.triggerCleanup()`

### Low Cache Hit Rate

1. Get recommendations: `cacheOptimizer.getRecommendations()`
2. Review warming strategies
3. Optimize eviction policy
4. Increase cache size if budget allows

### Performance Regressions

1. Check regressions: `profiler.getRegressions()`
2. Get optimization suggestions: `profiler.getOptimizationSuggestions()`
3. Review slowest operations: `profiler.getSummary()`
4. Enable flame graphs for debugging

### Bundle Size Issues

1. Analyze bundles: `bundleOptimizer.analyzeBundles()`
2. Get recommendations: `bundleOptimizer.getBundleSizeRecommendations()`
3. Find unused modules: `bundleOptimizer.getUnusedModules()`
4. Apply code splitting and tree-shaking

## Migration Guide

### From Sprint 4 to Sprint 5

```typescript
// Before (Sprint 4)
const monitor = new PerformanceMonitor();

// After (Sprint 5) - Enhanced with profiler
const profiler = new ProductionProfiler();
const monitor = profiler.getMetrics(); // Access base monitor

// Add resource budgets
const budgetManager = new ResourceBudgetManager();

// Add memory leak detection
const leakDetector = new MemoryLeakDetector({ autoCleanup: true });
leakDetector.start();
```

## API Reference

See individual component documentation:
- [ResourceBudget API](./api/ResourceBudget.md)
- [MemoryLeakDetector API](./api/MemoryLeakDetector.md)
- [ProductionProfiler API](./api/ProductionProfiler.md)
- [LazyLoader API](./api/LazyLoader.md)
- [BundleOptimizer API](./api/BundleOptimizer.md)
- [CacheOptimizer API](./api/CacheOptimizer.md)

## Examples

See [examples directory](../examples/performance/) for complete examples:
- Production deployment configuration
- Memory leak detection and recovery
- Bundle optimization workflow
- Cache warming strategies
- Performance monitoring dashboard

## Support

For issues and questions:
- GitHub Issues: [clippy-js/clippyjs/issues](https://github.com/clippy-js/clippyjs/issues)
- Documentation: [docs.clippyjs.com](https://docs.clippyjs.com)
