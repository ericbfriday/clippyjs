/**
 * Production-safe performance profiler
 *
 * Extends Sprint 4's performance monitoring with production-safe profiling,
 * flame graph data collection, and automated optimization suggestions.
 */

import { PerformanceMonitor, PerformanceMetrics } from '../cache/PerformanceMonitor';

/**
 * Profiling span for tracing execution
 */
export interface ProfilingSpan {
  /** Span name */
  name: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime?: number;
  /** Span duration in ms */
  duration?: number;
  /** Parent span ID */
  parentId?: string;
  /** Span ID */
  spanId: string;
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Flame graph node
 */
export interface FlameGraphNode {
  /** Function name */
  name: string;
  /** Self time in ms */
  selfTime: number;
  /** Total time including children in ms */
  totalTime: number;
  /** Call count */
  count: number;
  /** Child nodes */
  children: FlameGraphNode[];
  /** Percentage of total time */
  percentage: number;
}

/**
 * Performance regression
 */
export interface PerformanceRegression {
  /** Operation name */
  operation: string;
  /** Baseline duration in ms */
  baseline: number;
  /** Current duration in ms */
  current: number;
  /** Regression percentage */
  regression: number;
  /** Timestamp */
  timestamp: number;
  /** Severity */
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  /** Operation or component */
  target: string;
  /** Suggestion type */
  type: 'caching' | 'batching' | 'lazy-loading' | 'memoization' | 'parallel' | 'other';
  /** Issue description */
  issue: string;
  /** Recommendation */
  recommendation: string;
  /** Expected impact (low, medium, high) */
  impact: 'low' | 'medium' | 'high';
  /** Confidence level (0-1) */
  confidence: number;
  /** Supporting metrics */
  metrics?: Record<string, number>;
}

/**
 * Profiler configuration
 */
export interface ProductionProfilerConfig {
  /** Enable profiling */
  enabled?: boolean;
  /** Sampling rate (0-1) */
  samplingRate?: number;
  /** Maximum spans to keep */
  maxSpans?: number;
  /** Enable flame graph collection */
  enableFlameGraph?: boolean;
  /** Regression detection threshold */
  regressionThreshold?: number;
  /** Performance monitor config */
  monitorConfig?: any;
  /** Callback for regressions */
  onRegression?: (regression: PerformanceRegression) => void;
}

/**
 * Default profiler configuration
 */
export const DEFAULT_PROFILER_CONFIG: Required<ProductionProfilerConfig> = {
  enabled: true,
  samplingRate: 0.1, // 10% sampling for production
  maxSpans: 1000,
  enableFlameGraph: false, // CPU intensive
  regressionThreshold: 0.2, // 20% slower
  monitorConfig: {},
  onRegression: () => {},
};

/**
 * Production profiler
 *
 * Production-safe performance profiling with minimal overhead,
 * flame graph collection, and automated optimization suggestions.
 *
 * Features:
 * - Sampling-based profiling (low overhead)
 * - Distributed tracing support
 * - Flame graph data collection
 * - Performance regression detection
 * - Automated optimization suggestions
 * - Integration with Sprint 4's PerformanceMonitor
 *
 * Usage:
 * ```ts
 * const profiler = new ProductionProfiler({
 *   samplingRate: 0.1, // 10% sampling
 *   onRegression: (regression) => {
 *     console.warn('Performance regression:', regression);
 *   },
 * });
 *
 * // Profile an operation
 * const span = profiler.startSpan('api-call');
 * await performOperation();
 * profiler.endSpan(span);
 *
 * // Get optimization suggestions
 * const suggestions = profiler.getOptimizationSuggestions();
 * console.log('Optimizations:', suggestions);
 * ```
 */
export class ProductionProfiler {
  private config: Required<ProductionProfilerConfig>;
  private monitor: PerformanceMonitor;
  private spans: Map<string, ProfilingSpan> = new Map();
  private completedSpans: ProfilingSpan[] = [];
  private baselines: Map<string, number[]> = new Map();
  private regressions: PerformanceRegression[] = [];
  private flameGraph?: FlameGraphNode;

  constructor(config: ProductionProfilerConfig = {}) {
    this.config = { ...DEFAULT_PROFILER_CONFIG, ...config };
    this.monitor = new PerformanceMonitor(this.config.monitorConfig);
  }

  /**
   * Start a profiling span
   */
  startSpan(name: string, metadata?: Record<string, any>): ProfilingSpan {
    // Apply sampling
    if (!this.shouldSample()) {
      return this.createNoOpSpan(name);
    }

    const span: ProfilingSpan = {
      name,
      startTime: performance.now(),
      spanId: this.generateSpanId(),
      metadata,
    };

    this.spans.set(span.spanId, span);
    return span;
  }

  /**
   * Start a child span
   */
  startChildSpan(
    name: string,
    parentSpan: ProfilingSpan,
    metadata?: Record<string, any>
  ): ProfilingSpan {
    if (!this.config.enabled || parentSpan.spanId === 'noop') {
      return this.createNoOpSpan(name);
    }

    const span: ProfilingSpan = {
      name,
      startTime: performance.now(),
      spanId: this.generateSpanId(),
      parentId: parentSpan.spanId,
      metadata,
    };

    this.spans.set(span.spanId, span);
    return span;
  }

  /**
   * End a profiling span
   */
  endSpan(span: ProfilingSpan): void {
    if (span.spanId === 'noop') return;

    const activeSpan = this.spans.get(span.spanId);
    if (!activeSpan) return;

    activeSpan.endTime = performance.now();
    activeSpan.duration = activeSpan.endTime - activeSpan.startTime;

    // Move to completed spans
    this.completedSpans.push(activeSpan);
    this.spans.delete(span.spanId);

    // Limit history
    if (this.completedSpans.length > this.config.maxSpans) {
      this.completedSpans.shift();
    }

    // Check for regression
    this.checkForRegression(activeSpan);

    // Update flame graph
    if (this.config.enableFlameGraph) {
      this.updateFlameGraph(activeSpan);
    }
  }

  /**
   * Record performance metrics from base monitor
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    // Store baselines for regression detection
    const key = 'overall-performance';
    const baseline = this.baselines.get(key) || [];
    baseline.push(metrics.api.avgLatency);

    // Keep last 100 measurements
    if (baseline.length > 100) {
      baseline.shift();
    }

    this.baselines.set(key, baseline);
  }

  /**
   * Get performance metrics from base monitor
   */
  getMetrics(): PerformanceMetrics {
    return this.monitor.getMetrics();
  }

  /**
   * Get completed spans
   */
  getSpans(filter?: { name?: string; minDuration?: number }): ProfilingSpan[] {
    let spans = [...this.completedSpans];

    if (filter?.name) {
      spans = spans.filter(s => s.name === filter.name);
    }

    if (filter?.minDuration) {
      spans = spans.filter(s => (s.duration || 0) >= filter.minDuration!);
    }

    return spans;
  }

  /**
   * Get flame graph data
   */
  getFlameGraph(): FlameGraphNode | undefined {
    return this.flameGraph;
  }

  /**
   * Get detected regressions
   */
  getRegressions(since?: number): PerformanceRegression[] {
    if (since) {
      return this.regressions.filter(r => r.timestamp >= since);
    }
    return [...this.regressions];
  }

  /**
   * Clear regression history
   */
  clearRegressions(): void {
    this.regressions = [];
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze spans for optimization opportunities
    suggestions.push(...this.analyzeCachingOpportunities());
    suggestions.push(...this.analyzeBatchingOpportunities());
    suggestions.push(...this.analyzeLazyLoadingOpportunities());
    suggestions.push(...this.analyzeParallelizationOpportunities());

    // Sort by impact and confidence
    suggestions.sort((a, b) => {
      const scoreA = this.getOptimizationScore(a);
      const scoreB = this.getOptimizationScore(b);
      return scoreB - scoreA;
    });

    return suggestions;
  }

  /**
   * Get profiling summary
   */
  getSummary(): {
    totalSpans: number;
    avgDuration: number;
    slowestOperations: Array<{ name: string; duration: number }>;
    regressionCount: number;
    suggestions: number;
  } {
    const durations = this.completedSpans
      .filter(s => s.duration !== undefined)
      .map(s => s.duration!);

    const avgDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    // Group by operation
    const operationDurations = new Map<string, number[]>();
    for (const span of this.completedSpans) {
      if (span.duration === undefined) continue;
      const durations = operationDurations.get(span.name) || [];
      durations.push(span.duration);
      operationDurations.set(span.name, durations);
    }

    // Calculate average per operation
    const slowestOperations = Array.from(operationDurations.entries())
      .map(([name, durations]) => ({
        name,
        duration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalSpans: this.completedSpans.length,
      avgDuration: Math.round(avgDuration * 100) / 100,
      slowestOperations,
      regressionCount: this.regressions.length,
      suggestions: this.getOptimizationSuggestions().length,
    };
  }

  /**
   * Reset profiler state
   */
  reset(): void {
    this.spans.clear();
    this.completedSpans = [];
    this.baselines.clear();
    this.regressions = [];
    this.flameGraph = undefined;
    this.monitor.reset();
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if should sample this request
   */
  private shouldSample(): boolean {
    return this.config.enabled && Math.random() < this.config.samplingRate;
  }

  /**
   * Create a no-op span for unsampled requests
   */
  private createNoOpSpan(name: string): ProfilingSpan {
    return {
      name,
      startTime: 0,
      spanId: 'noop',
    };
  }

  /**
   * Generate unique span ID
   */
  private generateSpanId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check for performance regression
   */
  private checkForRegression(span: ProfilingSpan): void {
    if (span.duration === undefined) return;

    const baseline = this.baselines.get(span.name) || [];
    baseline.push(span.duration);

    // Keep last 100 measurements
    if (baseline.length > 100) {
      baseline.shift();
    }

    this.baselines.set(span.name, baseline);

    // Need at least 10 measurements for baseline
    if (baseline.length < 10) return;

    // Calculate baseline average
    const avgBaseline = baseline.slice(0, -1).reduce((sum, d) => sum + d, 0) / (baseline.length - 1);

    // Check if current is significantly slower
    const regression = (span.duration - avgBaseline) / avgBaseline;

    if (regression > this.config.regressionThreshold) {
      const regressionEvent: PerformanceRegression = {
        operation: span.name,
        baseline: avgBaseline,
        current: span.duration,
        regression,
        timestamp: Date.now(),
        severity: this.classifyRegression(regression),
      };

      this.regressions.push(regressionEvent);

      // Keep last 50 regressions
      if (this.regressions.length > 50) {
        this.regressions.shift();
      }

      this.config.onRegression(regressionEvent);
    }
  }

  /**
   * Classify regression severity
   */
  private classifyRegression(regression: number): 'minor' | 'moderate' | 'major' | 'critical' {
    if (regression > 2.0) return 'critical'; // >200% slower
    if (regression > 1.0) return 'major';    // >100% slower
    if (regression > 0.5) return 'moderate'; // >50% slower
    return 'minor';
  }

  /**
   * Update flame graph with span data
   */
  private updateFlameGraph(span: ProfilingSpan): void {
    // Simplified flame graph implementation
    // In production, use a proper flame graph library
    if (!this.flameGraph) {
      this.flameGraph = {
        name: 'root',
        selfTime: 0,
        totalTime: 0,
        count: 0,
        children: [],
        percentage: 100,
      };
    }

    // Find or create node
    let node = this.flameGraph.children.find(n => n.name === span.name);
    if (!node) {
      node = {
        name: span.name,
        selfTime: 0,
        totalTime: 0,
        count: 0,
        children: [],
        percentage: 0,
      };
      this.flameGraph.children.push(node);
    }

    // Update node
    node.count++;
    node.totalTime += span.duration || 0;
    node.selfTime = node.totalTime; // Simplified

    // Recalculate percentages
    const totalTime = this.flameGraph.children.reduce((sum, n) => sum + n.totalTime, 0);
    for (const child of this.flameGraph.children) {
      child.percentage = totalTime > 0 ? (child.totalTime / totalTime) * 100 : 0;
    }
  }

  /**
   * Analyze caching opportunities
   */
  private analyzeCachingOpportunities(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Find repeated slow operations
    const operationCounts = new Map<string, { count: number; avgDuration: number }>();

    for (const span of this.completedSpans) {
      if (span.duration === undefined || span.duration < 100) continue;

      const stats = operationCounts.get(span.name) || { count: 0, avgDuration: 0 };
      stats.count++;
      stats.avgDuration = (stats.avgDuration * (stats.count - 1) + span.duration) / stats.count;
      operationCounts.set(span.name, stats);
    }

    for (const [name, stats] of operationCounts.entries()) {
      if (stats.count >= 5 && stats.avgDuration > 100) {
        suggestions.push({
          target: name,
          type: 'caching',
          issue: `Operation called ${stats.count} times with avg duration ${Math.round(stats.avgDuration)}ms`,
          recommendation: 'Consider caching results for repeated operations',
          impact: stats.avgDuration > 500 ? 'high' : 'medium',
          confidence: Math.min(0.9, stats.count / 20),
          metrics: { callCount: stats.count, avgDuration: stats.avgDuration },
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze batching opportunities
   */
  private analyzeBatchingOpportunities(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Look for rapid sequential operations
    for (let i = 0; i < this.completedSpans.length - 5; i++) {
      const window = this.completedSpans.slice(i, i + 5);
      const sameName = window.every(s => s.name === window[0].name);

      if (sameName) {
        const timeSpan = (window[4].startTime - window[0].startTime);
        if (timeSpan < 1000) { // Within 1 second
          suggestions.push({
            target: window[0].name,
            type: 'batching',
            issue: `5 operations executed within ${Math.round(timeSpan)}ms`,
            recommendation: 'Consider batching multiple operations into single request',
            impact: 'medium',
            confidence: 0.7,
          });
          break; // One suggestion per operation type
        }
      }
    }

    return suggestions;
  }

  /**
   * Analyze lazy loading opportunities
   */
  private analyzeLazyLoadingOpportunities(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Look for expensive initialization operations
    const initSpans = this.completedSpans.filter(
      s => s.name.includes('init') || s.name.includes('load')
    );

    for (const span of initSpans) {
      if (span.duration && span.duration > 500) {
        suggestions.push({
          target: span.name,
          type: 'lazy-loading',
          issue: `Initialization takes ${Math.round(span.duration)}ms`,
          recommendation: 'Consider lazy loading to improve initial load time',
          impact: span.duration > 1000 ? 'high' : 'medium',
          confidence: 0.8,
          metrics: { duration: span.duration },
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze parallelization opportunities
   */
  private analyzeParallelizationOpportunities(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Look for sequential operations that could be parallel
    for (let i = 0; i < this.completedSpans.length - 2; i++) {
      const span1 = this.completedSpans[i];
      const span2 = this.completedSpans[i + 1];

      // Check if operations are sequential and independent
      if (
        span1.duration &&
        span2.duration &&
        span2.startTime > (span1.endTime || 0) &&
        span1.name !== span2.name &&
        !span2.parentId // Not parent-child relationship
      ) {
        const totalTime = span1.duration + span2.duration;
        if (totalTime > 200) {
          suggestions.push({
            target: `${span1.name} + ${span2.name}`,
            type: 'parallel',
            issue: `Sequential operations take ${Math.round(totalTime)}ms`,
            recommendation: 'Consider executing operations in parallel',
            impact: totalTime > 500 ? 'high' : 'medium',
            confidence: 0.6,
            metrics: { totalTime },
          });
          break;
        }
      }
    }

    return suggestions;
  }

  /**
   * Calculate optimization score
   */
  private getOptimizationScore(suggestion: OptimizationSuggestion): number {
    const impactScore = { low: 1, medium: 2, high: 3 }[suggestion.impact];
    return impactScore * suggestion.confidence;
  }
}
