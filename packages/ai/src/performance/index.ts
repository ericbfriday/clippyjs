/**
 * Performance optimization exports
 *
 * Production-ready performance optimization tools including resource
 * budgeting, memory leak detection, profiling, and bundle optimization.
 */

// Resource budget management
export {
  ResourceBudgetManager,
  DEFAULT_BUDGETS,
  DEFAULT_ENFORCEMENT,
  type ResourceBudgets,
  type ResourceUsage,
  type BudgetViolation,
  type EnforcementAction,
  type EnforcementConfig,
} from './ResourceBudget';

// Memory leak detection
export {
  MemoryLeakDetector,
  DEFAULT_LEAK_DETECTOR_CONFIG,
  type MemorySnapshot,
  type MemoryTrend,
  type MemoryLeak,
  type LeakPattern,
  type LeakDetectorConfig,
} from './MemoryLeakDetector';

// Production profiling
export {
  ProductionProfiler,
  DEFAULT_PROFILER_CONFIG,
  type ProfilingSpan,
  type FlameGraphNode,
  type PerformanceRegression,
  type OptimizationSuggestion,
  type ProductionProfilerConfig,
} from './ProductionProfiler';

// Lazy loading
export {
  LazyLoader,
  lazyLoader,
  prefetchChunk,
  preloadChunk,
  supportsModulePreload,
  DEFAULT_LAZY_OPTIONS,
  type LazyLoadOptions,
  type PreloadStrategy,
  type LoadingState,
} from './LazyLoader';

// Bundle optimization
export {
  BundleOptimizer,
  bundleOptimizer,
  getWebpackOptimization,
  estimateGzippedSize,
  formatBundleSize,
  type BundleAnalysis,
  type OptimizationOpportunity,
  type ChunkConfig,
  type TreeShakingConfig,
} from './BundleOptimizer';

// Cache optimization
export {
  CacheOptimizer,
  cacheOptimizer,
  calculateOptimalCacheSize,
  calculateCacheEfficiency,
  DEFAULT_CACHE_OPTIMIZER_CONFIG,
  type CacheTier,
  type CachePerformanceMetrics,
  type WarmingStrategy,
  type EvictionCandidate,
  type CacheOptimizationRecommendation,
  type CacheOptimizerConfig,
} from './CacheOptimizer';
